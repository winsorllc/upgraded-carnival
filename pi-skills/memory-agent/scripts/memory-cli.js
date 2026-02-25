#!/usr/bin/env node

/**
 * Memory Agent - Store memories in SQLite
 * Usage: node memory-store.js [store|search|list|delete] [args...]
 */

const path = require('path');
const fs = require('fs');

// Database path
const MEMORY_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '/root', '.thepopebot');
const DB_PATH = path.join(MEMORY_DIR, 'memory.db');

// Ensure directory exists
if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
}

// Initialize SQLite
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
} catch (e) {
  console.error('Error: better-sqlite3 not installed. Run: npm install better-sqlite3');
  process.exit(1);
}

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    source TEXT DEFAULT 'chat',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Simple full-text search using LIKE (no embeddings needed for MVP)
function storeMemory(content, source = 'chat') {
  const stmt = db.prepare('INSERT INTO memories (content, source) VALUES (?, ?)');
  const result = stmt.run(content, source);
  return result.lastInsertRowid;
}

function searchMemories(query, limit = 10) {
  // Use LIKE for simple search (case-insensitive)
  const stmt = db.prepare(`
    SELECT id, content, source, created_at
    FROM memories
    WHERE content LIKE ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(`%${query}%`, limit);
}

function listMemories(limit = 50) {
  const stmt = db.prepare(`
    SELECT id, content, source, created_at
    FROM memories
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

function deleteMemory(id) {
  const stmt = db.prepare('DELETE FROM memories WHERE id = ?');
  const result = stmt.run(id);
  return result.changes;
}

// CLI handling
const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'store': {
    const content = args.join(' ');
    if (!content) {
      console.error('Usage: memory-store.js store "memory content" [source]');
      process.exit(1);
    }
    const source = args[1] || 'chat';
    const id = storeMemory(content, source);
    console.log(`Stored memory #${id}: ${content.substring(0, 50)}...`);
    break;
  }
  
  case 'search': {
    const query = args.join(' ');
    if (!query) {
      console.error('Usage: memory-search.js "search query"');
      process.exit(1);
    }
    const results = searchMemories(query);
    if (results.length === 0) {
      console.log('No memories found matching query.');
    } else {
      results.forEach(r => {
        console.log(`[${r.id}] ${r.created_at} (${r.source})`);
        console.log(`  ${r.content}`);
        console.log();
      });
    }
    break;
  }
  
  case 'list': {
    const memories = listMemories();
    if (memories.length === 0) {
      console.log('No memories stored yet.');
    } else {
      memories.forEach(r => {
        console.log(`[${r.id}] ${r.created_at} (${r.source})`);
        console.log(`  ${r.content}`);
        console.log();
      });
    }
    break;
  }
  
  case 'delete': {
    const id = parseInt(args[0], 10);
    if (isNaN(id)) {
      console.error('Usage: memory-delete.js <id>');
      process.exit(1);
    }
    const changes = deleteMemory(id);
    if (changes > 0) {
      console.log(`Deleted memory #${id}`);
    } else {
      console.log(`Memory #${id} not found`);
    }
    break;
  }
  
  default:
    console.log(`
Memory Agent - SQLite-based persistent memory

Usage:
  memory-cli.js store "content" [source]  - Store a memory
  memory-cli.js search "query"            - Search memories
  memory-cli.js list                      - List all memories  
  memory-cli.js delete <id>              - Delete a memory

Database: ${DB_PATH}
`);
    process.exit(1);
}

// Close database
db.close();
