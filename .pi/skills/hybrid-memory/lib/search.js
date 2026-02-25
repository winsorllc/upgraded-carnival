/**
 * Search Engine
 * Vector, keyword (BM25), and hybrid search implementations
 */

const { all, get } = require('./db');
const { generateEmbedding, bufferToEmbedding, EMBEDDING_DIM } = require('./embeddings');

const VECTOR_WEIGHT = parseFloat(process.env.HYBRID_VECTOR_WEIGHT || '0.7');
const KEYWORD_WEIGHT = parseFloat(process.env.HYBRID_KEYWORD_WEIGHT || '0.3');

/**
 * Calculate cosine similarity between two embeddings
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Serialize embedding for comparison
 */
function serializeEmbedding(embedding) {
  return Buffer.from(embedding.buffer);
}

/**
 * Vector search using cosine similarity
 */
async function vectorSearch(query, options = {}) {
  const limit = options.limit || 10;
  const threshold = options.threshold || 0;
  
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  
  // Get all memories with embeddings
  const rows = await all('SELECT id, content, embedding, tags, source, metadata, created_at FROM memories WHERE embedding IS NOT NULL');
  
  const results = [];
  
  for (const row of rows) {
    const rowEmbedding = bufferToEmbedding(row.embedding);
    if (!rowEmbedding) continue;
    
    const similarity = cosineSimilarity(queryEmbedding, rowEmbedding);
    
    if (similarity >= threshold) {
      results.push({
        id: row.id,
        content: row.content,
        tags: row.tags ? row.tags.split(',') : [],
        source: row.source,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        createdAt: new Date(row.created_at * 1000),
        scores: {
          vector: similarity,
          normalized: similarity
        }
      });
    }
  }
  
  // Sort by similarity descending
  results.sort((a, b) => b.scores.vector - a.scores.vector);
  
  return results.slice(0, limit);
}

/**
 * Keyword search using SQLite FTS5 BM25
 */
async function keywordSearch(query, options = {}) {
  const limit = options.limit || 10;
  
  // Clean query for FTS5
  const cleanQuery = query
    .replace(/["']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!cleanQuery) {
    return [];
  }
  
  try {
    const results = await all(`
      SELECT m.id, m.content, m.tags, m.source, m.metadata, m.created_at,
             rank as keyword_score
      FROM memories_fts fts
      JOIN memories m ON fts.rowid = m.rowid
      WHERE memories_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `, [cleanQuery, limit]);
    
    return results.map(r => {
      // BM25 rank is lower is better, convert to 0-1 score
      const score = Math.max(0, 1 - (Math.abs(r.keyword_score) / 10));
      
      return {
        id: r.id,
        content: r.content,
        tags: r.tags ? r.tags.split(',') : [],
        source: r.source,
        metadata: r.metadata ? JSON.parse(r.metadata) : {},
        createdAt: new Date(r.created_at * 1000),
        scores: {
          keyword: r.keyword_score,
          normalized: score
        }
      };
    });
  } catch (error) {
    console.error('Keyword search error:', error.message);
    return [];
  }
}

/**
 * Hybrid search combining vector and keyword scores
 */
async function hybridSearch(query, options = {}) {
  const limit = options.limit || 10;
  const threshold = options.threshold || 0;
  const vectorWeight = options.vectorWeight || VECTOR_WEIGHT;
  const keywordWeight = options.keywordWeight || KEYWORD_WEIGHT;
  
  // Run both searches
  const [vectorResults, keywordResults] = await Promise.all([
    vectorSearch(query, { limit: limit * 3 }),
    keywordSearch(query, { limit: limit * 3 })
  ]);
  
  // Create maps for merging
  const resultMap = new Map();
  
  // Add vector results
  for (const r of vectorResults) {
    resultMap.set(r.id, {
      ...r,
      vectorScore: r.scores.vector,
      keywordScore: 0
    });
  }
  
  // Add/merge keyword results
  for (const r of keywordResults) {
    if (resultMap.has(r.id)) {
      const existing = resultMap.get(r.id);
      existing.keywordScore = r.scores.normalized;
    } else {
      resultMap.set(r.id, {
        ...r,
        vectorScore: 0,
        keywordScore: r.scores.normalized
      });
    }
  }
  
  // Calculate hybrid scores
  const results = Array.from(resultMap.values()).map(r => {
    const vxScore = r.vectorScore || 0;
    const kwScore = r.keywordScore || 0;
    
    // Normalize scores
    const vxNorm = Math.max(0, Math.min(1, vxScore));
    const kwNorm = Math.max(0, Math.min(1, kwScore));
    
    // Weighted combination
    const hybridScore = (vectorWeight * vxNorm) + (keywordWeight * kwNorm);
    
    return {
      ...r,
      scores: {
        vector: vxNorm,
        keyword: kwNorm,
        hybrid: hybridScore
      }
    };
  });
  
  // Sort by hybrid score and filter
  return results
    .sort((a, b) => b.scores.hybrid - a.scores.hybrid)
    .filter(r => r.scores.hybrid >= threshold)
    .slice(0, limit);
}

/**
 * Recall - Get most relevant memories for a context
 * Optimized for quick context retrieval
 */
async function recall(query, options = {}) {
  const topK = options.topK || 5;
  const threshold = options.threshold || 0.6;
  
  return hybridSearch(query, {
    limit: topK,
    threshold: threshold
  });
}

/**
 * Get memory by ID
 */
async function getById(id) {
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

module.exports = {
  vectorSearch,
  keywordSearch,
  hybridSearch,
  recall,
  getById
};
