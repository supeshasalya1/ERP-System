const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'shop.sqlite');

const SUPPLIER_ID = 1;
const LORRY_ID = 1;
const PRODUCT_PREFIX = 'ABC-PROD-';
const GRN_PREFIX = 'GRN-ABC-TEST-';

const pad = (n, width) => String(n).padStart(width, '0');

function openDb() {
  return new sqlite3.Database(dbPath);
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function main() {
  const db = openDb();

  try {
    await run(db, 'PRAGMA foreign_keys = ON');

    // Don’t duplicate stock if already seeded.
    const existing = await get(
      db,
      `SELECT COUNT(*) AS cnt FROM grn WHERE grn_no LIKE ?`,
      [`${GRN_PREFIX}%`]
    );
    if ((existing?.cnt || 0) > 0) {
      console.log(`Looks like test GRNs already exist (${existing.cnt}). No changes made.`);
      return;
    }

    await run(db, 'BEGIN TRANSACTION');

    // Ensure supplier + lorry exist (idempotent)
    await run(
      db,
      `INSERT OR IGNORE INTO suppliers (supplier_id, name, contact_person, phone, email)
       VALUES (?, 'ABC Suppliers', 'Seed', '0000000000', '')`,
      [SUPPLIER_ID]
    );

    await run(
      db,
      `INSERT OR IGNORE INTO lorries (lorry_id, lorry_name, lorry_no)
       VALUES (?, 'Lorry 1', 'WA-SP-3000')`,
      [LORRY_ID]
    );

    // 1) Create 91 products for ABC supplier
    const insertProductSql =
      `INSERT OR IGNORE INTO products
         (product_code, name, brand_id, quantity, supplier_id, default_pack_size)
       VALUES (?, ?, ?, 0, ?, ?)`;

    for (let i = 1; i <= 91; i++) {
      const productCode = `${PRODUCT_PREFIX}${pad(i, 4)}`;
      const name = `ABC Test Product ${pad(i, 3)}`;
      const brandId = i % 2 === 0 ? 2 : 1; // alternate existing brands
      const defaultPack = i % 3 === 0 ? 30 : 20;
      await run(db, insertProductSql, [productCode, name, brandId, SUPPLIER_ID, defaultPack]);
    }

    const products = await all(
      db,
      `SELECT product_id, product_code
         FROM products
        WHERE product_code LIKE ?
        ORDER BY product_code ASC`,
      [`${PRODUCT_PREFIX}%`]
    );

    if (products.length !== 91) {
      throw new Error(
        `Expected 91 seeded products with prefix ${PRODUCT_PREFIX} but found ${products.length}. ` +
        `If some codes already existed with conflicts, delete them or change PRODUCT_PREFIX.`
      );
    }

    // 2) Create GRNs and add stock for all 91 products
    const grnSizes = [31, 30, 30];
    let productIndex = 0;
    let totalReceived = 0;
    const createdGrns = [];

    for (let g = 1; g <= grnSizes.length; g++) {
      const grnNo = `${GRN_PREFIX}${pad(g, 4)}`;
      const { lastID: grnId } = await run(
        db,
        `INSERT INTO grn (grn_no, grn_date, supplier_id, lorry_id)
         VALUES (?, CURRENT_TIMESTAMP, ?, ?)`,
        [grnNo, SUPPLIER_ID, LORRY_ID]
      );
      createdGrns.push({ grn_id: grnId, grn_no: grnNo });

      const count = grnSizes[g - 1];
      for (let k = 0; k < count; k++) {
        const p = products[productIndex++];
        const n = productIndex; // 1..91 in order

        const packSize = n % 3 === 0 ? 30 : 20;
        const boxesReceived = 5;
        const itemsReceived = 0;
        const receivedPcs = boxesReceived * packSize + itemsReceived;

        const { lastID: grnItemId } = await run(
          db,
          `INSERT INTO grn_items
             (grn_id, product_id, quantity_received, pack_size, boxes_received, items_received)
           VALUES (?,?,?,?,?,?)`,
          [grnId, p.product_id, receivedPcs, packSize, boxesReceived, itemsReceived]
        );

        const { lastID: batchId } = await run(
          db,
          `INSERT INTO inventory_batches
             (product_id, source_type, source_id, pack_size,
              received_pcs, remaining_pcs, received_boxes, received_items)
           VALUES (?,?,?,?,?,?,?,?)`,
          [
            p.product_id,
            'GRN',
            grnItemId,
            packSize,
            receivedPcs,
            receivedPcs,
            boxesReceived,
            itemsReceived,
          ]
        );

        await run(
          db,
          `UPDATE grn_items SET batch_id = ? WHERE entry_id = ?`,
          [batchId, grnItemId]
        );

        await run(
          db,
          `UPDATE products
              SET quantity = COALESCE(quantity, 0) + ?,
                  default_pack_size = COALESCE(default_pack_size, ?)
            WHERE product_id = ?`,
          [receivedPcs, packSize, p.product_id]
        );

        totalReceived += receivedPcs;
      }
    }

    await run(db, 'COMMIT');

    // 3) Quick verification
    const seededCount = await get(
      db,
      `SELECT COUNT(*) AS cnt FROM products WHERE product_code LIKE ?`,
      [`${PRODUCT_PREFIX}%`]
    );

    const inStockCount = await get(
      db,
      `SELECT COUNT(*) AS cnt
         FROM products
        WHERE product_code LIKE ?
          AND COALESCE(quantity, 0) > 0`,
      [`${PRODUCT_PREFIX}%`]
    );

    console.log(`Seeded/ensured products: ${seededCount?.cnt || 0} (expected 91)`);
    console.log(`Products now in stock (>0 pcs): ${inStockCount?.cnt || 0} (expected 91)`);
    console.log(`Created GRNs: ${createdGrns.map(g => g.grn_no).join(', ')}`);
    console.log(`Total received pcs across all GRNs: ${totalReceived}`);
  } catch (err) {
    try { await run(db, 'ROLLBACK'); } catch { /* ignore */ }
    console.error('Failed to seed 91 products + GRNs:', err);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
