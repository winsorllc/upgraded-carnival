#!/usr/bin/env node
/**
 * memory-init: Initialize the hybrid memory database
 */

const { initializeSchema } = require('../lib/db');
const { DB_PATH } = require('../lib/db');

console.log('🔧 Initializing Hybrid Memory System...\n');

(async () => {
  try {
    await initializeSchema();
    
    console.log('✅ Database initialized successfully!');
    console.log(`📁 Location: ${DB_PATH}`);
    console.log('\nDatabase schema created:');
    console.log('  • memories - Main storage with embeddings');
    console.log('  • memories_fts - FTS5 virtual table for full-text search');
    console.log('  • embedding_cache - LRU cache for embeddings');
    console.log('\nYou can now use:');
    console.log('  memory-store "Your content"');
    console.log('  memory-search "Your query"');
    console.log('  memory-recall "Context question"');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  }
})();
