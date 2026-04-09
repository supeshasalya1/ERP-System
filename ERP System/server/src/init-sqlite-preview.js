const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'shop.preview.sqlite');
const schemaPath = path.resolve(__dirname, 'schema-sqlite.sql');
const dataPath = path.resolve(__dirname, 'data-sqlite.sql');

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath);

const execFile = (p) => new Promise((resolve, reject) => {
  const sql = fs.readFileSync(p, 'utf8');
  db.exec(sql, (err) => {
    if (err) reject(err);
    else resolve();
  });
});

async function main() {
  try {
    await execFile(schemaPath);
    await execFile(dataPath);

    const get = (sql, params = []) => new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });

    const abcProducts = await get("SELECT COUNT(*) AS cnt FROM products WHERE product_code LIKE 'ABC-PROD-%'");
    const abcGrns = await get("SELECT COUNT(*) AS cnt FROM grn WHERE grn_no LIKE 'GRN-ABC-TEST-%'");
    const abcGrnItems = await get(
      "SELECT COUNT(*) AS cnt FROM grn_items gi JOIN grn g ON g.grn_id = gi.grn_id WHERE g.grn_no LIKE 'GRN-ABC-TEST-%'"
    );
    const abcBatches = await get(
      "SELECT COUNT(*) AS cnt FROM inventory_batches b JOIN products p ON p.product_id=b.product_id WHERE p.product_code LIKE 'ABC-PROD-%' AND b.source_type='GRN'"
    );
    const abcTotalQty = await get("SELECT SUM(quantity) AS total_qty FROM products WHERE product_code LIKE 'ABC-PROD-%'");

    console.log('Preview DB created at:', dbPath);
    console.log({
      abc_products: abcProducts.cnt,
      abc_grns: abcGrns.cnt,
      abc_grn_items: abcGrnItems.cnt,
      abc_batches: abcBatches.cnt,
      abc_total_qty_pcs: abcTotalQty.total_qty,
    });
  } finally {
    db.close();
  }
}

main().catch((e) => {
  console.error('Preview init failed:', e);
  process.exitCode = 1;
});
