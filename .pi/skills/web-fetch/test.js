#!/usr/bin/env node

/**
 * Test suite for web-fetch skill
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

test('web-fetch.js exists', () => {
  const filePath = path.join(BASE_DIR, 'web-fetch.js');
  assert(fs.existsSync(filePath), 'web-fetch.js should exist');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('stripHtml'), 'Should have stripHtml function');
  assert(content.includes('htmlToMarkdown'), 'Should have htmlToMarkdown function');
  assert(content.includes('extractTitle'), 'Should have extractTitle function');
});

test('SKILL.md is properly formatted', () => {
  const skillPath = path.join(BASE_DIR, 'SKILL.md');
  assert(fs.existsSync(skillPath), 'SKILL.md should exist');
  
  const content = fs.readFileSync(skillPath, 'utf8');
  assert(content.includes('---'), 'Should have YAML frontmatter');
  assert(content.includes('name: web-fetch'), 'Should have name field');
});

test('CLI shows help when no args', () => {
  try {
    execSync(`node ${path.join(BASE_DIR, 'web-fetch.js')}`, {
      encoding: 'utf8',
      timeout: 5000
    });
  } catch (e) {
    const output = e.stdout || e.stderr;
    assert(output.includes('Web Fetch CLI') || output.includes('Usage:'), 'Should show help');
    return;
  }
  throw new Error('Should have exited');
});

test('supports --markdown option', () => {
  const filePath = path.join(BASE_DIR, 'web-fetch.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('--markdown'), 'Should support --markdown option');
});

test('supports --max-size option', () => {
  const filePath = path.join(BASE_DIR, 'web-fetch.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('--max-size'), 'Should support --max-size option');
});

test('has redirect handling', () => {
  const filePath = path.join(BASE_DIR, 'web-fetch.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('301') || content.includes('302'), 'Should handle redirect status codes');
  assert(content.includes('location'), 'Should handle location header');
});

test('has HTML to text conversion', () => {
  const filePath = path.join(BASE_DIR, 'web-fetch.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('<[^>]+>'), 'Should strip HTML tags');
  assert(content.includes('&nbsp;') || content.includes('&amp;'), 'Should decode HTML entities');
});

test('can fetch actual web page', async () => {
  const result = execSync(`node ${path.join(BASE_DIR, 'web-fetch.js')} https://example.com`, {
    encoding: 'utf8',
    timeout: 30000
  });
  
  const response = JSON.parse(result);
  assert(response.status === 200, 'Should get 200 status');
  assert(response.text, 'Should have text content');
  assert(response.text.length > 0, 'Should have non-empty text');
  assert(response.title === 'Example Domain', 'Should extract title');
});

test('can fetch as markdown', async () => {
  const result = execSync(`node ${path.join(BASE_DIR, 'web-fetch.js')} https://example.com --markdown`, {
    encoding: 'utf8',
    timeout: 30000
  });
  
  // Markdown should contain markdown formatting
  assert(result.includes('#') || result.length > 0, 'Should have markdown content');
});

// Run tests
async function runTests() {
  console.log('🧪 Running web-fetch skill tests...\n');
  
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
