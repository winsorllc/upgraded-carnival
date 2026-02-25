/**
 * Memory Storage
 * CRUD operations for memories
 */

const { run, get, all } = require('./db');
const { generateEmbedding, embeddingToBuffer } = require('./embeddings');
const { chunkText } = require('./chunker');
const crypto = require('crypto');

/**
 * Generate unique ID
 */
function generateId() {
  return `mem_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Store a memory
 */
async function storeMemory(content, options = {}) {
  const id = options.id || generateId();
  const tags = options.tags || [];
  const source = options.source || 'manual';
  const metadata = options.metadata || {};
  
  // Generate embedding
  const embedding = await generateEmbedding(content);
  const embeddingBuffer = embeddingToBuffer(embedding);
  
  const tagsString = Array.isArray(tags) ? tags.join(',') : tags;
  const metadataString = JSON.stringify(metadata);
  
  try {
    // Check if ID exists
    const existing = await get('SELECT id FROM memories WHERE id = ?', [id]);
    
    if (existing) {
      await run(
        'UPDATE memories SET content = ?, embedding = ?, tags = ?, source = ?, metadata = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?',
        [content, embeddingBuffer, tagsString, source, metadataString, id]
      );
    } else {
      await run(
        'INSERT INTO memories (id, content, embedding, tags, source, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, strftime(\'%s\', \'now\'), strftime(\'%s\', \'now\'))',
        [id, content, embeddingBuffer, tagsString, source, metadataString]
      );
    }
    
    return {
      id,
      content,
      tags: Array.isArray(tags) ? tags : tags.split(',').filter(Boolean),
      source,
      metadata,
      created: !existing
    };
  } catch (error) {
    console.error('Error storing memory:', error.message);
    throw error;
  }
}

/**
 * Store multiple memories (batch)
 */
async function storeMemories(items) {
  const results = [];
  
  for (const item of items) {
    const result = await storeMemory(item.content, {
      id: item.id,
      tags: item.tags,
      source: item.source,
      metadata: item.metadata
    });
    results.push(result);
  }
  
  return results;
}

/**
 * Store memory from file
 * Automatically chunks large files
 */
async function storeFromFile(filePath, options = {}) {
  const fs = require('fs');
  const path = require('path');
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const source = options.source || path.basename(filePath);
  
  // Chunk if content is large
  const chunks = chunkText(content);
  
  if (chunks.length === 1) {
    // Single chunk - store as one memory
    return storeMemory(chunks[0].fullContent, {
      ...options,
      source,
      metadata: {
        ...options.metadata,
        file: filePath,
        chunks: 1
      }
    });
  } else {
    // Multiple chunks - store each with reference
    const baseId = generateId();
    const results = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const result = await storeMemory(chunk.fullContent, {
        ...options,
        id: `${baseId}_${i}`,
        source,
        metadata: {
          ...options.metadata,
          file: filePath,
          chunkIndex: i,
          totalChunks: chunks.length,
          charCount: chunk.charCount,
          wordCount: chunk.wordCount
        }
      });
      results.push(result);
    }
    
    return {
      batchId: baseId,
      chunks: results.length,
      results
    };
  }
}

/**
 * Delete a memory
 */
async function deleteMemory(id) {
  const result = await run('DELETE FROM memories WHERE id = ?', [id]);
  return result.changes > 0;
}

/**
 * Get memory by ID
 */
async function getMemory(id) {
  const row = await get('SELECT * FROM memories WHERE id = ?', [id]);
  if (!row) return null;
  
  return {
    id: row.id,
    content: row.content,
    tags: row.tags ? row.tags.split(',') : [],
    source: row.source,
    metadata: row.metadata ? JSON.parse(row.metadata) : {},
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000)
  };
}

/**
 * List memories with pagination
 */
async function listMemories(options = {}) {
  const limit = options.limit || 20;
  const offset = options.offset || 0;
  
  const rows = await all(
    'SELECT id, content, tags, source, metadata, created_at FROM memories ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  
  return rows.map(row => ({
    id: row.id,
    content: row.content.slice(0, 200) + (row.content.length > 200 ? '...' : ''),
    tags: row.tags ? row.tags.split(',') : [],
    source: row.source,
    metadata: row.metadata ? JSON.parse(row.metadata) : {},
    createdAt: new Date(row.created_at * 1000)
  }));
}

/**
 * Get database statistics
 */
async function getStats() {
  const memCount = await get('SELECT COUNT(*) as count FROM memories');
  const cacheCount = await get('SELECT COUNT(*) as count FROM embedding_cache');
  const ftsCount = await get('SELECT COUNT(*) as count FROM memories_fts');
  
  // Database file size
  const fs = require('fs');
  const path = require('path');
  const { DB_PATH } = require('./db');
  const dbSize = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0;
  
  return {
    memories: memCount.count,
    embeddingsCached: cacheCount.count,
    ftsIndexed: ftsCount.count,
    dbSizeBytes: dbSize,
    dbSizeFormatted: formatBytes(dbSize)
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Export memories to various formats
 */
async function exportMemories(format = 'json') {
  const rows = await all('SELECT * FROM memories ORDER BY created_at DESC');
  
  const memories = rows.map(row => ({
    id: row.id,
    content: row.content,
    tags: row.tags ? row.tags.split(',') : [],
    source: row.source,
    metadata: row.metadata ? JSON.parse(row.metadata) : {},
    createdAt: new Date(row.created_at * 1000).toISOString(),
    updatedAt: new Date(row.updated_at * 1000).toISOString()
  }));
  
  if (format === 'json') {
    return JSON.stringify(memories, null, 2);
  } else if (format === 'markdown') {
    return memories.map(m => {
      const tags = m.tags.length > 0 ? `\n*Tags: ${m.tags.join(', ')}*` : '';
      const source = m.source ? `\n*Source: ${m.source}*` : '';
      return `## ${m.id}${tags}${source}\n\n${m.content}\n\n---\n`;
    }).join('\n');
  }
  
  return memories;
}

module.exports = {
  storeMemory,
  storeMemories,
  storeFromFile,
  deleteMemory,
  getMemory,
  listMemories,
  getStats,
  exportMemories,
  generateId
};
