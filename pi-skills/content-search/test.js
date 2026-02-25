#!/usr/bin/env node

/**
 * Test suite for Content Search skill
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEST_DIR = path.join(__dirname, 'test-tmp');
const SEARCH_DIR = path.join(TEST_DIR, '.search');

// Setup test environment
function setup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, 'src'), { recursive: true });
  
  // Create test files
  fs.writeFileSync(path.join(TEST_DIR, 'src', 'test.js'), `
function hello() {
  console.log("Hello World");
  // This is a test error handling comment
}

function calculateError(a, b) {
  return a + b;
}
  `);
  
  fs.writeFileSync(path.join(TEST_DIR, 'README.md'), `# Test Project

This is a test project for error handling.
  `);
  
  console.log('✓ Test environment set up');
}

function runCommand(args) {
  const argsStr = JSON.stringify(args.args);
  const result = execSync(
    `node "${path.resolve(__dirname, 'content-search.js')}" ${args.command} '${argsStr}'`,
    { 
      encoding: 'utf-8', 
      env: { ...process.env, SEARCH_DIR },
      cwd: TEST_DIR
    }
  );
  return JSON.parse(result);
}

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

// Test 1: Search local files by content
function testSearchContent() {
  console.log('\n--- Test: Search local (content) ---');
  
  const result = runCommand({
    command: 'search',
    args: { query: 'error handling', path: '.', type: 'content' }
  });
  
  assert(result.success === true, 'Search should succeed');
  assert(result.results && result.results.length > 0, 'Should find results');
  assert(result.output.includes('error'), 'Should mention error');
  
  console.log(`Found ${result.results.length} files`);
}

// Test 2: Search local files by filename
function testSearchFilename() {
  console.log('\n--- Test: Search local (filename) ---');
  
  const result = runCommand({
    command: 'search',
    args: { query: 'test.js', path: '.', type: 'filename' }
  });
  
  assert(result.success === true, 'Search should succeed');
  assert(result.results && result.results.length > 0, 'Should find test.js');
  
  console.log(`Found ${result.results.length} files`);
}

// Test 3: Index files
function testIndex() {
  console.log('\n--- Test: Index files ---');
  
  const result = runCommand({
    command: 'index',
    args: { path: '.', extensions: ['js', 'md'] }
  });
  
  assert(result.success === true, 'Index should succeed');
  assert(result.indexed > 0, 'Should index files');
  
  console.log(`Indexed ${result.indexed} files`);
}

// Test 4: Search with maxResults
function testMaxResults() {
  console.log('\n--- Test: Search with maxResults ---');
  
  const result = runCommand({
    command: 'search',
    args: { query: 'test', maxResults: 5 }
  });
  
  assert(result.success === true, 'Search should succeed');
  assert(result.results.length <= 5, 'Should limit results');
  
  console.log(`Limited to ${result.results.length} results`);
}

// Test 5: No results
function testNoResults() {
  console.log('\n--- Test: No results ---');
  
  const result = runCommand({
    command: 'search',
    args: { query: 'xyznonexistentquery123' }
  });
  
  assert(result.success === true, 'Search should succeed even with no results');
  assert(result.results.length === 0, 'Should return empty results');
  assert(result.output.includes('No results'), 'Should mention no results');
  
  console.log('Handled no results correctly');
}

// Test 6: Error handling - missing query
function testMissingQuery() {
  console.log('\n--- Test: Missing query ---');
  
  const result = runCommand({
    command: 'search',
    args: {}
  });
  
  assert(result.success === false, 'Should fail without query');
  assert(result.error, 'Should return error message');
  
  console.log('Error handling works');
}

// Main test runner
function runTests() {
  console.log('========================================');
  console.log('Content Search Skill - Test Suite');
  console.log('========================================');
  
  try {
    setup();
    testSearchContent();
    testSearchFilename();
    testIndex();
    testMaxResults();
    testNoResults();
    testMissingQuery();
    
    console.log('\n========================================');
    console.log('ALL TESTS PASSED! ✓');
    console.log('========================================');
    
    // Cleanup
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
    process.exit(0);
  } catch (error) {
    console.error('\n========================================');
    console.error('TEST FAILED:', error.message);
    console.error('========================================');
    process.exit(1);
  }
}

runTests();
