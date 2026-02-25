#!/usr/bin/env node

/**
 * Test suite for diff-tool skill
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

test('diff.js exists', () => {
  const filePath = path.join(BASE_DIR, 'diff.js');
  assert(fs.existsSync(filePath), 'diff.js should exist');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('computeDiff'), 'Should have computeDiff function');
  assert(content.includes('generateUnifiedDiff'), 'Should have generateUnifiedDiff function');
  assert(content.includes('generateReadableDiff'), 'Should have generateReadableDiff function');
});

test('SKILL.md is properly formatted', () => {
  const skillPath = path.join(BASE_DIR, 'SKILL.md');
  assert(fs.existsSync(skillPath), 'SKILL.md should exist');
  
  const content = fs.readFileSync(skillPath, 'utf8');
  assert(content.includes('---'), 'Should have YAML frontmatter');
  assert(content.includes('name: diff-tool'), 'Should have name field');
});

test('CLI shows help when no args', () => {
  try {
    execSync(`node ${path.join(BASE_DIR, 'diff.js')}`, {
      encoding: 'utf8',
      timeout: 5000
    });
  } catch (e) {
    const output = e.stdout || e.stderr;
    assert(output.includes('Diff Tool') || output.includes('Usage:'), 'Should show help');
    return;
  }
});

test('can compare identical files', () => {
  // Create temp identical files
  const tempDir = '/tmp/diff-test-' + Date.now();
  fs.mkdirSync(tempDir);
  
  const file1 = path.join(tempDir, 'file1.txt');
  const file2 = path.join(tempDir, 'file2.txt');
  
  fs.writeFileSync(file1, 'line 1\nline 2\nline 3\n');
  fs.writeFileSync(file2, 'line 1\nline 2\nline 3\n');
  
  const result = execSync(`node ${path.join(BASE_DIR, 'diff.js')} ${file1} ${file2} --json`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  const output = JSON.parse(result);
  assert(output.identical === true, 'Files should be identical');
  
  // Cleanup
  fs.unlinkSync(file1);
  fs.unlinkSync(file2);
  fs.rmdirSync(tempDir);
});

test('can detect modified lines', () => {
  const tempDir = '/tmp/diff-test-' + Date.now();
  fs.mkdirSync(tempDir);
  
  const file1 = path.join(tempDir, 'file1.txt');
  const file2 = path.join(tempDir, 'file2.txt');
  
  fs.writeFileSync(file1, 'line 1\nline 2\nline 3\n');
  fs.writeFileSync(file2, 'line 1\nmodified line\nline 3\n');
  
  const result = execSync(`node ${path.join(BASE_DIR, 'diff.js')} ${file1} ${file2} --json`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  const output = JSON.parse(result);
  assert(output.identical === false, 'Files should not be identical');
  assert(output.differences.length > 0, 'Should have differences');
  
  // Cleanup
  fs.unlinkSync(file1);
  fs.unlinkSync(file2);
  fs.rmdirSync(tempDir);
});

test('can detect added lines', () => {
  const tempDir = '/tmp/diff-test-' + Date.now();
  fs.mkdirSync(tempDir);
  
  const file1 = path.join(tempDir, 'file1.txt');
  const file2 = path.join(tempDir, 'file2.txt');
  
  fs.writeFileSync(file1, 'line 1\nline 2\n');
  fs.writeFileSync(file2, 'line 1\nline 2\nline 3\n');
  
  const result = execSync(`node ${path.join(BASE_DIR, 'diff.js')} ${file1} ${file2} --json`, {
    encoding: 'utf8',
    timeout: 5000
  });
  
  const output = JSON.parse(result);
  assert(output.identical === false, 'Files should not be identical');
  const added = output.differences.filter(d => d.type === 'added');
  assert(added.length > 0, 'Should have added line');
  
  // Cleanup
  fs.unlinkSync(file1);
  fs.unlinkSync(file2);
  fs.rmdirSync(tempDir);
});

test('supports --unified option', () => {
  const filePath = path.join(BASE_DIR, 'diff.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('--unified'), 'Should support --unified option');
});

test('supports --json option', () => {
  const filePath = path.join(BASE_DIR, 'diff.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('--json'), 'Should support --json option');
});

// Run tests
async function runTests() {
  console.log('🧪 Running diff-tool skill tests...\n');
  
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
