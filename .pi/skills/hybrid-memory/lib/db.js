/**
 * Database layer for Hybrid Memory
 * SQLite with FTS5 for full-text search
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.HYBRID_MEMORY_DB_PATH || '/job/data/hybrid-memory.db';

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database connection
const db = new sqlite3.Database(DB_PATH);

/**
 * Run SQL with promise
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Get single row with promise
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Get all rows with promise
 */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Initialize database schema
 */
async function initializeSchema() {
  // Enable WAL mode for better concurrency
  await run('PRAGMA journal_mode = WAL');
  await run('PRAGMA synchronous = NORMAL');
  
  // Main memories table
  await run(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      embedding BLOB,
      tags TEXT,
      source TEXT,
      metadata TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  
  await run(`CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories(tags)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at)`);

  // FTS5 virtual table for full-text search
  try {
    await run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        content,
        tags,
        source,
        content_rowid UNINDEXED,
        tokenize='porter unicode61'
      )
    `);
  } catch (e) {
    // FTS5 might not be available, create regular table as fallback
    console.warn('Warning: FTS5 not available, using fallback search');
    await run(`
      CREATE TABLE IF NOT EXISTS memories_fts (
        rowid INTEGER PRIMARY KEY,
        content TEXT,
        tags TEXT,
        source TEXT
      )
    `);
  }

  // Embedding cache table
  await run(`
    CREATE TABLE IF NOT EXISTS embedding_cache (
      content_hash TEXT PRIMARY KEY,
      embedding BLOB NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_cache_created ON embedding_cache(created_at)`);

  // Check if triggers exist
  const triggers = await all(`
    SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'memories_%_fts'
  `);
  
  if (triggers.length === 0) {
    try {
      // Triggers to keep FTS index in sync
      await run(`
        CREATE TRIGGER IF NOT EXISTS memories_insert_fts 
        AFTER INSERT ON memories
        BEGIN
          INSERT INTO memories_fts(rowid, content, tags, source)
          VALUES (NEW.rowid, NEW.content, NEW.tags, NEW.source);
        END
      `);
      
      await run(`
        CREATE TRIGGER IF NOT EXISTS memories_delete_fts 
        AFTER DELETE ON memories
        BEGIN
          DELETE FROM memories_fts WHERE rowid = OLD.rowid;
        END
      `);
      
      await run(`
        CREATE TRIGGER IF NOT EXISTS memories_update_fts 
        AFTER UPDATE ON memories
        BEGIN
          UPDATE memories_fts SET 
            content = NEW.content,
            tags = NEW.tags,
            source = NEW.source
          WHERE rowid = NEW.rowid;
        END
      `);
    } catch (e) {
      // FTS5 triggers may fail if using fallback
    }
  }

  return true;
}

// Initialize on module load
initializeSchema().catch(err => {
  console.error('Schema initialization error:', err);
});

module.exports = {
  db,
  DB_PATH,
  run,
  get,
  all,
  initializeSchema
};
