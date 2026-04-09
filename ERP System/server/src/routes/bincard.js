// server/src/routes/bincard.js
const express = require("express");
const router = express.Router();

const pool = require("../db");
const authenticateToken = require("./authMiddleware");

const asInt = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Number(v) : d;
};

// IMPORTANT: do NOT use toISOString() (it shifts by timezone and changes date)
function toDateString(d) {
  if (!d) return null;

  if (typeof d === "string") return d.slice(0, 10);

  if (d instanceof Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return String(d).slice(0, 10);
}

// GET /api/bincard?product_id=1&month=2025-11
// Or:    /api/bincard?product_id=1&start_date=2025-11-01&end_date=2025-11-30
// Optional: &pack_size=30  -> pack-wise bin card
router.get("/", authenticateToken, async (req, res) => {
  const productId = asInt(req.query.product_id, 0);
  const month = (req.query.month || "").trim(); // 'YYYY-MM' or empty (back-compat)
  const startParam = (req.query.start_date || "").trim(); // 'YYYY-MM-DD' optional
  const endParam = (req.query.end_date || "").trim(); // 'YYYY-MM-DD' optional

  // optional pack-wise filter
  const packParam = asInt(req.query.pack_size, 0);
  const filterPack = packParam > 0 ? packParam : null;

  if (!productId) {
    return res.status(400).json({ message: "product_id is required" });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    /* 1) Load product + default pack size */
    const [prodRows] = await conn.query(
      "SELECT name, COALESCE(default_pack_size, 1) AS pack_size FROM products WHERE product_id = ?",
      [productId]
    );

    if (!prodRows.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = prodRows[0];

    const pack = filterPack || asInt(product.pack_size, 1);

    /* 2) Decide date range (month or current month) */
        /* 2) Decide date range (month or current month) */
    let startDate, endDate;

    if (startParam || endParam) {
      // Support explicit date range: start_date and/or end_date in YYYY-MM-DD
      const dateOk = /^\d{4}-\d{2}-\d{2}$/;
      if (startParam && !dateOk.test(startParam)) {
        return res
          .status(400)
          .json({ message: "start_date must be in YYYY-MM-DD format" });
      }
      if (endParam && !dateOk.test(endParam)) {
        return res
          .status(400)
          .json({ message: "end_date must be in YYYY-MM-DD format" });
      }

      // If only one of start/end provided, treat as single-day range
      startDate = startParam || endParam;
      endDate = endParam || startParam;
    } else if (month) {
      // month is expected as 'YYYY-MM'
      const ok = /^(\d{4})-(\d{2})$/.test(month);
      if (!ok) {
        return res
          .status(400)
          .json({ message: "month must be in YYYY-MM format" });
      }

      const [yStr, mStr] = month.split("-");
      const year = Number(yStr);
      const monthIdx = Number(mStr) - 1; // JS month index 0–11

      // first day of that month
      const start = new Date(year, monthIdx, 1);
      // last day of that month -> day 0 of next month
      const end = new Date(year, monthIdx + 1, 0);

      startDate = toDateString(start); // 'YYYY-MM-DD'
      endDate = toDateString(end);
    } else {
      // current month: first day to today
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);

      startDate = toDateString(start);
      endDate = toDateString(now);
    }

    /* 3) Collect ALL movements for this product */

    // 3a) GRN IN (via inventory_batches + grn_items + grn)
    let grnSql = `
      SELECT 
        strftime('%Y-%m-%d', COALESCE(g.grn_date, b.created_at))      AS tx_date,
        COALESCE(g.grn_date, b.created_at)            AS tx_ts,
        COALESCE(g.grn_no, CONCAT('GRN#', gi.grn_id)) AS ref_no,
        'GRN'                                         AS source,
        SUM(b.received_pcs)                           AS pcs_in,
        0                                             AS pcs_out
      FROM inventory_batches b
      LEFT JOIN grn_items gi
        ON gi.batch_id = b.batch_id
      LEFT JOIN grn g
        ON g.grn_id = gi.grn_id
      WHERE b.product_id = ?
        AND b.source_type = 'GRN'
    `;
    const grnParams = [productId];

    if (filterPack) {
      grnSql += " AND b.pack_size = ?";
      grnParams.push(filterPack);
    }

    grnSql += `
      GROUP BY COALESCE(gi.grn_id, b.source_id), tx_date, tx_ts, ref_no
    `;

    const [grnRows] = await conn.query(grnSql, grnParams);

    // 3b) ISSUE OUT (via issue_allocations + inventory_batches)
    let issueSql = `
      SELECT
        strftime('%Y-%m-%d', n.date_created)   AS tx_date,
        n.date_created         AS tx_ts,
        n.issue_no             AS ref_no,
        'ISSUE'                AS source,
        0                      AS pcs_in,
        SUM(a.pieces_sent)     AS pcs_out
      FROM issue_allocations a
      JOIN inventory_batches b
        ON b.batch_id = a.batch_id
      JOIN issue_items ii
        ON ii.entry_id = a.issue_item_id
      JOIN issue_note n
        ON n.issue_id = ii.issue_id
      WHERE b.product_id = ?
    `;
    const issueParams = [productId];

    if (filterPack) {
      issueSql += " AND b.pack_size = ?";
      issueParams.push(filterPack);
    }

    issueSql += `
      GROUP BY n.issue_id, tx_date, tx_ts, ref_no
    `;

    const [issueRows] = await conn.query(issueSql, issueParams);

    // 3c) ADJUST IN/OUT (from adjustment tables)
    // net_pcs = delta_pieces + delta_boxes * pack_size + delta_items
    // 3c) ADJUST IN/OUT (from adjustment tables)
// net_pcs = delta_boxes * pack_size + delta_items
let adjSql = `
  SELECT
    strftime('%Y-%m-%d', an.note_date) AS tx_date,
    an.created_at AS tx_ts,
    an.note_no   AS ref_no,
    'ADJUST'     AS source,
    SUM(
      CASE 
        WHEN (ai.delta_boxes * ai.pack_size + ai.delta_items) > 0
          THEN (ai.delta_boxes * ai.pack_size + ai.delta_items)
        ELSE 0
      END
    ) AS pcs_in,
    SUM(
      CASE 
        WHEN (ai.delta_boxes * ai.pack_size + ai.delta_items) < 0
          THEN -(ai.delta_boxes * ai.pack_size + ai.delta_items)
        ELSE 0
      END
    ) AS pcs_out
  FROM adjustment_items ai
  JOIN adjustment_notes an ON an.note_id = ai.note_id
  WHERE ai.product_id = ?
    AND an.status = 'POSTED'
`;
const adjParams = [productId];

if (filterPack) {
  adjSql += " AND ai.pack_size = ?";
  adjParams.push(filterPack);
}

adjSql += `
  GROUP BY an.note_id, tx_date, tx_ts, ref_no
`;

const [adjRows] = await conn.query(adjSql, adjParams);

    // 3d) UNLOAD IN (from unload_note + unload_items)
    // quantity_returned is pieces coming BACK to shop (IN)
    let unloadSql = `
      SELECT
        strftime('%Y-%m-%d', un.unload_date)      AS tx_date,
        un.unload_date            AS tx_ts,
        un.unload_no              AS ref_no,
        'UNLOAD'                  AS source,
        SUM(ui.quantity_returned) AS pcs_in,
        0                         AS pcs_out
      FROM unload_items ui
      JOIN unload_note un ON ui.unload_id = un.id
      WHERE ui.product_id = ?
    `;
    const unloadParams = [productId];

    if (filterPack) {
      unloadSql += " AND ui.pack_size = ?";
      unloadParams.push(filterPack);
    }

    unloadSql += `
      GROUP BY un.id, tx_date, tx_ts, ref_no
    `;

    const [unloadRows] = await conn.query(unloadSql, unloadParams);

    // Debug: if caller supplied debug=1, print raw DB rows to help diagnose date issues
    const isDebug = String(req.query.debug || "0") === "1";
    if (isDebug) {
      console.log("[BIN CARD DEBUG] productId=", productId, "startDate=", startDate, "endDate=", endDate);
      console.log("[BIN CARD DEBUG] grnRows sample:", JSON.stringify(grnRows && grnRows.slice(0,5), null, 2));
      console.log("[BIN CARD DEBUG] issueRows sample:", JSON.stringify(issueRows && issueRows.slice(0,5), null, 2));
      console.log("[BIN CARD DEBUG] adjRows sample:", JSON.stringify(adjRows && adjRows.slice(0,5), null, 2));
      console.log("[BIN CARD DEBUG] unloadRows sample:", JSON.stringify(unloadRows && unloadRows.slice(0,5), null, 2));
      // print types for tx_date/tx_ts for first row of each set
      const showType = (arr, name) => {
        if (!arr || !arr.length) return console.log(`[BIN CARD DEBUG] ${name}: <no rows>`);
        const r = arr[0];
        console.log(`[BIN CARD DEBUG] ${name} row0 types: tx_date=${typeof r.tx_date}, tx_ts=${typeof r.tx_ts}`);
        try { console.log(`[BIN CARD DEBUG] ${name} row0 values: tx_date=${r.tx_date}, tx_ts=${r.tx_ts}`); } catch (e) {}
      };
      showType(grnRows, 'grnRows');
      showType(issueRows, 'issueRows');
      showType(adjRows, 'adjRows');
      showType(unloadRows, 'unloadRows');
    }


    /* 4) Normalize + merge all movements (still in pieces) */
    /* 4) Normalize + merge all movements (still in pieces) */
    const all = []
      .concat(grnRows || [], issueRows || [], adjRows || [], unloadRows || [])
      .map((row) => ({
        tx_date: toDateString(row.tx_date),
        tx_ts: row.tx_ts || row.tx_date,
        ref_no: row.ref_no,
        source: row.source,
        pcs_in: asInt(row.pcs_in || 0, 0),
        pcs_out: asInt(row.pcs_out || 0, 0),
      }))
      .filter((r) => r.pcs_in !== 0 || r.pcs_out !== 0);

    // sort by full timestamp, then source, then ref
    all.sort((a, b) => {
      const ta = a.tx_ts ? new Date(a.tx_ts).getTime() : 0;
      const tb = b.tx_ts ? new Date(b.tx_ts).getTime() : 0;

      if (ta < tb) return -1;
      if (ta > tb) return 1;

      if (a.source < b.source) return -1;
      if (a.source > b.source) return 1;
      if (a.ref_no < b.ref_no) return -1;
      if (a.ref_no > b.ref_no) return 1;
      return 0;
    });


    const startStr = startDate;
    const endStr = endDate;

    /* 5) Opening balance = all movements BEFORE start date */
    let openingPcs = 0;
    for (const row of all) {
      if (row.tx_date && row.tx_date < startStr) {
        openingPcs += row.pcs_in - row.pcs_out;
      }
    }

    const openingBoxes = Math.floor(openingPcs / pack);
    const openingItems = openingPcs % pack;

    /* 6) Movements inside [start, end] with running balance */
    const rows = [];
    let balancePcs = openingPcs;

    for (const row of all) {
      if (!row.tx_date || row.tx_date < startStr || row.tx_date > endStr) {
        continue;
      }

      balancePcs += row.pcs_in - row.pcs_out;

      const inBoxes = Math.floor(row.pcs_in / pack);
      const inItems = row.pcs_in % pack;
      const outBoxes = Math.floor(row.pcs_out / pack);
      const outItems = row.pcs_out % pack;
      const balBoxes = Math.floor(balancePcs / pack);
      const balItems = balancePcs % pack;

      rows.push({
        date: row.tx_date,
        ref_no: row.ref_no,
        source: row.source,
        in_pcs: row.pcs_in,
        out_pcs: row.pcs_out,
        in_boxes: inBoxes,
        in_items: inItems,
        out_boxes: outBoxes,
        out_items: outItems,
        balance_pcs: balancePcs,
        balance_boxes: balBoxes,
        balance_items: balItems,
      });
    }

    /* 7) Final response */
    res.json({
      product_id: productId,
      product_name: product.name,
      pack_size: pack,
      start_date: startStr,
      end_date: endStr,
      opening: {
        balance_pcs: openingPcs,
        balance_boxes: openingBoxes,
        balance_items: openingItems,
      },
      rows,
    });
  } catch (err) {
    console.error("Bin card error:", err);
    res.status(500).json({ message: "Error building bin card" });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
