const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'shop.sqlite');
const schemaPath = path.resolve(__dirname, 'schema-sqlite.sql');
const dataPath = path.resolve(__dirname, 'data-sqlite.sql');

// Delete existing DB if any (fresh start)
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Deleted existing database.');
}

const db = new sqlite3.Database(dbPath);

const runScript = (scriptPath) => {
    return new Promise((resolve, reject) => {
        const sql = fs.readFileSync(scriptPath, 'utf8');
        // Split by semicolon, but be careful about semicolons in strings.
        // Simple split might fail if strings contain semicolons.
        // However, for schema it's usually fine. For data, it might be an issue if text contains ';'.
        // Let's try to execute the whole script if sqlite3 supports it.
        // sqlite3 `exec` runs multiple statements.

        db.exec(sql, (err) => {
            if (err) {
                console.error(`Error executing ${scriptPath}:`, err);
                reject(err);
            } else {
                console.log(`Executed ${scriptPath} successfully.`);
                resolve();
            }
        });
    });
};

db.serialize(async () => {
    try {
        await runScript(schemaPath);
        if (fs.existsSync(dataPath)) {
            await runScript(dataPath);
        }
        console.log('Database initialized successfully.');
    } catch (err) {
        console.error('Initialization failed:', err);
    } finally {
        db.close();
    }
});
