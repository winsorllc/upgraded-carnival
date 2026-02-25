#!/usr/bin/env node

/**
 * Test suite for Memory Forget skill
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEST_DIR = path.join(__dirname, 'test-tmp');
const MEMORY_DIR = path.join(TEST_DIR, '.memory');

// Setup test environment
function setup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
  
  // Create some test memories
  const memories = [
    { id: 'mem-1', content: 'User likes coffee', timestamp: '2024-01-01T10:00:00Z', tags: ['preferences'] },
    { id: 'mem-2', content: 'Project deadline is Friday', timestamp: '2024-01-02T14:00:00Z', tags: ['work', 'project'] },
    { id: 'mem-3', content: 'Remember to buy milk', timestamp: '2024-01-03T09:00:00Z', tags: ['tasks'] },
    { id: 'mem-4', content: 'Coffee machine is broken', timestamp: '2024-01-04T11:00:00Z', tags: ['preferences', 'equipment'] }
  ];
  
  fs.writeFileSync(path.join(MEMORY_DIR, 'memories.json'), JSON.stringify(memories));
  
  console.log('✓ Test environment set up');
}

function runCommand(args) {
  const argsStr = JSON.stringify(args.args);
  const result = execSync(
    `node "${path.resolve(__dirname, 'memory-forget.js')}" ${args.command} '${argsStr}'`,
    { 
      encoding: 'utf-8', 
      env: { ...process.env, MEMORY_DIR }
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

// Test 1: List memories
function testList() {
  console.log('\n--- Test: List memories ---');
  
  const result = runCommand({ command: 'list', args: {} });
  
  assert(result.success === true, 'Should list memories');
  assert(result.memories.length === 4, 'Should have 4 memories');
  
  console.log(`Listed ${result.memories.length} memories`);
}

// Test 2: List with filter
function testListFilter() {
  console.log('\n--- Test: List with filter ---');
  
  const result = runCommand({ command: 'list', args: { filter: 'coffee' } });
  
  assert(result.success === true, 'Should filter memories');
  assert(result.memories.length === 2, 'Should find coffee memories');
  
  console.log(`Found ${result.memories.length} memories about coffee`);
}

// Test 3: Preview forget (without confirm)
function testPreviewForget() {
  console.log('\n--- Test: Preview forget ---');
  
  const result = runCommand({ command: 'forget', args: { keyword: 'coffee' } });
  
  assert(result.success === false, 'Should require confirmation');
  assert(result.preview === true, 'Should show preview');
  
  console.log('Requires confirmation');
}

// Test 4: Forget with confirmation
function testForgetConfirm() {
  console.log('\n--- Test: Forget with confirmation ---');
  
  const result = runCommand({ 
    command: 'forget', 
    args: { keyword: 'coffee', confirm: true } 
  });
  
  assert(result.success === true, 'Should forget memories');
  assert(result.deleted === 2, 'Should delete 2 memories');
  
  console.log(`Deleted ${result.deleted} memories`);
}

// Test 5: Verify forget worked
function testVerifyForget() {
  console.log('\n--- Test: Verify forget ---');
  
  const result = runCommand({ command: 'list', args: {} });
  
  assert(result.memories.length === 2, 'Should have 2 memories left');
  assert(!result.output.includes('coffee'), 'Should not contain coffee');
  
  console.log('Verified: coffee memories removed');
}

// Test 6: Forget by ID
function testForgetById() {
  console.log('\n--- Test: Forget by ID ---');
  
  const result = runCommand({ 
    command: 'forget', 
    args: { id: 'mem-2', confirm: true } 
  });
  
  assert(result.success === true, 'Should forget by ID');
  assert(result.deleted === 1, 'Should delete 1 memory');
  
  console.log('Deleted by ID');
}

// Test 7: Memory stats
function testStats() {
  console.log('\n--- Test: Memory stats ---');
  
  const result = runCommand({ command: 'stats', args: {} });
  
  assert(result.success === true, 'Should get stats');
  assert(result.stats.count === 1, 'Should have 1 memory left');
  assert(result.stats.oldest, 'Should have oldest');
  assert(result.stats.newest, 'Should have newest');
  
  console.log(`Stats: ${result.stats.count} memories, ${(result.stats.size_bytes / 1024).toFixed(2)} KB`);
}

// Test 8: Forget all
function testForgetAll() {
  console.log('\n--- Test: Forget all ---');
  
  const result = runCommand({ 
    command: 'forget', 
    args: { all: true, confirm: true } 
  });
  
  assert(result.success === true, 'Should forget all');
  assert(result.deleted === 1, 'Should delete remaining memories');
  assert(result.remaining === 0, 'Should have 0 remaining');
  
  console.log('All memories forgotten');
}

// Test 9: Stats after forget all
function testStatsEmpty() {
  console.log('\n--- Test: Stats after forget all ---');
  
  const result = runCommand({ command: 'stats', args: {} });
  
  assert(result.success === true, 'Should get stats');
  assert(result.stats.count === 0, 'Should have 0 memories');
  
  console.log('Empty stats verified');
}

// Main test runner
function runTests() {
  console.log('========================================');
  console.log('Memory Forget Skill - Test Suite');
  console.log('========================================');
  
  try {
    setup();
    testList();
    testListFilter();
    testPreviewForget();
    testForgetConfirm();
    testVerifyForget();
    testForgetById();
    testStats();
    testForgetAll();
    testStatsEmpty();
    
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
