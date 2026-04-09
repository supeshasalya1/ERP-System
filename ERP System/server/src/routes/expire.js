// server/src/routes/expire.js
const express = require("express");
const router = express.Router();

const pool = require("../db");
const authenticateToken = require("./authMiddleware");

const asInt = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// Small helper for next running number (for note_no)
async function getNextId(connection, tableName) {
  const [rows] = await connection.query(
    `SELECT IFNULL(MAX(id), 0) + 1 AS next_id FROM ${tableName}`
  );
  return rows[0]?.next_id || 1;
}

// ===========================
// 1) PACK SIZE OPTIONS (from main stock)
// ===========================
//
// GET /api/expire/pack-sizes?product_id=1&supplier_id=2
// returns distinct pack_size values used in GRNs for that product/supplier
router.get("/pack-sizes", authenticateToken, async (req, res) => {
  const productId = asInt(req.query.product_id, 0);
  const supplierId = asInt(req.query.supplier_id, 0);

  if (!productId || !supplierId) {
    return res
      .status(400)
      .json({ message: "product_id and supplier_id are required" });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT DISTINCT gi.pack_size
      FROM grn_items gi
      JOIN grn g ON g.grn_id = gi.grn_id
      WHERE gi.product_id = ?
        AND gi.supplier_id = ?
        AND gi.pack_size > 0
      ORDER BY gi.pack_size
      `,
      [productId, supplierId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching expire pack sizes:", err);
    res.status(500).json({ message: "Error fetching pack sizes" });
  }
});

// ===========================
// 2) VIEW EXPIRE STORE STOCK
// ===========================
//
// GET /api/expire/store?supplier_id=&product_id=&search=codeOrName
router.get("/store", authenticateToken, async (req, res) => {
  const supplierId = asInt(req.query.supplier_id, 0);
  const productId = asInt(req.query.product_id, 0);
  const search = (req.query.search || "").trim(); // product_code or name

      let sql = `
    SELECT
      ess.id,
      ess.product_id,
      ess.supplier_id,
      ess.pack_size,
      ess.total_pcs,
      ess.boxes,
      ess.items,
      ess.updated_at,
      p.product_code,
      p.name AS product_name,
      s.name AS supplier_name
    FROM expire_store_stock ess
    JOIN products p ON p.product_id = ess.product_id
    JOIN suppliers s ON s.supplier_id = ess.supplier_id
    WHERE ess.total_pcs > 0
  `;


  const params = [];

  if (supplierId) {
    sql += " AND ess.supplier_id = ?";
    params.push(supplierId);
  }

  if (productId) {
    sql += " AND ess.product_id = ?";
    params.push(productId);
  }

  if (search) {
    sql +=
      " AND (p.product_code LIKE ? OR p.name LIKE ? OR s.supplier_name LIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  sql += " ORDER BY p.product_code, ess.pack_size";

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching expire store:", err);
    res.status(500).json({ message: "Error fetching expire store" });
  }
});

// ===========================
// 2b) EXPIRE MOVEMENT REPORT
// ===========================
// GET /api/expire/report?start_date=2025-01-01&end_date=2025-01-31&supplier_id=&product_id=
router.get("/report", authenticateToken, async (req, res) => {
  const normalizeDate = (value) => {
    if (!value) return null;
    const dateObj = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateObj.getTime())) return null;
    return dateObj.toISOString().slice(0, 10);
  };

  const defaultEnd = normalizeDate(new Date());
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  const defaultStart = normalizeDate(defaultStartDate);

  let startDate = normalizeDate(req.query.start_date) || defaultStart;
  let endDate = normalizeDate(req.query.end_date) || defaultEnd;

  // make endDate inclusive (cover entire day); MySQL DATETIME comparisons with a
  // plain date string use midnight, which was forcing users to pick the next day
  // to see movements. We extend the end date by one day and keep the <= comparison.
  if (endDate) {
    const endPlusOne = new Date(endDate);
    endPlusOne.setDate(endPlusOne.getDate() + 1);
    endDate = normalizeDate(endPlusOne);
  }

  if (startDate && endDate && startDate > endDate) {
    const swap = startDate;
    startDate = endDate;
    endDate = swap;
  }

  const supplierId = asInt(req.query.supplier_id, 0);
  const productId = asInt(req.query.product_id, 0);

  const receiveConditions = [];
  const receiveParams = [];
  if (startDate) {
    receiveConditions.push("ern.note_date >= ?");
    receiveParams.push(startDate);
  }
  if (endDate) {
    receiveConditions.push("ern.note_date <= ?");
    receiveParams.push(endDate);
  }
  if (supplierId) {
    receiveConditions.push("eri.supplier_id = ?");
    receiveParams.push(supplierId);
  }
  if (productId) {
    receiveConditions.push("eri.product_id = ?");
    receiveParams.push(productId);
  }
  const receiveWhere = receiveConditions.length
    ? `AND ${receiveConditions.join(" AND ")}`
    : "";

  const returnConditions = [];
  const returnParams = [];
  if (startDate) {
    returnConditions.push("ernt.note_date >= ?");
    returnParams.push(startDate);
  }
  if (endDate) {
    returnConditions.push("ernt.note_date <= ?");
    returnParams.push(endDate);
  }
  if (supplierId) {
    returnConditions.push("erit.supplier_id = ?");
    returnParams.push(supplierId);
  }
  if (productId) {
    returnConditions.push("erit.product_id = ?");
    returnParams.push(productId);
  }
  const returnWhere = returnConditions.length
    ? `AND ${returnConditions.join(" AND ")}`
    : "";

  const sql = `
    SELECT * FROM (
      SELECT
        'IN' AS direction,
        'RECEIVE' AS movement_type,
        ern.note_date,
        ern.note_no,
        s.name AS supplier_name,
        eri.supplier_id,
        p.product_code,
        p.name AS product_name,
        eri.product_id,
        eri.pack_size,
        eri.boxes,
        eri.items,
        eri.total_pcs,
        ern.remarks
      FROM expire_receive_items eri
      JOIN expire_receive_notes ern ON ern.id = eri.note_id
      JOIN products p ON p.product_id = eri.product_id
      JOIN suppliers s ON s.supplier_id = eri.supplier_id
      WHERE 1=1 ${receiveWhere}

      UNION ALL

      SELECT
        'OUT' AS direction,
        'RETURN' AS movement_type,
        ernt.note_date,
        ernt.note_no,
        s.name AS supplier_name,
        erit.supplier_id,
        p.product_code,
        p.name AS product_name,
        erit.product_id,
        erit.pack_size,
        erit.boxes,
        erit.items,
        erit.total_pcs,
        ernt.remarks
      FROM expire_return_items erit
      JOIN expire_return_notes ernt ON ernt.id = erit.note_id
      JOIN products p ON p.product_id = erit.product_id
      JOIN suppliers s ON s.supplier_id = erit.supplier_id
      WHERE 1=1 ${returnWhere}
    ) movements
    ORDER BY note_date ASC, note_no ASC, direction DESC
  `;

  try {
    const params = [...receiveParams, ...returnParams];
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching expire report:", err);
    res.status(500).json({ message: "Error fetching expire report" });
  }
});

// ===========================
// 3) CREATE EXPIRE RECEIVE NOTE (from issue lorry)
// ===========================
//
// POST /api/expire/receive
// body: {
//   note_date: "2025-11-30",
//   lorry_id: 3,                // issue_lorries.lorry_id
//   remarks: "From retail shop X",
//   items: [
//     {
//       product_id: 1,
//       supplier_id: 2,
//       pack_size: 20,
//       boxes: 1,
//       items: 5,
//       expiry_date: "2026-01-01"   // optional
//     },
//     ...
//   ]
// }
router.post("/receive", authenticateToken, async (req, res) => {
  const { note_date, lorry_id, remarks, items } = req.body;
  const userId = req.user?.user_id || req.user?.id; // based on your auth payload

  if (!note_date || !lorry_id) {
    return res.status(400).json({ message: "note_date and lorry_id are required" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "At least one item is required" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // generate running id and note_no
    const nextId = await getNextId(conn, "expire_receive_notes");
    const noteNo = `EXR-${String(nextId).padStart(6, "0")}`;

    const [noteResult] = await conn.query(
      `
      INSERT INTO expire_receive_notes
        (note_no, note_date, lorry_id, created_by, remarks, status)
      VALUES (?, ?, ?, ?, ?, 'POSTED')
      `,
      [noteNo, note_date, asInt(lorry_id), userId, remarks || null]
    );

    const noteId = noteResult.insertId;

    for (const line of items) {
      const productId = asInt(line.product_id);
      const supplierId = asInt(line.supplier_id);
      const packSize = asInt(line.pack_size);
      const boxes = asInt(line.boxes);
      const looseItems = asInt(line.items);
      const expiryDate = line.expiry_date || null;

      if (!productId || !supplierId || !packSize) {
        throw new Error("Invalid item data");
      }

      const totalPcs = boxes * packSize + looseItems;
      if (totalPcs <= 0) continue; // ignore empty lines

      // 1) insert line
      await conn.query(
        `
        INSERT INTO expire_receive_items
          (note_id, product_id, supplier_id, pack_size, boxes, items, total_pcs, expiry_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          noteId,
          productId,
          supplierId,
          packSize,
          boxes,
          looseItems,
          totalPcs,
          expiryDate,
        ]
      );

      // 2) update expire_store_stock (upsert)
      const [stockRows] = await conn.query(
        `
        SELECT id, total_pcs
        FROM expire_store_stock
        WHERE product_id = ? AND supplier_id = ? AND pack_size = ?
        
        `,
        [productId, supplierId, packSize]
      );

      if (stockRows.length) {
        const stock = stockRows[0];
        const newTotal = stock.total_pcs + totalPcs;
        const newBoxes = Math.floor(newTotal / packSize);
        const newItems = newTotal % packSize;

        await conn.query(
          `
          UPDATE expire_store_stock
          SET total_pcs = ?, boxes = ?, items = ?
          WHERE id = ?
          `,
          [newTotal, newBoxes, newItems, stock.id]
        );
      } else {
        const boxesStock = Math.floor(totalPcs / packSize);
        const itemsStock = totalPcs % packSize;

        await conn.query(
          `
          INSERT INTO expire_store_stock
            (product_id, supplier_id, pack_size, total_pcs, boxes, items)
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            productId,
            supplierId,
            packSize,
            totalPcs,
            boxesStock,
            itemsStock,
          ]
        );
      }
    }

    await conn.commit();
    res.json({
      message: "Expire receive note created",
      note_id: noteId,
      note_no: noteNo,
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Error creating expire receive note:", err);
    res.status(500).json({ message: "Error creating expire receive note" });
  } finally {
    if (conn) conn.release();
  }
});

// ===========================
// 4) CREATE EXPIRE RETURN NOTE (to supplier)
// ===========================
//
// POST /api/expire/return
// body: {
//   note_date: "2025-11-30",
//   supplier_id: 2,
//   lorry_id: 5,                 // normal supplier lorry (optional)
//   remarks: "Return expired stock",
//   items: [
//     {
//       product_id: 1,
//       pack_size: 20,
//       boxes: 1,
//       items: 0
//     },
//     ...
//   ]
// }
router.post("/return", authenticateToken, async (req, res) => {
  const { note_date, supplier_id, lorry_id, remarks, items } = req.body;
  const userId = req.user?.user_id || req.user?.id;

  if (!note_date || !supplier_id) {
    return res
      .status(400)
      .json({ message: "note_date and supplier_id are required" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "At least one item is required" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // generate running id and note_no
    const nextId = await getNextId(conn, "expire_return_notes");
    const noteNo = `EXRT-${String(nextId).padStart(6, "0")}`;

    const [noteResult] = await conn.query(
      `
      INSERT INTO expire_return_notes
        (note_no, note_date, supplier_id, lorry_id, created_by, remarks, status)
      VALUES (?, ?, ?, ?, ?, ?, 'POSTED')
      `,
      [
        noteNo,
        note_date,
        asInt(supplier_id),
        lorry_id ? asInt(lorry_id) : null,
        userId,
        remarks || null,
      ]
    );

    const noteId = noteResult.insertId;

    for (const line of items) {
      const productId = asInt(line.product_id);
      const packSize = asInt(line.pack_size);
      const boxes = asInt(line.boxes);
      const looseItems = asInt(line.items);

      if (!productId || !packSize) {
        throw new Error("Invalid item data");
      }

      const totalPcs = boxes * packSize + looseItems;
      if (totalPcs <= 0) continue;

      // 1) check stock
      const [stockRows] = await conn.query(
        `
        SELECT id, total_pcs
        FROM expire_store_stock
        WHERE product_id = ? AND supplier_id = ? AND pack_size = ?
      
        `,
        [productId, asInt(supplier_id), packSize]
      );

      if (!stockRows.length || stockRows[0].total_pcs < totalPcs) {
        throw new Error(
          `Not enough expire stock for product_id=${productId}, pack_size=${packSize}`
        );
      }

      const stock = stockRows[0];
      const newTotal = stock.total_pcs - totalPcs;
      const newBoxes = Math.floor(newTotal / packSize);
      const newItems = newTotal % packSize;

      // 2) insert return item
      await conn.query(
        `
        INSERT INTO expire_return_items
          (note_id, product_id, supplier_id, pack_size, boxes, items, total_pcs)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          noteId,
          productId,
          asInt(supplier_id),
          packSize,
          boxes,
          looseItems,
          totalPcs,
        ]
      );

      // 3) update / clear stock
      if (newTotal <= 0) {
        // expire store becomes empty for that product+pack_size
        await conn.query(
          `DELETE FROM expire_store_stock WHERE id = ?`,
          [stock.id]
        );
      } else {
        await conn.query(
          `
          UPDATE expire_store_stock
          SET total_pcs = ?, boxes = ?, items = ?
          WHERE id = ?
          `,
          [newTotal, newBoxes, newItems, stock.id]
        );
      }
    }

    await conn.commit();
    res.json({
      message: "Expire return note created",
      note_id: noteId,
      note_no: noteNo,
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Error creating expire return note:", err);
    res.status(500).json({ message: "Error creating expire return note" });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
