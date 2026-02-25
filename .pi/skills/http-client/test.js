#!/usr/bin/env node

/**
 * Test suite for http-client skill
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

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

test('http-request.js exists', () => {
  const filePath = path.join(BASE_DIR, 'http-request.js');
  assert(fs.existsSync(filePath), 'http-request.js should exist');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('httpRequest'), 'Should contain httpRequest function');
  assert(content.includes('http'), 'Should use http module');
  assert(content.includes('https'), 'Should use https module');
});

test('SKILL.md is properly formatted', () => {
  const skillPath = path.join(BASE_DIR, 'SKILL.md');
  assert(fs.existsSync(skillPath), 'SKILL.md should exist');
  
  const content = fs.readFileSync(skillPath, 'utf8');
  assert(content.includes('---'), 'Should have YAML frontmatter');
  assert(content.includes('name: http-client'), 'Should have name field');
  assert(content.includes('GET'), 'Should document GET');
  assert(content.includes('POST'), 'Should document POST');
  assert(content.includes('DELETE'), 'Should document DELETE');
  assert(content.includes('PATCH'), 'Should document PATCH');
});

test('CLI shows help when no args', () => {
  try {
    execSync(`node ${path.join(BASE_DIR, 'http-request.js')}`, {
      encoding: 'utf8',
      timeout: 5000
    });
  } catch (e) {
    // Exit code 1 is expected when no args
    const output = e.stdout || e.stderr;
    assert(output.includes('HTTP Client CLI') || output.includes('Usage:'), 'Should show help');
    return;
  }
  throw new Error('Should have exited');
});

test('supports --header option', () => {
  const filePath = path.join(BASE_DIR, 'http-request.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('--header'), 'Should support --header option');
});

test('supports --json option', () => {
  const filePath = path.join(BASE_DIR, 'http-request.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('--json'), 'Should support --json option');
});

test('supports --timeout option', () => {
  const filePath = path.join(BASE_DIR, 'http-request.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('--timeout'), 'Should support --timeout option');
});

test('supports --max-size option', () => {
  const filePath = path.join(BASE_DIR, 'http-request.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('--max-size'), 'Should support --max-size option');
});

test('has security validation', () => {
  const filePath = path.join(BASE_DIR, 'http-request.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('http:') || content.includes('https:'), 'Should validate protocols');
  assert(content.includes('Invalid URL'), 'Should validate URL format');
});

test('handles JSON parsing', () => {
  const filePath = path.join(BASE_DIR, 'http-request.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('application/json'), 'Should handle JSON content-type');
  assert(content.includes('JSON.parse'), 'Should parse JSON responses');
});

test('has timeout handling', () => {
  const filePath = path.join(BASE_DIR, 'http-request.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('timeout'), 'Should handle timeouts');
  assert(content.includes('req.destroy'), 'Should destroy request on timeout');
});

test('can make actual HTTP request (GET httpbin.org)', async () => {
  const result = execSync(`node ${path.join(BASE_DIR, 'http-request.js')} GET https://httpbin.org/get`, {
    encoding: 'utf8',
    timeout: 30000
  });
  
  const response = JSON.parse(result);
  assert(response.status === 200, 'Should get 200 status');
  assert(response.json, 'Should parse JSON response');
  assert(response.json.url, 'Should have url in response');
});

// Run tests
async function runTests() {
  console.log('🧪 Running http-client skill tests...\n');
  
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
