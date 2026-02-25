#!/usr/bin/env node

/**
 * Test suite for cron-manager skill
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Tests

test('cron-manager.js exists', () => {
  const filePath = path.join(BASE_DIR, 'cron-manager.js');
  assert(fs.existsSync(filePath), 'cron-manager.js should exist');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('listCrons'), 'Should have listCrons function');
  assert(content.includes('addCron'), 'Should have addCron function');
  assert(content.includes('removeCron'), 'Should have removeCron function');
  assert(content.includes('enableCron'), 'Should have enableCron function');
  assert(content.includes('disableCron'), 'Should have disableCron function');
});

test('SKILL.md is properly formatted', () => {
  const skillPath = path.join(BASE_DIR, 'SKILL.md');
  assert(fs.existsSync(skillPath), 'SKILL.md should exist');
  
  const content = fs.readFileSync(skillPath, 'utf8');
  assert(content.includes('---'), 'Should have YAML frontmatter');
  assert(content.includes('name: cron-manager'), 'Should have name field');
  assert(content.includes('list'), 'Should document list command');
  assert(content.includes('add'), 'Should document add command');
});

test('CLI shows help when no args', () => {
  try {
    execSync(`node ${path.join(BASE_DIR, 'cron-manager.js')}`, {
      encoding: 'utf8',
      timeout: 5000
    });
  } catch (e) {
    const output = e.stdout || e.stderr;
    assert(output.includes('Cron Manager') || output.includes('Usage:'), 'Should show help');
    return;
  }
});

test('can list cron jobs', () => {
  const result = execSync(`node ${path.join(BASE_DIR, 'cron-manager.js')} list --json 2>&1`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  // Should work (even if empty)
  assert(result.includes('count') || result.includes('crons'), 'Should list cron jobs');
});

test('can show next runs', () => {
  const result = execSync(`node ${path.join(BASE_DIR, 'cron-manager.js')} next 2>&1`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  assert(result.includes('crons') || result.includes('nextRun'), 'Should show next runs');
});

// Run tests
async function runTests() {
  console.log('🧪 Running cron-manager skill tests...\n');
  
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
