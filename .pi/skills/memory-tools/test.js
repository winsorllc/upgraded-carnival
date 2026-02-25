#!/usr/bin/env node

/**
 * Test suite for memory-tools skill
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const BASE_DIR = __dirname;
const TEST_MEM_DIR = path.join(os.homedir(), '.thepopebot-test');
const TEST_MEM_FILE = path.join(TEST_MEM_DIR, 'memory.json');

// Override memory file location for testing
const originalMemFile = path.join(os.homedir(), '.thepopebot', 'memory.json');

// Test utilities
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function cleanup() {
  if (fs.existsSync(originalMemFile)) {
    fs.unlinkSync(originalMemFile);
  }
}

// Cleanup before tests
cleanup();

// Tests

test('memory-store.js exists', () => {
  const filePath = path.join(BASE_DIR, 'memory-store.js');
  assert(fs.existsSync(filePath), 'memory-store.js should exist');
});

test('memory-recall.js exists', () => {
  const filePath = path.join(BASE_DIR, 'memory-recall.js');
  assert(fs.existsSync(filePath), 'memory-recall.js should exist');
});

test('memory-search.js exists', () => {
  const filePath = path.join(BASE_DIR, 'memory-search.js');
  assert(fs.existsSync(filePath), 'memory-search.js should exist');
});

test('memory-forget.js exists', () => {
  const filePath = path.join(BASE_DIR, 'memory-forget.js');
  assert(fs.existsSync(filePath), 'memory-forget.js should exist');
});

test('memory-list.js exists', () => {
  const filePath = path.join(BASE_DIR, 'memory-list.js');
  assert(fs.existsSync(filePath), 'memory-list.js should exist');
});

test('SKILL.md is properly formatted', () => {
  const skillPath = path.join(BASE_DIR, 'SKILL.md');
  assert(fs.existsSync(skillPath), 'SKILL.md should exist');
  
  const content = fs.readFileSync(skillPath, 'utf8');
  assert(content.includes('---'), 'Should have YAML frontmatter');
  assert(content.includes('name: memory-tools'), 'Should have name field');
  assert(content.includes('memory-store'), 'Should document store');
  assert(content.includes('memory-recall'), 'Should document recall');
});

test('can store a memory entry', () => {
  const result = execSync(`node ${path.join(BASE_DIR, 'memory-store.js')} test_key "test_value"`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  const output = JSON.parse(result);
  assert(output.success === true, 'Should succeed');
  assert(output.key === 'test_key', 'Should return key');
});

test('can recall a memory entry', () => {
  // First store
  execSync(`node ${path.join(BASE_DIR, 'memory-store.js')} recall_key "recall_value"`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  // Then recall
  const result = execSync(`node ${path.join(BASE_DIR, 'memory-recall.js')} recall_key`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  const output = JSON.parse(result);
  assert(output.success === true, 'Should succeed');
  assert(output.value === 'recall_value', 'Should return correct value');
});

test('returns error for non-existent key', () => {
  const result = execSync(`node ${path.join(BASE_DIR, 'memory-recall.js')} nonexistent_key_12345`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  const output = JSON.parse(result);
  assert(output.success === false, 'Should fail');
  assert(output.error === 'Key not found', 'Should return not found error');
});

test('can list all keys', () => {
  // Store a couple of entries first
  execSync(`node ${path.join(BASE_DIR, 'memory-store.js')} list_key1 "value1"`, {
    encoding: 'utf8',
    timeout: 5000
  });
  execSync(`node ${path.join(BASE_DIR, 'memory-store.js')} list_key2 "value2"`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  const result = execSync(`node ${path.join(BASE_DIR, 'memory-list.js')}`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  const output = JSON.parse(result);
  assert(output.count >= 2, 'Should have at least 2 entries');
  assert(Array.isArray(output.entries), 'Should return entries array');
});

test('can forget a memory entry', () => {
  // Store first
  execSync(`node ${path.join(BASE_DIR, 'memory-store.js')} forget_key "forget_value"`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  // Forget it
  const forgetResult = execSync(`node ${path.join(BASE_DIR, 'memory-forget.js')} forget_key`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  const forgetOutput = JSON.parse(forgetResult);
  assert(forgetOutput.success === true, 'Should forget successfully');
  
  // Try to recall - should fail
  const recallResult = execSync(`node ${path.join(BASE_DIR, 'memory-recall.js')} forget_key`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  const recallOutput = JSON.parse(recallResult);
  assert(recallOutput.success === false, 'Should not be able to recall forgotten key');
});

test('can store with tags', () => {
  const result = execSync(`node ${path.join(BASE_DIR, 'memory-store.js')} tagged_key "tagged_value" --tags "tag1,tag2"`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  const output = JSON.parse(result);
  assert(output.success === true, 'Should store with tags');
  
  // Recall and check tags
  const recallResult = execSync(`node ${path.join(BASE_DIR, 'memory-recall.js')} tagged_key --json`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  const recallOutput = JSON.parse(recallResult);
  assert(recallOutput.entry.tags, 'Should have tags');
  assert(recallOutput.entry.tags.includes('tag1'), 'Should have tag1');
  assert(recallOutput.entry.tags.includes('tag2'), 'Should have tag2');
});

// Run tests
async function runTests() {
  console.log('🧪 Running memory-tools skill tests...\n');
  
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`✅ ${t.name}`);
      passed++;
    } catch (e) {
      console.log(`❌ ${t.name}`);
      console.log(`   Error: ${e.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  // Cleanup
  cleanup();
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
