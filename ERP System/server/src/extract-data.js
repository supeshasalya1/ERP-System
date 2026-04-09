const fs = require('fs');
const path = require('path');

const shopSqlPath = path.resolve(__dirname, 'shop.sql');
const dataSqlPath = path.resolve(__dirname, 'data-sqlite.sql');

const content = fs.readFileSync(shopSqlPath, 'utf8');
const lines = content.split('\n');

let capturing = false;
let buffer = '';
let inserts = [];

for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('INSERT INTO')) {
        capturing = true;
        buffer = line;
    } else if (capturing) {
        buffer += '\n' + line;
    }

    if (capturing && trimmed.endsWith(';')) {
        inserts.push(buffer);
        capturing = false;
        buffer = '';
    }
}

fs.writeFileSync(dataSqlPath, inserts.join('\n\n'));
console.log(`Extracted ${inserts.length} INSERT statements.`);
