/**
 * OpenAI Embeddings Client
 * Handles embedding generation with caching
 */

let OpenAI;
try {
  OpenAI = require('openai').OpenAI;
} catch (e) {
  OpenAI = null;
}

const crypto = require('crypto');
const { get, run } = require('./db');

// Only create client if API key exists
const openai = (OpenAI && process.env.OPENAI_API_KEY) ? 
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_DIM = 1536; // text-embedding-3-small

/**
 * Generate hash for content
 */
function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Get embedding from cache
 */
async function getCachedEmbedding(contentHash) {
  const row = await get('SELECT embedding FROM embedding_cache WHERE content_hash = ?', [contentHash]);
  if (row && row.embedding) {
    return Buffer.from(row.embedding);
  }
  return null;
}

/**
 * Store embedding in cache
 */
async function cacheEmbedding(contentHash, embedding) {
  const buffer = Buffer.from(embedding.buffer);
  await run(
    'INSERT OR REPLACE INTO embedding_cache (content_hash, embedding, created_at) VALUES (?, ?, strftime(\'%s\', \'now\'))',
    [contentHash, buffer]
  );
}

/**
 * Generate a mock embedding (for testing without API key)
 */
function generateMockEmbedding(text) {
  // Create a deterministic mock embedding based on hash of content
  // This simulates the 1536-dimensional embeddings from OpenAI
  const hash = hashContent(text);
  const embedding = new Float32Array(EMBEDDING_DIM);
  
  // Use hash to seed the embedding values
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    // Generate pseudo-random values between -1 and 1 based on hash
    const byteValue = parseInt(hash.slice((i % 32) * 2, (i % 32) * 2 + 2), 16) || 128;
    embedding[i] = (byteValue / 255) * 2 - 1;
  }
  
  // Normalize to unit length
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    norm += embedding[i] * embedding[i];
  }
  norm = Math.sqrt(norm);
  
  if (norm > 0) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      embedding[i] /= norm;
    }
  }
  
  return embedding;
}

/**
 * Generate embeddings for text(s)
 * @param {string|string[]} input - Text or array of texts
 * @returns {Promise<Float32Array[]>} - Array of embedding arrays
 */
async function generateEmbeddings(input) {
  const texts = Array.isArray(input) ? input : [input];
  
  if (texts.length === 0) {
    return [];
  }

  // Check cache first
  const results = [];
  const uncachedTexts = [];
  const uncachedIndices = [];
  const uncachedHashes = [];

  for (let i = 0; i < texts.length; i++) {
    const hash = hashContent(texts[i]);
    const cached = await getCachedEmbedding(hash);
    
    if (cached) {
      results[i] = new Float32Array(cached.buffer.slice(cached.byteOffset, cached.byteOffset + cached.byteLength));
    } else {
      uncachedTexts.push(texts[i]);
      uncachedIndices.push(i);
      uncachedHashes.push(hash);
    }
  }

  // Generate embeddings for uncached texts
  if (uncachedTexts.length > 0) {
    if (!openai) {
      // Use mock embeddings for testing
      console.warn('⚠️  Using mock embeddings (no OPENAI_API_KEY set)');
      
      for (let i = 0; i < uncachedTexts.length; i++) {
        const embeddingArray = generateMockEmbedding(uncachedTexts[i]);
        results[uncachedIndices[i]] = embeddingArray;
        
        // Cache the embedding
        await cacheEmbedding(uncachedHashes[i], embeddingArray);
      }
    } else {
      try {
        const response = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: uncachedTexts,
          encoding_format: 'float',
        });

        for (let i = 0; i < uncachedTexts.length; i++) {
          const embeddingArray = new Float32Array(response.data[i].embedding);
          results[uncachedIndices[i]] = embeddingArray;
          
          // Cache the embedding
          await cacheEmbedding(uncachedHashes[i], embeddingArray);
        }
      } catch (error) {
        console.error('Error generating embeddings:', error.message);
        throw error;
      }
    }
  }

  // Cleanup old cache entries periodically (1% chance)
  if (Math.random() < 0.01) {
    try {
      await run('DELETE FROM embedding_cache WHERE created_at < strftime(\'%s\', \'now\', \'-7 days\')');
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  return Array.isArray(input) ? results : results[0];
}

/**
 * Generate embedding for single text
 */
async function generateEmbedding(text) {
  return generateEmbeddings(text);
}

/**
 * Convert Float32Array to Buffer for storage
 */
function embeddingToBuffer(embedding) {
  return Buffer.from(embedding.buffer);
}

/**
 * Convert Buffer to Float32Array
 */
function bufferToEmbedding(buffer) {
  if (!buffer) return null;
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
}

module.exports = {
  generateEmbedding,
  generateEmbeddings,
  embeddingToBuffer,
  bufferToEmbedding,
  EMBEDDING_DIM,
  EMBEDDING_MODEL,
};
