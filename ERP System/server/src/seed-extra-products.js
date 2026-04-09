const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'shop.sqlite');

const products = [
  { code: 'PROD-0002', name: 'Tikiri Mari 20pcs', brandId: 1, quantity: 0, supplierId: 1, defaultPackSize: 20 },
  { code: 'PROD-0003', name: 'Tikiri Mari 30pcs', brandId: 1, quantity: 0, supplierId: 1, defaultPackSize: 30 },
  { code: 'PROD-0004', name: 'Choco Puff 20pcs', brandId: 1, quantity: 0, supplierId: 1, defaultPackSize: 20 },
  { code: 'PROD-0005', name: 'Nice Biscuits 20pcs', brandId: 1, quantity: 0, supplierId: 1, defaultPackSize: 20 },
  { code: 'PROD-0006', name: 'Cream Cracker 30pcs', brandId: 1, quantity: 0, supplierId: 1, defaultPackSize: 30 },
  { code: 'PROD-0007', name: 'Kiri Packet 200ml (Box)', brandId: 2, quantity: 0, supplierId: 1, defaultPackSize: 24 },
  { code: 'PROD-0008', name: 'Kiri Packet 1L (Box)', brandId: 2, quantity: 0, supplierId: 1, defaultPackSize: 12 },
  { code: 'PROD-0009', name: 'Flavored Milk 200ml (Box)', brandId: 2, quantity: 0, supplierId: 1, defaultPackSize: 24 },
  { code: 'PROD-0010', name: 'Butter 100g (Pack)', brandId: 2, quantity: 0, supplierId: 1, defaultPackSize: 48 },
];

function run() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (openErr) => {
      if (openErr) {
        reject(openErr);
        return;
      }

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const stmt = db.prepare(
          `INSERT OR IGNORE INTO products (product_code, name, brand_id, quantity, supplier_id, default_pack_size)
           VALUES (?, ?, ?, ?, ?, ?)`
        );

        for (const p of products) {
          stmt.run([p.code, p.name, p.brandId, p.quantity, p.supplierId, p.defaultPackSize]);
        }

        stmt.finalize((finalizeErr) => {
          if (finalizeErr) {
            db.run('ROLLBACK', () => db.close());
            reject(finalizeErr);
            return;
          }

          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              db.run('ROLLBACK', () => db.close());
              reject(commitErr);
              return;
            }

            db.get('SELECT COUNT(*) AS cnt FROM products', (countErr, row) => {
              db.close();
              if (countErr) {
                reject(countErr);
                return;
              }
              resolve(row?.cnt);
            });
          });
        });
      });
    });
  });
}

run()
  .then((count) => {
    console.log(`Seeded extra products (if missing). Total products now: ${count}`);
  })
  .catch((err) => {
    console.error('Failed to seed extra products:', err);
    process.exitCode = 1;
  });
