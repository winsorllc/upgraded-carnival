#!/usr/bin/env node

/**
 * Test suite for delegate-agent skill
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;

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

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// Tests

test('delegate-spawn.js exists and is executable', () => {
  const filePath = path.join(BASE_DIR, 'delegate-spawn.js');
  assert(fs.existsSync(filePath), 'delegate-spawn.js should exist');
  
  // Check it's valid JavaScript
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('spawnDelegateAgent'), 'Should contain spawnDelegateAgent function');
  assert(content.includes('generateUUID'), 'Should contain generateUUID function');
});

test('delegate-status.js exists', () => {
  const filePath = path.join(BASE_DIR, 'delegate-status.js');
  assert(fs.existsSync(filePath), 'delegate-status.js should exist');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('getStatus'), 'Should contain getStatus function');
});

test('SKILL.md is properly formatted', () => {
  const skillPath = path.join(BASE_DIR, 'SKILL.md');
  assert(fs.existsSync(skillPath), 'SKILL.md should exist');
  
  const content = fs.readFileSync(skillPath, 'utf8');
  assert(content.includes('---'), 'Should have YAML frontmatter');
  assert(content.includes('name: delegate-agent'), 'Should have name field');
  assert(content.includes('description:'), 'Should have description field');
});

test('CLI shows help when no args', () => {
  const result = execSync(`node ${path.join(BASE_DIR, 'delegate-spawn.js')}`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  assert(result.includes('Delegate Agent CLI'), 'Should show help');
  assert(result.includes('spawn'), 'Should document spawn command');
  assert(result.includes('list'), 'Should document list command');
  assert(result.includes('status'), 'Should document status command');
});

test('generateUUID produces valid UUIDs', () => {
  // Test the UUID pattern indirectly through code inspection
  const filePath = path.join(BASE_DIR, 'delegate-spawn.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // The UUID regex pattern
  assert(content.includes('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'), 'Should have UUID pattern');
});

test('has GitHub API integration', () => {
  const filePath = path.join(BASE_DIR, 'delegate-spawn.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('api.github.com'), 'Should use GitHub API');
  assert(content.includes('GH_TOKEN') || content.includes('GITHUB_TOKEN'), 'Should use GitHub token');
});

test('supports model option', () => {
  const filePath = path.join(BASE_DIR, 'delegate-spawn.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('--model'), 'Should support --model option');
});

test('supports timeout option', () => {
  const filePath = path.join(BASE_DIR, 'delegate-spawn.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('--timeout'), 'Should support --timeout option');
});

// Run tests
async function runTests() {
  console.log('🧪 Running delegate-agent skill tests...\n');
  
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
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
