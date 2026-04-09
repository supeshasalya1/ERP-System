const db = require('./db');

async function main() {
  const [[supplier1Products]] = await db.query(
    'SELECT COUNT(*) AS cnt FROM products WHERE supplier_id = 1'
  );

  const [[abcProducts]] = await db.query(
    "SELECT COUNT(*) AS cnt FROM products WHERE product_code LIKE 'ABC-PROD-%'"
  );

  const [[abcGrns]] = await db.query(
    "SELECT COUNT(*) AS cnt FROM grn WHERE grn_no LIKE 'GRN-ABC-TEST-%'"
  );

  const [[abcGrnItems]] = await db.query(
    `SELECT COUNT(*) AS cnt
       FROM grn_items gi
       JOIN grn g ON g.grn_id = gi.grn_id
      WHERE g.grn_no LIKE 'GRN-ABC-TEST-%'`
  );

  const [[abcTotalQty]] = await db.query(
    "SELECT SUM(quantity) AS total_qty FROM products WHERE product_code LIKE 'ABC-PROD-%'"
  );

  const [[abcBatchCount]] = await db.query(
    `SELECT COUNT(*) AS cnt
       FROM inventory_batches b
       JOIN products p ON p.product_id = b.product_id
      WHERE p.product_code LIKE 'ABC-PROD-%'
        AND b.source_type = 'GRN'`
  );

  console.log({
    supplier1_products: supplier1Products.cnt,
    abc_products: abcProducts.cnt,
    abc_grns: abcGrns.cnt,
    abc_grn_items: abcGrnItems.cnt,
    abc_batches: abcBatchCount.cnt,
    abc_total_qty_pcs: abcTotalQty.total_qty,
  });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
