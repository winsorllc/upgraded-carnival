#!/usr/bin/env node
/**
 * memory-stats: Show database statistics
 */

const { getStats } = require('../lib/store');

console.log('📊 Hybrid Memory Statistics\n');
console.log('═'.repeat(50));

(async () => {
  try {
    const stats = await getStats();
    
    console.log(`🧠 Memories stored:     ${stats.memories.toLocaleString()}`);
    console.log(`💾 Embeddings cached:   ${stats.embeddingsCached.toLocaleString()}`);
    console.log(`🔍 FTS indexed:         ${stats.ftsIndexed.toLocaleString()}`);
    console.log(`💿 Database size:       ${stats.dbSizeFormatted}`);
    
    console.log('\n' + '─'.repeat(50));
    console.log('Architecture: SQLite + Vector (cosine) + BM25 (FTS5)');
    console.log('Hybrid scoring: 70% semantic + 30% keyword');
    console.log('═'.repeat(50));
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
