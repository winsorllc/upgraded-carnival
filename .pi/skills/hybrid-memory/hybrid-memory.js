#!/usr/bin/env node

/**
 * Hybrid Memory Search
 * Combines vector embeddings with keyword (BM25) search for comprehensive retrieval
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const DB_PATH = path.join(os.homedir(), '.thepopebot', 'hybrid-memory.db');
const EMBEDDINGS_DIMENSION = 1536; // OpenAI ada-002 dimension

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize database with tables
function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      embedding BLOB,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
      content,
      content='memories',
      content_rowid='id'
    );

    CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
      INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
      INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
    END;
  `);
}

// Get OpenAI embedding
async function getEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set');
  }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      input: text,
      model: 'text-embedding-ada-002'
    });

    const url = new URL('https://api.openai.com/v1/embeddings');
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) {
            reject(new Error(json.error.message));
          } else {
            resolve(json.data[0].embedding);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Cosine similarity between two vectors
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// BM25 scoring (simplified)
function bm25Score(ftsResults, query, k1 = 1.5, b = 0.75) {
  // BM25 is handled by SQLite FTS5, we just normalize the rank
  return ftsResults.map(row => ({ ...row, bm25: -row.rank }));
}

// Store a memory
async function store(content) {
  let embedding = null;
  try {
    embedding = await getEmbedding(content);
  } catch (e) {
    console.error('Warning: Could not generate embedding:', e.message);
  }

  const stmt = db.prepare('INSERT INTO memories (content, embedding) VALUES (?, ?)');
  const result = stmt.run(content, embedding ? Buffer.from(JSON.stringify(embedding)) : null);
  
  console.log(`Stored memory #${result.lastInsertRowid}: ${content.substring(0, 50)}...`);
  return result.lastInsertRowid;
}

// Hybrid search
async function search(query, vectorWeight = 0.7, keywordWeight = 0.3, limit = 10) {
  let embedding = null;
  try {
    embedding = await getEmbedding(query);
  } catch (e) {
    console.error('Warning: Could not generate embedding, falling back to keyword only');
    return searchKeyword(query, limit);
  }

  // Get keyword results - FTS5 match query
  const keywordResults = db.prepare(`
    SELECT memories.id, memories.content, memories_fts.rank as fts_rank 
    FROM memories_fts 
    JOIN memories ON memories_fts.rowid = memories.id
    WHERE memories_fts MATCH ?
    ORDER BY memories_fts.rank LIMIT ?
  `).all(query, limit);

  // Get vector results
  const allMemories = db.prepare('SELECT id, content, embedding FROM memories').all();
  const vectorResults = allMemories
    .filter(m => m.embedding)
    .map(m => {
      const emb = JSON.parse(m.embedding.toString());
      return {
        id: m.id,
        content: m.content,
        similarity: cosineSimilarity(embedding, emb)
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  // Normalize scores
  const maxFtsRank = Math.max(...keywordResults.map(r => r.fts_rank || 1), 1);
  const maxSim = Math.max(...vectorResults.map(r => r.similarity || 0), 0.001);

  // Build combined results map
  const combined = new Map();
  
  for (const r of keywordResults) {
    const normScore = 1 - (r.fts_rank / maxFtsRank);
    combined.set(r.id, {
      id: r.id,
      content: r.content,
      keywordScore: normScore,
      vectorScore: 0,
      combinedScore: normScore * keywordWeight
    });
  }

  for (const r of vectorResults) {
    const normScore = r.similarity / maxSim;
    if (combined.has(r.id)) {
      const existing = combined.get(r.id);
      existing.vectorScore = normScore;
      existing.combinedScore = (existing.keywordScore * keywordWeight) + (normScore * vectorWeight);
    } else {
      combined.set(r.id, {
        id: r.id,
        content: r.content,
        keywordScore: 0,
        vectorScore: normScore,
        combinedScore: normScore * vectorWeight
      });
    }
  }

  // Sort by combined score and return
  const results = Array.from(combined.values())
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, limit);

  return results;
}

// Keyword-only search
function searchKeyword(query, limit = 10) {
  const results = db.prepare(`
    SELECT memories.id, memories.content, memories_fts.rank as fts_rank 
    FROM memories_fts 
    JOIN memories ON memories_fts.rowid = memories.id
    WHERE memories_fts MATCH ?
    ORDER BY memories_fts.rank LIMIT ?
  `).all(query, limit);

  return results.map(r => ({
    id: r.id,
    content: r.content,
    keywordScore: 1 - (r.fts_rank / Math.max(...results.map(x => x.fts_rank || 1), 1)),
    vectorScore: 0,
    combinedScore: 0
  }));
}

// Vector-only search
async function searchVector(query, limit = 10) {
  let embedding = null;
  try {
    embedding = await getEmbedding(query);
  } catch (e) {
    console.error('Error: Could not generate embedding');
    return [];
  }

  const allMemories = db.prepare('SELECT id, content, embedding FROM memories').all();
  
  const results = allMemories
    .filter(m => m.embedding)
    .map(m => {
      const emb = JSON.parse(m.embedding.toString());
      return {
        id: m.id,
        content: m.content,
        vectorScore: cosineSimilarity(embedding, emb),
        keywordScore: 0,
        combinedScore: 0
      };
    })
    .sort((a, b) => b.vectorScore - a.vectorScore)
    .slice(0, limit);

  return results;
}

// List all memories
function list(limit = 50) {
  const memories = db.prepare(`
    SELECT id, content, created_at 
    FROM memories 
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(limit);

  return memories;
}

// Delete a memory
function deleteMemory(id) {
  const stmt = db.prepare('DELETE FROM memories WHERE id = ?');
  const result = stmt.run(id);
  console.log(`Deleted ${result.changes} memory(ies)`);
  return result.changes;
}

// Reindex (regenerate embeddings for memories without them)
async function reindex() {
  const memories = db.prepare('SELECT id, content FROM memories WHERE embedding IS NULL').all();
  
  console.log(`Reindexing ${memories.length} memories...`);
  
  for (const memory of memories) {
    try {
      const embedding = await getEmbedding(memory.content);
      db.prepare('UPDATE memories SET embedding = ? WHERE id = ?')
        .run(Buffer.from(JSON.stringify(embedding)), memory.id);
      console.log(`Indexed memory #${memory.id}`);
    } catch (e) {
      console.error(`Failed to index memory #${memory.id}:`, e.message);
    }
  }
  
  console.log('Reindex complete');
}

// Main CLI
async function main() {
  initDB();

  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case 'store': {
        const content = args.join(' ');
        if (!content) {
          console.error('Usage: hybrid-memory.js store <content>');
          process.exit(1);
        }
        await store(content);
        break;
      }

      case 'search': {
        const query = args.join(' ');
        if (!query) {
          console.error('Usage: hybrid-memory.js search <query>');
          process.exit(1);
        }
        const results = await search(query);
        console.log(JSON.stringify(results, null, 2));
        break;
      }

      case 'search-vector': {
        const query = args.join(' ');
        if (!query) {
          console.error('Usage: hybrid-memory.js search-vector <query>');
          process.exit(1);
        }
        const results = await searchVector(query);
        console.log(JSON.stringify(results, null, 2));
        break;
      }

      case 'search-keyword': {
        const query = args.join(' ');
        if (!query) {
          console.error('Usage: hybrid-memory.js search-keyword <query>');
          process.exit(1);
        }
        const results = searchKeyword(query);
        console.log(JSON.stringify(results, null, 2));
        break;
      }

      case 'list': {
        const results = list();
        console.log(JSON.stringify(results, null, 2));
        break;
      }

      case 'delete': {
        const id = parseInt(args[0]);
        if (isNaN(id)) {
          console.error('Usage: hybrid-memory.js delete <id>');
          process.exit(1);
        }
        deleteMemory(id);
        break;
      }

      case 'reindex': {
        await reindex();
        break;
      }

      default:
        console.log(`
Hybrid Memory Search - CLI

Commands:
  store <content>           Store a new memory
  search <query>           Hybrid search (vector + keyword)
  search-vector <query>    Vector similarity search only
  search-keyword <query>  Keyword (FTS) search only
  list                     List all memories
  delete <id>              Delete a memory by ID
  reindex                  Rebuild embeddings for unindexed memories

Options:
  --vector-weight <n>      Weight for vector similarity (0-1), default: 0.7
  --keyword-weight <n>     Weight for keyword scoring (0-1), default: 0.3
  --limit <n>              Maximum results, default: 10

Examples:
  hybrid-memory.js store "user prefers dark theme"
  hybrid-memory.js search "theme preference"
  hybrid-memory.js search-keyword "dark"
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
