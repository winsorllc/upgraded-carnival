#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Agent Memory Skill
 * 
 * Tests all functionality of the memory tool
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MEMORY_TOOL = '/job/.pi/skills/agent-memory/memory-tool.js';
const DB_PATH = '/job/data/memory.sqlite';

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function log(message) {
  console.log(`[TEST] ${message}`);
}

function assert(condition, message) {
  testsRun++;
  if (condition) {
    testsPassed++;
    log(`✓ PASS: ${message}`);
    return true;
  } else {
    testsFailed++;
    log(`✗ FAIL: ${message}`);
    return false;
  }
}

function runCommand(...args) {
  try {
    const result = execSync(`node ${MEMORY_TOOL} ${args.join(' ')}`, {
      encoding: 'utf8',
      cwd: '/job'
    });
    return JSON.parse(result.trim());
  } catch (error) {
    try {
      return JSON.parse(error.stdout?.trim() || error.message);
    } catch {
      return { success: false, error: error.message };
    }
  }
}

function cleanup() {
  try {
    if (fs.existsSync(DB_PATH)) {
      fs.unlinkSync(DB_PATH);
    }
  } catch (e) {}
}

async function runTests() {
  console.log('\n========================================');
  console.log('   AGENT MEMORY SKILL - TEST SUITE');
  console.log('========================================\n');
  
  // Setup: clean database
  cleanup();
  
  // Test 1: Store a core memory
  log('Test 1: Store a core memory');
  let result = runCommand('store', 'test_key', 'test value', 'core');
  assert(result.success === true, 'Store core memory');
  assert(result.message.includes('test_key'), 'Message contains key');
  
  // Test 2: Store a daily memory
  log('\nTest 2: Store a daily memory');
  result = runCommand('store', 'session_status', '--category', 'daily', 'working on login bug');
  assert(result.success === true, 'Store daily memory');
  
  // Test 3: Store a conversation memory
  log('\nTest 3: Store a conversation memory');
  result = runCommand('store', 'user_request', '--category', 'conversation', 'needs API documentation');
  assert(result.success === true, 'Store conversation memory');
  
  // Test 4: Store without category (defaults to core)
  log('\nTest 4: Store without category (defaults to core)');
  result = runCommand('store', 'default_category', 'should be core');
  assert(result.success === true, 'Store without category');
  
  // Test 5: Recall by query - key match
  log('\nTest 5: Recall by query - key match');
  result = runCommand('recall', 'test_key');
  assert(result.success === true, 'Recall succeeds');
  assert(result.results.length === 1, 'Found 1 result');
  assert(result.results[0].key === 'test_key', 'Correct key returned');
  assert(result.results[0].content === 'test value', 'Correct content returned');
  assert(result.results[0].category === 'core', 'Correct category returned');
  
  // Test 6: Recall by query - content match
  log('\nTest 6: Recall by query - content match');
  result = runCommand('recall', 'login');
  assert(result.success === true, 'Recall succeeds');
  assert(result.results.length === 1, 'Found 1 result');
  assert(result.results[0].key === 'session_status', 'Found by content match');
  
  // Test 7: Recall with limit
  log('\nTest 7: Recall with limit');
  result = runCommand('recall', '', 2);  // empty query should match all
  assert(result.success === true, 'Recall with limit succeeds');
  
  // Test 8: List all memories
  log('\nTest 8: List all memories');
  result = runCommand('list');
  assert(result.success === true, 'List succeeds');
  assert(result.count === 4, 'All 4 memories listed');
  
  // Test 9: List by category
  log('\nTest 9: List by category');
  result = runCommand('list', 'core');
  assert(result.success === true, 'List by category succeeds');
  assert(result.count === 2, '2 core memories listed');
  
  // Test 10: Update existing memory
  log('\nTest 10: Update existing memory');
  result = runCommand('store', 'test_key', 'updated value', 'core');
  assert(result.success === true, 'Update succeeds');
  result = runCommand('recall', 'test_key');
  assert(result.results[0].content === 'updated value', 'Content was updated');
  
  // Test 11: Delete a memory
  log('\nTest 11: Delete a memory');
  result = runCommand('delete', 'test_key');
  assert(result.success === true, 'Delete succeeds');
  result = runCommand('recall', 'test_key');
  assert(result.results.length === 0, 'Memory was deleted');
  
  // Test 12: Delete non-existent memory
  log('\nTest 12: Delete non-existent memory');
  result = runCommand('delete', 'nonexistent_key');
  assert(result.success === false, 'Delete fails for non-existent key');
  
  // Test 13: Database file exists
  log('\nTest 13: Database file persistence');
  assert(fs.existsSync(DB_PATH), 'Database file created');
  
  // Test 14: Invalid command
  log('\nTest 14: Invalid command handling');
  // This would exit with error, so we catch it
  try {
    execSync(`node ${MEMORY_TOOL} invalid_command`, { cwd: '/job' });
    assert(false, 'Should have failed');
  } catch (e) {
    assert(true, 'Invalid command handled gracefully');
  }
  
  // Summary
  console.log('\n========================================');
  console.log('   TEST SUMMARY');
  console.log('========================================');
  console.log(`Total:   ${testsRun}`);
  console.log(`Passed:  ${testsPassed}`);
  console.log(`Failed:  ${testsFailed}`);
  console.log('========================================\n');
  
  // Show database contents
  console.log('Database contents:');
  result = runCommand('list');
  console.log(JSON.stringify(result, null, 2));
  
  // Cleanup
  cleanup();
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();
