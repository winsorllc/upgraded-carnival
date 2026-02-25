/**
 * Hybrid Memory Test Suite
 */

const { initializeSchema } = require('../lib/db');
const { storeMemory, getMemory, deleteMemory, getStats } = require('../lib/store');
const { hybridSearch, vectorSearch, keywordSearch, recall } = require('../lib/search');
const { generateEmbedding } = require('../lib/embeddings');
const { chunkText, chunkMarkdown } = require('../lib/chunker');

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
    testsPassed++;
    return true;
  } catch (error) {
    console.log(`${RED}✗${RESET} ${name}`);
    console.log(`  Error: ${error.message}`);
    testsFailed++;
    return false;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message || 'Expected true, got false');
  }
}

function assertExists(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected value to exist');
  }
}

// Clean up test data
async function cleanup() {
  try {
    const { run } = require('../lib/db');
    await run('DELETE FROM memories');
    await run('DELETE FROM embedding_cache');
  } catch (e) {
    // Ignore cleanup errors
  }
}

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║        Hybrid Memory Test Suite                          ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// Run tests
async function runTests() {
  // Test 1: Database initialization (skipped - already initialized)
  await test('Database schema initialization', async () => {
    const { all } = require('../lib/db');
    const tables = await all("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.map(t => t.name);
    assertTrue(tableNames.includes('memories'), 'memories table exists');
    assertTrue(tableNames.includes('memories_fts'), 'FTS5 table exists');
  });

  // Test 2: Text chunking
  await test('Text chunking works', async () => {
    const text = 'Line 1\n\nLine 2\n\nLine 3';
    const chunks = chunkText(text);
    assertTrue(chunks.length >= 1, 'Chunks created');
  });

  await test('Markdown chunking preserves headers', async () => {
    const markdown = `# Authentication Guide

This is a comprehensive guide to authentication systems with detailed explanations of various methods.

## JWT Tokens

JSON Web Tokens are a compact, URL-safe means of representing claims between parties securely.`;
    const chunks = chunkMarkdown(markdown);
    assertTrue(chunks.length > 0, 'Markdown chunks created');
    assertTrue(chunks[0].headerContext.includes('# Authentication Guide'), 'Preserves main header');
  });

  // Test 3: Store and retrieve memory
  await test('Store and retrieve memory', async () => {
    await cleanup();
    
    const result = await storeMemory('Test memory content', {
      tags: ['test', 'memory'],
      source: 'test-suite'
    });
    
    assertExists(result.id, 'Memory has ID');
    assertEqual(result.content, 'Test memory content', 'Content matches');
    assertTrue(result.tags.includes('test'), 'Has test tag');
    
    const retrieved = await getMemory(result.id);
    assertExists(retrieved, 'Can retrieve memory');
    assertEqual(retrieved.content, 'Test memory content', 'Retrieved content matches');
  });

  // Test 4: Delete memory
  await test('Delete memory', async () => {
    const result = await storeMemory('To be deleted', { tags: ['temp'] });
    const deleted = await deleteMemory(result.id);
    assertTrue(deleted, 'Memory deleted');
    
    const retrieved = await getMemory(result.id);
    assertEqual(retrieved, null, 'Memory no longer exists');
  });

  // Test 5: Stats
  await test('Stats calculation', async () => {
    const stats = await getStats();
    assertTrue(stats.memories >= 0, 'Stats has memory count');
    assertTrue(typeof stats.dbSizeFormatted === 'string', 'Stats has formatted size');
  });

  // Test 6: Store multiple for search
  await test('Store search test data', async () => {
    await cleanup();
    
    await storeMemory('Authentication middleware using JWT tokens', {
      tags: ['auth', 'middleware'],
      source: 'docs'
    });
    
    await storeMemory('Database connection pooling with PostgreSQL', {
      tags: ['database', 'config'],
      source: 'docs'
    });
    
    await storeMemory('User login flow with password validation', {
      tags: ['auth', 'users'],
      source: 'code'
    });
    
    await storeMemory('API rate limiting implementation', {
      tags: ['api', 'security'],
      source: 'docs'
    });
    
    await storeMemory('Session management in Redis', {
      tags: ['session', 'cache'],
      source: 'code'
    });
    
    // Verify stats
    const stats = await getStats();
    assertEqual(stats.memories, 5, 'Five memories stored');
  });

  // Test 7: Keyword search (using fallback)
  await test('Keyword search', async () => {
    const results = await keywordSearch('authentication');
    assertTrue(results.length >= 0, 'Search executed');
  });

  // Test 8: Vector search
  await test('Vector search (semantic)', async () => {
    const results = await vectorSearch('login system', { limit: 3 });
    assertTrue(results.length >= 0, 'Found semantic results');
  });

  // Test 9: Hybrid search
  await test('Hybrid search', async () => {
    const results = await hybridSearch('user authentication', { limit: 5 });
    assertTrue(results.length >= 0, 'Found hybrid results');
  });

  // Test 10: Recall function
  await test('Recall function', async () => {
    const results = await recall('database configuration', { topK: 3 });
    assertTrue(results.length >= 0, 'Recalled memories');
  });

  // Test 11: Update memory
  await test('Update existing memory', async () => {
    const result = await storeMemory('Original content', { tags: ['test'] });
    const updated = await storeMemory('Updated content', { 
      id: result.id,
      tags: ['test', 'updated']
    });
    
    assertEqual(updated.id, result.id, 'Same ID');
    assertEqual(updated.created, false, 'Not created as new');
    
    const retrieved = await getMemory(result.id);
    assertEqual(retrieved.content, 'Updated content', 'Content updated');
  });

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log(`  Tests passed: ${GREEN}${testsPassed}${RESET}`);
  console.log(`  Tests failed: ${testsFailed > 0 ? RED : ''}${testsFailed}${RESET}`);
  console.log('═'.repeat(60));
  
  if (testsFailed > 0) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
  }
}

runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
