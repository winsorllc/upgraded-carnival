/**
 * Indexer - Manages the SQLite database for code intelligence
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { parseFile, buildDependencyGraph } = require('./parser');

const DEFAULT_DB_PATH = '.code-intelligence/index.db';

/**
 * Initialize the database with required tables
 */
function initDatabase(dbPath = DEFAULT_DB_PATH) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) return reject(err);
      
      // Create tables
      db.exec(`
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY,
          path TEXT UNIQUE NOT NULL,
          language TEXT,
          line_count INTEGER,
          last_modified INTEGER,
          indexed_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS symbols (
          id INTEGER PRIMARY KEY,
          file_id INTEGER,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          line INTEGER,
          extra TEXT,
          FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS dependencies (
          id INTEGER PRIMARY KEY,
          from_file_id INTEGER,
          to_file_id INTEGER,
          import_source TEXT,
          line INTEGER,
          FOREIGN KEY (from_file_id) REFERENCES files(id) ON DELETE CASCADE,
          FOREIGN KEY (to_file_id) REFERENCES files(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS search_index (
          id INTEGER PRIMARY KEY,
          file_id INTEGER,
          symbol_id INTEGER,
          content TEXT,
          FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
          FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
        CREATE INDEX IF NOT EXISTS idx_symbols_type ON symbols(type);
        CREATE INDEX IF NOT EXISTS idx_symbols_file ON symbols(file_id);
        CREATE INDEX IF NOT EXISTS idx_deps_from ON dependencies(from_file_id);
        CREATE INDEX IF NOT EXISTS idx_deps_to ON dependencies(to_file_id);
        CREATE INDEX IF NOT EXISTS idx_search_content ON search_index(content);
      `, (err) => {
        if (err) return reject(err);
        resolve(db);
      });
    });
  });
}

/**
 * Index a single file
 */
async function indexFile(db, filePath, rootDir) {
  const stats = fs.statSync(filePath);
  const symbols = parseFile(filePath);
  
  if (!symbols || symbols.functions.length + symbols.classes.length === 0) {
    return null;
  }

  // Insert file record
  const fileId = await new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO files (path, language, line_count, last_modified) 
       VALUES (?, ?, ?, ?)`,
      [filePath, symbols.language, symbols.lineCount, Math.floor(stats.mtime.getTime() / 1000)],
      function(err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });

  // Clear existing symbols and dependencies for this file
  await new Promise((resolve, reject) => {
    db.run(`DELETE FROM symbols WHERE file_id = ?`, [fileId], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  await new Promise((resolve, reject) => {
    db.run(`DELETE FROM dependencies WHERE from_file_id = ?`, [fileId], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  // Insert symbols
  const insertSymbol = async (name, type, line, extra = null) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO symbols (file_id, name, type, line, extra) VALUES (?, ?, ?, ?, ?)`,
        [fileId, name, type, line, extra ? JSON.stringify(extra) : null],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  };

  // Index functions
  for (const fn of symbols.functions) {
    await insertSymbol(fn.name, 'function', fn.line, { signature: fn.signature });
  }

  // Index classes
  for (const cls of symbols.classes) {
    await insertSymbol(cls.name, 'class', cls.line, { 
      extends: cls.extends,
      implements: cls.implements 
    });
  }

  // Index exports
  for (const exp of symbols.exports) {
    await insertSymbol(exp.name, 'export', exp.line);
  }

  // Build and store dependency graph
  const graph = buildDependencyGraph(filePath, symbols, rootDir);
  
  for (const imp of graph.imports) {
    let toFileId = null;
    
    if (imp.resolved) {
      // Find the file ID
      const row = await new Promise((resolve) => {
        db.get(`SELECT id FROM files WHERE path = ?`, [imp.resolved], (err, row) => {
          resolve(row);
        });
      });
      if (row) toFileId = row.id;
    }

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO dependencies (from_file_id, to_file_id, import_source, line) VALUES (?, ?, ?, ?)`,
        [fileId, toFileId, imp.source, imp.line],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  return {
    fileId,
    functions: symbols.functions.length,
    classes: symbols.classes.length,
    imports: symbols.imports.length,
    exports: symbols.exports.length
  };
}

/**
 * Find dependants of a file
 */
async function findDependants(db, filePath) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT f.path, d.import_source, d.line
      FROM dependencies d
      JOIN files f ON d.from_file_id = f.id
      WHERE d.to_file_id = (SELECT id FROM files WHERE path = ?)
    `, [filePath], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
 * Find imports of a file
 */
async function findImports(db, filePath) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT COALESCE(f2.path, d.import_source) as path, d.line
      FROM dependencies d
      JOIN files f1 ON d.from_file_id = f1.id
      LEFT JOIN files f2 ON d.to_file_id = f2.id
      WHERE f1.path = ?
    `, [filePath], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
 * Search symbols by name
 */
async function searchSymbols(db, query, options = {}) {
  const { type, limit = 50 } = options;
  
  let sql = `
    SELECT s.*, f.path, f.language
    FROM symbols s
    JOIN files f ON s.file_id = f.id
    WHERE s.name LIKE ?
  `;
  const params = [`%${query}%`];
  
  if (type) {
    sql += ` AND s.type = ?`;
    params.push(type);
  }
  
  sql += ` ORDER BY s.name LIMIT ?`;
  params.push(limit);

  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
 * Get all files
 */
async function getAllFiles(db) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT f.*, COUNT(s.id) as symbol_count
      FROM files f
      LEFT JOIN symbols s ON f.id = s.file_id
      GROUP BY f.id
      ORDER BY f.path
    `, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
 * Get statistics
 */
async function getStats(db) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT 
        (SELECT COUNT(*) FROM files) as file_count,
        (SELECT COUNT(*) FROM symbols WHERE type = 'function') as function_count,
        (SELECT COUNT(*) FROM symbols WHERE type = 'class') as class_count,
        (SELECT COUNT(*) FROM dependencies) as dependency_count
    `, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

/**
 * Build dependency chain starting from a file
 */
async function buildDependencyChain(db, filePath, visited = new Set()) {
  if (visited.has(filePath)) return [];
  visited.add(filePath);
  
  const imports = await findImports(db, filePath);
  const chain = [];
  
  for (const imp of imports) {
    if (imp.path && !imp.path.includes('node_modules')) {
      chain.push({
        file: filePath,
        imports: imp.path,
        line: imp.line
      });
      
      // Recursively build chain
      const subChain = await buildDependencyChain(db, imp.path, visited);
      chain.push(...subChain);
    }
  }
  
  return chain;
}

/**
 * Close the database connection
 */
function closeDatabase(db) {
  return new Promise((resolve) => {
    db.close(() => resolve());
  });
}

module.exports = {
  initDatabase,
  indexFile,
  findDependants,
  findImports,
  searchSymbols,
  getAllFiles,
  getStats,
  buildDependencyChain,
  closeDatabase,
  DEFAULT_DB_PATH
};
