const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'shop.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
    ensureSessionTokenColumn();
    ensureUnloadNoteNullableIssueId();
  }
});

function ensureSessionTokenColumn() {
  db.all("PRAGMA table_info(users)", (pragmaErr, columns) => {
    if (pragmaErr) {
      console.error("Failed to inspect users table schema:", pragmaErr);
      return;
    }

    const hasSessionToken = Array.isArray(columns)
      ? columns.some((column) => column.name === "session_token")
      : false;

    if (!hasSessionToken) {
      db.run("ALTER TABLE users ADD COLUMN session_token TEXT", (alterErr) => {
        if (alterErr) {
          console.error("Failed to add session_token column:", alterErr);
        } else {
          console.log("Added session_token column to users table.");
        }
      });
    }
  });
}

function ensureUnloadNoteNullableIssueId() {
  db.all("PRAGMA table_info(unload_note)", (pragmaErr, columns) => {
    if (pragmaErr) {
      // Table might not exist yet during init scripts; don't spam logs.
      return;
    }

    const issueCol = Array.isArray(columns)
      ? columns.find((column) => column.name === "issue_id")
      : null;

    // If column is missing or already nullable, nothing to do.
    // PRAGMA table_info: notnull = 1 means NOT NULL constraint.
    if (!issueCol || issueCol.notnull !== 1) return;

    console.log("Migrating unload_note.issue_id to be nullable...");

    const migrationSql = `
      PRAGMA foreign_keys=OFF;
      BEGIN TRANSACTION;

      CREATE TABLE IF NOT EXISTS unload_note_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unload_no TEXT NOT NULL UNIQUE,
        unload_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        issue_id INTEGER,
        lorry_id INTEGER NOT NULL,
        created_by INTEGER NOT NULL,
        remarks TEXT,
        FOREIGN KEY (issue_id) REFERENCES issue_note (issue_id) ON UPDATE CASCADE,
        FOREIGN KEY (lorry_id) REFERENCES issue_lorries (lorry_id) ON UPDATE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users (user_id) ON UPDATE CASCADE
      );

      INSERT INTO unload_note_new (id, unload_no, unload_date, issue_id, lorry_id, created_by, remarks)
      SELECT id, unload_no, unload_date, issue_id, lorry_id, created_by, remarks
      FROM unload_note;

      DROP TABLE unload_note;
      ALTER TABLE unload_note_new RENAME TO unload_note;

      COMMIT;
      PRAGMA foreign_keys=ON;
    `;

    db.exec(migrationSql, (migrateErr) => {
      if (migrateErr) {
        console.error(
          "Failed to migrate unload_note.issue_id nullable:",
          migrateErr
        );
      } else {
        console.log("Migrated unload_note.issue_id successfully.");
      }
    });
  });
}

// Promisify helpers
const run = (sql, params) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const all = (sql, params) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

const get = (sql, params) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

// Wrapper to mimic mysql2 pool
const pool = {
  query: async (sql, params = []) => {
    // Normalize params: mysql2 allows undefined, sqlite3 might not like it?
    // sqlite3 handles nulls.
    
    const sqlTrimmed = sql.trim();
    const upperSql = sqlTrimmed.toUpperCase();

    // Heuristic to decide between run() and all()
    // SELECT, PRAGMA, WITH (CTE) -> all()
    // INSERT, UPDATE, DELETE, CREATE, DROP, ALTER -> run()
    
    if (upperSql.startsWith('SELECT') || upperSql.startsWith('PRAGMA') || upperSql.startsWith('WITH') || upperSql.startsWith('SHOW')) {
       // Handle SHOW COLUMNS mapping if not handled in app code yet, 
       // but ideally app code should be changed. 
       // For now, let's just run it and see. 
       // Note: SHOW COLUMNS will fail in SQLite unless we intercept it.
       // But the plan says "Update application code", so we might not need to intercept here if we fix the code.
       // However, for smoother transition, we could intercept.
       // Let's stick to basic wrapper for now.
       
       const rows = await all(sql, params);
       return [rows, []]; // fields are empty
    } else {
       const result = await run(sql, params);
       // mysql2 result object has insertId, affectedRows
       return [{
         insertId: result.lastID,
         affectedRows: result.changes,
         warningStatus: 0,
       }, []];
    }
  },
  getConnection: async () => {
    // Return an object that mimics a connection
    // Since SQLite is single-threaded/file, we just return the same interface
    // but with transaction methods.
    return {
      query: pool.query,
      beginTransaction: async () => { await run('BEGIN TRANSACTION'); },
      commit: async () => { await run('COMMIT'); },
      rollback: async () => { await run('ROLLBACK'); },
      release: () => {}, // No-op
    };
  },
  // Helper to close (not usually in pool but good to have)
  end: () => {
    db.close();
  }
};

module.exports = pool;
