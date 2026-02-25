#!/usr/bin/env node

/**
 * Test suite for system-doctor skill
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

test('doctor.js exists', () => {
  const filePath = path.join(BASE_DIR, 'doctor.js');
  assert(fs.existsSync(filePath), 'doctor.js should exist');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('checkConfig'), 'Should have checkConfig function');
  assert(content.includes('checkMemory'), 'Should have checkMemory function');
  assert(content.includes('checkDisk'), 'Should have checkDisk function');
  assert(content.includes('checkNetwork'), 'Should have checkNetwork function');
  assert(content.includes('checkSecurity'), 'Should have checkSecurity function');
  assert(content.includes('checkDocker'), 'Should have checkDocker function');
});

test('SKILL.md is properly formatted', () => {
  const skillPath = path.join(BASE_DIR, 'SKILL.md');
  assert(fs.existsSync(skillPath), 'SKILL.md should exist');
  
  const content = fs.readFileSync(skillPath, 'utf8');
  assert(content.includes('---'), 'Should have YAML frontmatter');
  assert(content.includes('name: system-doctor'), 'Should have name field');
  assert(content.includes('config'), 'Should document config check');
  assert(content.includes('memory'), 'Should document memory check');
  assert(content.includes('disk'), 'Should document disk check');
});

test('CLI shows help when --help is passed', () => {
  try {
    execSync(`node ${path.join(BASE_DIR, 'doctor.js')} --help`, {
      encoding: 'utf8',
      timeout: 5000
    });
  } catch (e) {
    const output = e.stdout || e.stderr;
    assert(output.includes('System Doctor') || output.includes('Usage:'), 'Should show help');
    return;
  }
});

test('runs health check', () => {
  // Run command and capture output, handle error code
  let result;
  try {
    result = execSync(`node ${path.join(BASE_DIR, 'doctor.js')} --json 2>&1`, {
      encoding: 'utf8',
      timeout: 30000
    });
  } catch (e) {
    // Use stdout from error
    result = e.stdout;
  }
  
  const output = JSON.parse(result);
  assert(output.status, 'Should have overall status');
  assert(output.checks, 'Should have checks');
});

test('supports --check option', () => {
  let result;
  try {
    result = execSync(`node ${path.join(BASE_DIR, 'doctor.js')} --check memory --json 2>&1`, {
      encoding: 'utf8',
      timeout: 10000
    });
  } catch (e) {
    result = e.stdout;
  }
  
  const output = JSON.parse(result);
  assert(output.checks.memory, 'Should have memory check result');
});

test('supports --json option', () => {
  let result;
  try {
    result = execSync(`node ${path.join(BASE_DIR, 'doctor.js')} --json 2>&1`, {
      encoding: 'utf8',
      timeout: 30000
    });
  } catch (e) {
    result = e.stdout;
  }
  
  const output = JSON.parse(result);
  assert(typeof output === 'object', 'Should output JSON object');
});

test('has all required checks', () => {
  const filePath = path.join(BASE_DIR, 'doctor.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('checkConfig'), 'Should have config check');
  assert(content.includes('checkMemory'), 'Should have memory check');
  assert(content.includes('checkDisk'), 'Should have disk check');
  assert(content.includes('checkNetwork'), 'Should have network check');
  assert(content.includes('checkSecurity'), 'Should have security check');
  assert(content.includes('checkDocker'), 'Should have docker check');
});

test('memory check returns valid status', () => {
  let result;
  try {
    result = execSync(`node ${path.join(BASE_DIR, 'doctor.js')} --check memory --json 2>&1`, {
      encoding: 'utf8',
      timeout: 10000
    });
  } catch (e) {
    result = e.stdout;
  }
  
  const output = JSON.parse(result);
  assert(output.checks.memory.status, 'Should have status');
  assert(['pass', 'warning', 'error', 'skip'].includes(output.checks.memory.status), 'Should have valid status');
  assert(output.checks.memory.details, 'Should have details');
});

// Run tests
async function runTests() {
  console.log('🧪 Running system-doctor skill tests...\n');
  
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
