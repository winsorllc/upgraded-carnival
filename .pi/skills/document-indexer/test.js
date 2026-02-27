#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { 
  addDocument, 
  search, 
  loadIndex, 
  removeDocument, 
  summarize,
  extractKeywords 
} = require('./index-add.js');

console.log('🧪 Testing document-indexer...\n');

// Clean up
const INDEX_PATH = '/tmp/document-index.jsonl';
if (fs.existsSync(INDEX_PATH)) fs.unlinkSync(INDEX_PATH);

// Test 1: Extract keywords
console.log('Test 1: Keyword extraction');
const keywords = extractKeywords('This is a test document about testing and documents and code');
assert(Array.isArray(keywords), 'Should return array');
assert(keywords.length > 0, 'Should have keywords');
console.log(`  ✓ Keywords: ${keywords.join(', ')}`);

// Test 2: Add document
console.log('\nTest 2: Add document');
const testFile = '/tmp/test-doc.txt';
fs.writeFileSync(testFile, 'This is a test document about JavaScript programming and Node.js development. It contains code examples and documentation.');

const result = addDocument(testFile, 'test');
assert(result.success, `Should succeed: ${result.error}`);
assert(result.id, 'Should have ID');
console.log(`  ✓ Added: ${result.id}`);

// Test 3: Search
console.log('\nTest 3: Search');
const results = search('javascript programming');
assert(Array.isArray(results), 'Should return array');
assert(results.length > 0, 'Should find results');
console.log(`  ✓ Found ${results.length} results`);

// Test 4: Summarize
console.log('\nTest 4: Summarize');
const summary = summarize(result.id);
assert(!summary.error, 'Should not error');
assert(summary.title, 'Should have title');
console.log(`  ✓ Summary: ${summary.title}`);

// Test 5: Remove
console.log('\nTest 5: Remove');
const removed = removeDocument(result.id);
assert(removed.success, 'Should remove successfully');
console.log(`  ✓ Removed`);

// Cleanup
fs.unlinkSync(testFile);
fs.unlinkSync(INDEX_PATH);

console.log('\n' + '='.repeat(50));
console.log('✅ All tests passed!');
console.log('='.repeat(50));
