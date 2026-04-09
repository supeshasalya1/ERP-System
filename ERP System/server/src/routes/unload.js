// server/src/routes/unload.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const authenticateToken = require("./authMiddleware");
const { getLocalTimestamp } = require("../utils/datetime");

const toInt = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// Resolve issue by "issue_ref" which can be issue_no or numeric issue_id
async function resolveIssueByRef(connection, rawIssue) {
  const ref = (rawIssue || "").toString().trim();
  if (!ref) return null;

  // 1) Try exact match on issue_no
  const [rowsByNo] = await connection.query(
    "SELECT issue_id, issue_no, lorry_id FROM issue_note WHERE issue_no = ?",
    [ref]
  );
  if (rowsByNo.length) return rowsByNo[0];

  // 2) If ref is numeric, try issue_id
  if (/^\d+$/.test(ref)) {
    const [rowsById] = await connection.query(
      "SELECT issue_id, issue_no, lorry_id FROM issue_note WHERE issue_id = ?",
      [Number(ref)]
    );
    if (rowsById.length) return rowsById[0];
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  CREATE UNLOAD NOTE                                                */
/* ------------------------------------------------------------------ */
/**
 * POST /api/unload
 * Body:
 * {
 *   "unload_no": "UL-0001",
 *   "issue_ref": "IN-0005" or "5",
 *   "lorry_id": 1,          // optional, will be checked against issue
 *   "remarks": "Shop got only 45 packs",
 *   "items": [
 *     { "product_id": 1, "quantity": 5, "pack_size": 20, "issue_item_id": 1 },
 *     ...
 *   ]
 * }
 */

/* ------------------------------------------------------------------ */
/*  ISSUE HEADER INFO FOR UNLOAD (by issue_ref)                       */
/* ------------------------------------------------------------------ */
// GET /api/unload/issue-info?issue_ref=IN-0001
router.get("/issue-info", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const rawIssue = (req.query.issue_ref || "").toString().trim();
    if (!rawIssue) {
      return res.status(400).json({ error: "issue_ref query param is required" });
    }

    const issueRow = await resolveIssueByRef(connection, rawIssue);
    if (!issueRow) {
      return res.status(404).json({ error: "Issue note not found" });
    }

    const issueId = issueRow.issue_id;

    // Header: lorry, authenticator, supplier (via products), reps
    const [[hdr]] = await connection.query(
      `
      SELECT
        i.issue_id,
        i.issue_no,
        i.lorry_id,
        il.lorry_no,
        i.authenticator,
        MIN(p.supplier_id)       AS supplier_id,
        MIN(s.name)              AS supplier_name
      FROM issue_note i
      LEFT JOIN issue_lorries il ON il.lorry_id = i.lorry_id
      LEFT JOIN issue_items ii   ON ii.issue_id = i.issue_id
      LEFT JOIN products p       ON p.product_id = ii.product_id
      LEFT JOIN suppliers s      ON s.supplier_id = p.supplier_id
      WHERE i.issue_id = ?
      GROUP BY i.issue_id, i.issue_no, i.lorry_id, il.lorry_no, i.authenticator
      `,
      [issueId]
    );

    if (!hdr) {
      return res.status(404).json({ error: "Issue note not found" });
    }

    const [repRows] = await connection.query(
      `
      SELECT r.rep_id, r.full_name
      FROM issue_rep ir
      JOIN representatives r ON r.rep_id = ir.rep_id
      WHERE ir.issue_id = ?
      ORDER BY r.full_name ASC
      `,
      [issueId]
    );

    res.json({
      issue_id: hdr.issue_id,
      issue_no: hdr.issue_no,
      lorry_id: hdr.lorry_id,
      lorry_no: hdr.lorry_no,
      authenticator: hdr.authenticator,
      supplier_id: hdr.supplier_id || null,
      supplier_name: hdr.supplier_name || null,
      reps: repRows || [],
    });
  } catch (err) {
    console.error("GET /api/unload/issue-info error:", err);
    res.status(500).json({ error: "Failed to load issue header info" });
  } finally {
    connection.release();
  }
});

/* ------------------------------------------------------------------ */
/*  PRODUCTS STILL UNLOADABLE FOR AN ISSUE                            */
/* ------------------------------------------------------------------ */
// GET /api/unload/issue-products/:issueId
// ------------------------------------------------------------------
// PRODUCTS STILL UNLOADABLE FOR AN ISSUE (PACK-WISE)
// GET /api/unload/issue-products/:issueId
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// PRODUCTS STILL UNLOADABLE FOR AN ISSUE (PACK-WISE, WITH RETURNS)
// GET /api/unload/issue-products/:issueId
// ------------------------------------------------------------------
router.get("/issue-products/:issueId", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const issueId = toInt(req.params.issueId, 0);
    if (!issueId) {
      return res.status(400).json({ error: "Invalid issue id" });
    }

    // For each (product + pack_size): issued pcs - already returned pcs
    const [rows] = await connection.query(
      `
      SELECT
        ii.product_id,
        p.product_code,
        p.name                          AS product_name,
        COALESCE(b.pack_size, 1)        AS display_pack,

        -- total issued pcs for this product + pack in this issue
        COALESCE(SUM(ia.pieces_sent), 0) AS issued_pcs,

        -- total already unloaded pcs for this product + pack in this issue
        COALESCE(ur.returned_pcs, 0)    AS returned_pcs
      FROM issue_items ii
      JOIN products p           ON p.product_id = ii.product_id
      JOIN issue_allocations ia ON ia.issue_item_id = ii.entry_id
      JOIN inventory_batches b  ON b.batch_id = ia.batch_id

      LEFT JOIN (
        SELECT
          ui.product_id,
          ui.pack_size,
          SUM(ui.quantity_returned) AS returned_pcs
        FROM unload_items ui
        JOIN unload_note un ON un.id = ui.unload_id
        WHERE un.issue_id = ?
        GROUP BY ui.product_id, ui.pack_size
      ) AS ur
        ON ur.product_id = ii.product_id
       AND ur.pack_size  = b.pack_size

      WHERE ii.issue_id = ?
      GROUP BY
        ii.product_id,
        p.product_code,
        p.name,
        b.pack_size
      ORDER BY
        p.product_code ASC,
        b.pack_size ASC
      `,
      [issueId, issueId]
    );

    const list = rows
      .map((r) => {
        const pack = Math.max(1, toInt(r.display_pack, 1));
        const issued = toInt(r.issued_pcs, 0);
        const returned = toInt(r.returned_pcs, 0);
        const remaining = Math.max(0, issued - returned);

        return {
          product_id: r.product_id,
          product_code: r.product_code,
          product_name: r.product_name,
          display_pack: pack,
          max_returnable_pcs: remaining,
          boxes_equiv: Math.floor(remaining / pack),
          items_equiv: remaining % pack,
        };
      })
      .filter((row) => row.max_returnable_pcs > 0); // only show if something left

    res.json(list);
  } catch (err) {
    console.error("GET /api/unload/issue-products error:", err);
    res.status(500).json({ error: "Failed to load products for issue" });
  } finally {
    connection.release();
  }
});

/* ------------------------------------------------------------------ */
/*  CREATE UNLOAD NOTE  (ISSUE-AWARE, WITH LIMITS)                    */
/* ------------------------------------------------------------------ */
router.post("/", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { unload_no, issue_ref, issue_id, remarks, items, lorry_id } = req.body;
    const userId = req.user.user_id;

    const rawIssue = (issue_ref || issue_id || "").toString().trim();

    if (!unload_no || !items || !items.length) {
      return res
        .status(400)
        .json({ error: "unload_no and at least one item are required" });
    }

    await connection.beginTransaction();

    // ------------------------------------------------------------------
    // Branch A: Issue-aware unload (legacy/current behavior)
    // ------------------------------------------------------------------
    if (rawIssue) {
      // ---------- resolve issue (issue_no or issue_id) ----------
      const issueRow = await resolveIssueByRef(connection, rawIssue);
      if (!issueRow) {
        await connection.rollback();
        return res.status(400).json({ error: "Invalid issue reference" });
      }

      const resolvedIssueId = issueRow.issue_id;
      const resolvedLorryId = toInt(issueRow.lorry_id);

      // If caller still sends a lorry_id, enforce match
      if (lorry_id && toInt(lorry_id) !== resolvedLorryId) {
        await connection.rollback();
        return res
          .status(400)
          .json({ error: "Issue note does not belong to this lorry" });
      }

      // ---------- per-product remaining = issued - already returned ----------
      const productIds = [
        ...new Set(items.map((r) => toInt(r.product_id)).filter((id) => !!id)),
      ];

      const remainingByProduct = new Map();

      for (const pid of productIds) {
        // issued pieces for this product in that issue
        const [[issuedRow]] = await connection.query(
          `
          SELECT
            COALESCE(
              SUM(NULLIF(pieces_sent, 0)),
              SUM(quantity_sent),
              0
            ) AS issued_pcs
          FROM issue_items
          WHERE issue_id = ? AND product_id = ?
          `,
          [resolvedIssueId, pid]
        );
        const issuedPcs = toInt(issuedRow?.issued_pcs, 0);

        // already returned by previous unload notes
        const [[returnedRow]] = await connection.query(
          `
          SELECT COALESCE(SUM(ui.quantity_returned), 0) AS returned_pcs
          FROM unload_items ui
          JOIN unload_note un ON ui.unload_id = un.id
          WHERE un.issue_id = ? AND ui.product_id = ?
          `,
          [resolvedIssueId, pid]
        );
        const returnedPcs = toInt(returnedRow?.returned_pcs, 0);

        remainingByProduct.set(pid, Math.max(0, issuedPcs - returnedPcs));
      }

      // Also track how much we consume in THIS request (so you can't exceed within same note)
      const usedThisRequest = new Map();

      // ---------- insert unload_note header ----------
      const [unloadResult] = await connection.query(
        `
        INSERT INTO unload_note
          (unload_no, unload_date, issue_id, lorry_id, created_by, remarks)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          unload_no,
          getLocalTimestamp(),
          resolvedIssueId,
          resolvedLorryId,
          userId,
          remarks || null,
        ]
      );
      const unloadId = unloadResult.insertId;

      // ---------- process each item ----------
      for (const raw of items) {
        const productId = toInt(raw.product_id);
        const qty = toInt(raw.quantity);
        const packSize = Math.max(1, toInt(raw.pack_size, 1)); // from FE
        const issueItemId = toInt(raw.issue_item_id, 0); // optional, for history

        if (!productId || qty <= 0) continue;

        const baseRemaining = remainingByProduct.get(productId) ?? 0;
        const alreadyUsed = usedThisRequest.get(productId) ?? 0;
        const maxForThisRequest = baseRemaining - alreadyUsed;

        if (maxForThisRequest <= 0 || qty > maxForThisRequest) {
          await connection.rollback();
          return res.status(400).json({
            error: `Cannot unload ${qty} pcs of product_id=${productId}. Max you can unload now is ${Math.max(
              maxForThisRequest,
              0
            )} pcs for this issue.`,
          });
        }

        usedThisRequest.set(productId, alreadyUsed + qty);

        // split into boxes/items for this pack
        const boxes = Math.floor(qty / packSize);
        const itemsRem = qty % packSize;

        // ---------- 1) record in unload_items (with pack + boxes/items for bin card) ----------
        await connection.query(
          `
          INSERT INTO unload_items
            (unload_id, issue_item_id, product_id, pack_size,
             quantity_returned, boxes_returned, items_returned)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [unloadId, issueItemId, productId, packSize, qty, boxes, itemsRem]
        );

        // ---------- 2) increase main product stock ----------
        await connection.query(
          `
          UPDATE products
          SET quantity = quantity + ?
          WHERE product_id = ?
          `,
          [qty, productId]
        );

        // ---------- 3) create an inventory_batches row ----------
        await connection.query(
          `
          INSERT INTO inventory_batches
            (product_id,
             source_type,
             source_id,
             pack_size,
             received_pcs,
             remaining_pcs,
             received_boxes,
             received_items)
          VALUES (?, 'UNLOAD', ?, ?, ?, ?, ?, ?)
          `,
          [productId, unloadId, packSize, qty, qty, boxes, itemsRem]
        );
      }

      await connection.commit();
      return res.json({
        message: "Unload saved and stock updated.",
        unload_id: unloadId,
      });
    }

    // ------------------------------------------------------------------
    // Branch B: Standalone unload (no Issue Note reference)
    // ------------------------------------------------------------------
    const resolvedLorryId = toInt(lorry_id, 0);
    if (!resolvedLorryId) {
      await connection.rollback();
      return res.status(400).json({ error: "lorry_id is required" });
    }

    // validate lorry exists
    const [[lorryRow]] = await connection.query(
      `SELECT lorry_id FROM issue_lorries WHERE lorry_id = ?`,
      [resolvedLorryId]
    );
    if (!lorryRow) {
      await connection.rollback();
      return res.status(400).json({ error: "Invalid lorry_id" });
    }

    const [unloadResult] = await connection.query(
      `
      INSERT INTO unload_note
        (unload_no, unload_date, issue_id, lorry_id, created_by, remarks)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        unload_no,
        getLocalTimestamp(),
        null,
        resolvedLorryId,
        userId,
        remarks || null,
      ]
    );
    const unloadId = unloadResult.insertId;

    for (const raw of items) {
      const productId = toInt(raw.product_id);
      const qty = toInt(raw.quantity);
      const packSize = Math.max(1, toInt(raw.pack_size, 1));
      const issueItemId = toInt(raw.issue_item_id, 0);

      if (!productId || qty <= 0) continue;

      const boxes = Math.floor(qty / packSize);
      const itemsRem = qty % packSize;

      await connection.query(
        `
        INSERT INTO unload_items
          (unload_id, issue_item_id, product_id, pack_size,
           quantity_returned, boxes_returned, items_returned)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [unloadId, issueItemId || null, productId, packSize, qty, boxes, itemsRem]
      );

      await connection.query(
        `
        UPDATE products
        SET quantity = quantity + ?
        WHERE product_id = ?
        `,
        [qty, productId]
      );

      await connection.query(
        `
        INSERT INTO inventory_batches
          (product_id,
           source_type,
           source_id,
           pack_size,
           received_pcs,
           remaining_pcs,
           received_boxes,
           received_items)
        VALUES (?, 'UNLOAD', ?, ?, ?, ?, ?, ?)
        `,
        [productId, unloadId, packSize, qty, qty, boxes, itemsRem]
      );
    }

    await connection.commit();
    res.json({ message: "Unload saved and stock updated.", unload_id: unloadId });
  } catch (err) {
    console.error("Error in /api/unload:", err);
    try {
      await connection.rollback();
    } catch {}
    res.status(500).json({ error: "Server error while saving unload" });
  } finally {
    connection.release();
  }
});

/* ------------------------------------------------------------------ */
/*  LIST UNLOAD NOTES (DATE + SUPPLIER FILTER)                        */
/* ------------------------------------------------------------------ */
// GET /api/unload/list
// GET /api/unload/list?start=YYYY-MM-DD&end=YYYY-MM-DD
// GET /api/unload/list?start=...&end=...&supplier_id=3
router.get("/list", authenticateToken, async (req, res) => {
  try {
    const { start, end, supplier_id } = req.query;
    const supplierId = toInt(supplier_id, 0);

    const where = [];
    const params = [];

    if (start) {
      where.push("DATE(un.unload_date) >= ?");
      params.push(start);
    }

    if (end) {
      where.push("DATE(un.unload_date) <= ?");
      params.push(end);
    }

    // filter by supplier of products in this unload note
    if (supplierId > 0) {
      where.push("p.supplier_id = ?");
      params.push(supplierId);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        un.id,
        un.unload_no,
        DATE(un.unload_date) AS unload_date,
        un.issue_id,
        i.issue_no,
        un.lorry_id,
        il.lorry_no,
        MIN(p.supplier_id) AS supplier_id,
        MIN(s.name)        AS supplier_name,
        COALESCE(COUNT(DISTINCT ui.product_id), 0) AS item_count,
        COALESCE(SUM(ui.quantity_returned), 0)     AS total_pcs
      FROM unload_note un
      LEFT JOIN issue_note i   ON i.issue_id  = un.issue_id
      LEFT JOIN unload_items ui ON ui.unload_id = un.id
      LEFT JOIN products p      ON ui.product_id = p.product_id
      LEFT JOIN suppliers s     ON s.supplier_id = p.supplier_id
      LEFT JOIN issue_lorries il ON un.lorry_id  = il.lorry_id
      ${whereSql}
      GROUP BY un.id, un.unload_no, unload_date, un.issue_id, i.issue_no, un.lorry_id, il.lorry_no
      ORDER BY un.unload_date DESC, un.id DESC
    `;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("Error loading unload list:", err);
    res.status(500).json({ error: "Failed to load unload notes" });
  }
});


/* ------------------------------------------------------------------ */
/*  ITEMS OF A SINGLE UNLOAD NOTE                                     */
/* ------------------------------------------------------------------ */
// GET /api/unload/:unloadId/items
router.get("/:unloadId/items", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const unloadId = toInt(req.params.unloadId, 0);
    if (!unloadId) {
      return res.status(400).json({ error: "Invalid unload id" });
    }

    const [rows] = await connection.query(
      `
      SELECT
        ui.id,
        ui.product_id,
        p.product_code,
        p.name AS product_name,
        ui.pack_size,
        ui.quantity_returned,
        ui.boxes_returned,
        ui.items_returned
      FROM unload_items ui
      JOIN products p ON p.product_id = ui.product_id
      WHERE ui.unload_id = ?
      ORDER BY p.product_code ASC, p.name ASC
      `,
      [unloadId]
    );

    res.json(rows || []);
  } catch (err) {
    console.error("GET /api/unload/:unloadId/items error:", err);
    res.status(500).json({ error: "Failed to load unload items" });
  } finally {
    connection.release();
  }
});


module.exports = router;
