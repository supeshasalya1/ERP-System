const db = require('./db');

async function test() {
    try {
        console.log('Testing database connection...');
        const [rows] = await db.query('SELECT * FROM users LIMIT 1');
        console.log('Users:', rows);

        const [products] = await db.query('SELECT * FROM products LIMIT 1');
        console.log('Products:', products);

        console.log('Testing PRAGMA table_info...');
        const [cols] = await db.query('PRAGMA table_info(products)');
        console.log('Product Columns:', cols.map(c => c.name));

        console.log('Success!');
    } catch (err) {
        console.error('Test failed:', err);
    }
}

test();
