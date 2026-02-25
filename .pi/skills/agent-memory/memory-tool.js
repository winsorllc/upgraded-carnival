#!/usr/bin/env node

/**
 * Agent Memory Tool - Persistent long-term memory for the agent
 * 
 * Provides memory_store and memory_recall capabilities using SQLite
 * 
 * Usage:
 *   node memory-tool.js store <key> <content> [category]
 *   node memory-tool.js recall <query> [limit]
 *   node memory-tool.js list [category] [limit]
 *   node memory-tool.js delete <key>
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const MEMORY_DB_PATH = process.env.MEMORY_DB_PATH || '/job/data/memory.sqlite';

// Ensure data directory exists
const dbDir = path.dirname(MEMORY_DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(MEMORY_DB_PATH);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'core',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_memories_key ON memories(key);
  CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
`);

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  switch (command) {
    case 'store':
      await handleStore(args);
      break;
    case 'recall':
      await handleRecall(args);
      break;
    case 'list':
      await handleList(args);
      break;
    case 'delete':
      await handleDelete(args);
      break;
    default:
      console.error('Unknown command:', command);
      console.error('Usage:');
      console.error('  node memory-tool.js store <key> <content> [category]');
      console.error('  node memory-tool.js recall <query> [limit]');
      console.error('  node memory-tool.js list [category] [limit]');
      console.error('  node memory-tool.js delete <key>');
      process.exit(1);
  }
}

function handleStore(args) {
  if (args.length < 2) {
    console.error('Error: key and content required');
    console.error('Usage: node memory-tool.js store <key> <content> [category]');
    console.error('       node memory-tool.js store <key> --category <category> <content>');
    process.exit(1);
  }
  
  const validCategories = ['core', 'daily', 'conversation'];
  
  let category = 'core';
  let content;
  let key;
  
  // Check if category is specified with --category flag
  const categoryIndex = args.indexOf('--category');
  if (categoryIndex !== -1 && categoryIndex < args.length - 1) {
    // Use --category flag: store key --category category content
    key = args[0];
    const cat = args[categoryIndex + 1];
    category = validCategories.includes(cat) ? cat : 'core';
    // Content is everything after the category value
    content = args.slice(categoryIndex + 2).join(' ');
  } else {
    // Check if last argument is a valid category (positional syntax)
    const lastArg = args[args.length - 1];
    const secondLastArg = args[args.length - 2];
    
    if (validCategories.includes(lastArg) && args.length >= 3 && secondLastArg !== '') {
      // Positional category: store key content category
      category = lastArg;
      key = args[0];
      content = args.slice(1, args.length - 1).join(' ');
    } else {
      // No category specified
      key = args[0];
      content = args.slice(1).join(' ');
    }
  }
  
  try {
    const stmt = db.prepare(`
      INSERT INTO memories (key, content, category, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        content = excluded.content,
        category = excluded.category,
        updated_at = CURRENT_TIMESTAMP
    `);
    
    stmt.run(key, content, category);
    console.log(JSON.stringify({
      success: true,
      message: `Stored memory: ${key} (${category})`
    }));
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message
    }));
    process.exit(1);
  }
}

function handleRecall(args) {
  const query = args[0] || '';
  const limit = parseInt(args[1]) || 5;
  
  try {
    // Simple LIKE search for now
    const stmt = db.prepare(`
      SELECT key, content, category, created_at, updated_at,
             CASE 
               WHEN key LIKE ? THEN 100
               WHEN content LIKE ? THEN 50
               ELSE 10
             END as score
      FROM memories
      WHERE key LIKE ? OR content LIKE ?
      ORDER BY score DESC, updated_at DESC
      LIMIT ?
    `);
    
    const searchPattern = `%${query}%`;
    const results = stmt.all(searchPattern, searchPattern, searchPattern, searchPattern, limit);
    
    if (results.length === 0) {
      console.log(JSON.stringify({
        success: true,
        results: [],
        message: 'No memories found matching that query.'
      }));
    } else {
      console.log(JSON.stringify({
        success: true,
        results: results.map(r => ({
          key: r.key,
          content: r.content,
          category: r.category,
          created_at: r.created_at,
          updated_at: r.updated_at
        })),
        message: `Found ${results.length} memories:`
      }));
    }
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message
    }));
    process.exit(1);
  }
}

function handleList(args) {
  const category = args[0] || null;
  const limit = parseInt(args[1]) || 20;
  
  try {
    let results;
    if (category) {
      const stmt = db.prepare(`
        SELECT key, content, category, created_at, updated_at
        FROM memories
        WHERE category = ?
        ORDER BY updated_at DESC
        LIMIT ?
      `);
      results = stmt.all(category, limit);
    } else {
      const stmt = db.prepare(`
        SELECT key, content, category, created_at, updated_at
        FROM memories
        ORDER BY updated_at DESC
        LIMIT ?
      `);
      results = stmt.all(limit);
    }
    
    console.log(JSON.stringify({
      success: true,
      results: results.map(r => ({
        key: r.key,
        content: r.content,
        category: r.category,
        created_at: r.created_at,
        updated_at: r.updated_at
      })),
      count: results.length
    }));
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message
    }));
    process.exit(1);
  }
}

function handleDelete(args) {
  const key = args[0];
  
  if (!key) {
    console.error('Error: key required');
    console.error('Usage: node memory-tool.js delete <key>');
    process.exit(1);
  }
  
  try {
    const stmt = db.prepare('DELETE FROM memories WHERE key = ?');
    const result = stmt.run(key);
    
    if (result.changes === 0) {
      console.log(JSON.stringify({
        success: false,
        error: `No memory found with key: ${key}`
      }));
    } else {
      console.log(JSON.stringify({
        success: true,
        message: `Deleted memory: ${key}`
      }));
    }
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message
    }));
    process.exit(1);
  }
}

main().catch(error => {
  console.error(JSON.stringify({
    success: false,
    error: error.message
  }));
  process.exit(1);
});
