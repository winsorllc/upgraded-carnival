/**
 * Hybrid Memory - Main exports
 * Full-stack hybrid memory system with vector + keyword search
 */

const { storeMemory, storeMemories, storeFromFile, deleteMemory, getMemory, listMemories, getStats, exportMemories } = require('./lib/store');
const { hybridSearch, vectorSearch, keywordSearch, recall, getById } = require('./lib/search');
const { generateEmbedding } = require('./lib/embeddings');
const { chunkText, chunkMarkdown } = require('./lib/chunker');

module.exports = {
  // Storage operations
  storeMemory,
  storeMemories,
  storeFromFile,
  deleteMemory,
  getMemory,
  listMemories,
  getStats,
  exportMemories,
  
  // Search operations
  hybridSearch,
  vectorSearch,
  keywordSearch,
  recall,
  getById,
  
  // Utilities
  generateEmbedding,
  chunkText,
  chunkMarkdown,
  
  // Configuration
  VECTOR_WEIGHT: parseFloat(process.env.HYBRID_VECTOR_WEIGHT || '0.7'),
  KEYWORD_WEIGHT: parseFloat(process.env.HYBRID_KEYWORD_WEIGHT || '0.3'),
};
