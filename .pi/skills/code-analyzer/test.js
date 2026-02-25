#!/usr/bin/env node
/**
 * Test suite for Code Analyzer skill
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, 'analyzer.js');
const TEST_DIR = '/tmp/code-analyzer-test';

function setup() {
  console.log('Setting up test environment...');
  if (fs.existsSync(TEST_DIR)) {
    execSync(`rm -rf ${TEST_DIR}`);
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
  
  // Create test files
  fs.writeFileSync(path.join(TEST_DIR, 'simple.js'), `
// Simple function
function hello() {
  console.log('Hello');
}
module.exports = hello;
`);
  
  fs.writeFileSync(path.join(TEST_DIR, 'complex.js'), `
// Complex function
function process(data) {
  if (data && data.items) {
    for (let i = 0; i < data.items.length; i++) {
      if (data.items[i].active) {
        while (data.items[i].count > 0) {
          if (data.items[i].type === 'a') {
            handleA();
          } else if (data.items[i].type === 'b') {
            handleB();
          } else if (data.items[i].type === 'c') {
            handleC();
          }
        }
      }
    }
  }
  return data && data.valid ? data : null;
}
`);
  
  fs.writeFileSync(path.join(TEST_DIR, 'duplicate-a.js'), `
function commonCode() {
  const x = 1;
  const y = 2;
  return x + y;
}
`);
  
  fs.writeFileSync(path.join(TEST_DIR, 'duplicate-b.js'), `
// Different file, same code
function commonCode() {
  const x = 1;
  const y = 2;
  return x + y;
}
`);
  
  // Create package.json
  fs.writeFileSync(path.join(TEST_DIR, 'package.json'), JSON.stringify({
    name: 'test-project',
    dependencies: {
      'lodash': '^4.17.0',
      'express': '^4.18.0'
    },
    devDependencies: {
      'jest': '^29.0.0'
    }
  }, null, 2));
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    execSync(`rm -rf ${TEST_DIR}`);
  }
}

function runCommand(cmd) {
  try {
    return {
      stdout: execSync(cmd, { encoding: 'utf8', timeout: 10000 }),
      exitCode: 0
    };
  } catch (e) {
    return { stdout: e.stdout || '', stderr: e.stderr || '', exitCode: e.status || 1 };
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ FAILED: ${message}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`✓ ${message}`);
  return true;
}

// Tests
console.log('\n=== Code Analyzer Tests ===\n');

setup();

// Test 1: Complexity analysis
console.log('--- Test 1: Complexity analysis ---');
const test1 = runCommand(`node ${SCRIPT_PATH} complexity ${TEST_DIR} --format json`);
const test1Json = JSON.parse(test1.stdout);
assert(Array.isArray(test1Json), 'Returns array of complexity results');
assert(test1Json.length === 4, 'Found 4 JavaScript files');
const simpleFile = test1Json.find(f => f.file === 'simple.js');
const complexFile = test1Json.find(f => f.file === 'complex.js');
assert(simpleFile && simpleFile.complexity < 10, 'Simple file has low complexity');
assert(complexFile && complexFile.complexity > 10, 'Complex file has higher complexity');

// Test 2: Duplicate detection
console.log('\n--- Test 2: Duplicate detection ---');
const test2 = runCommand(`node ${SCRIPT_PATH} duplicates ${TEST_DIR} --format json`);
const test2Json = JSON.parse(test2.stdout);
assert(Array.isArray(test2Json), 'Returns array of duplicates');

// Test 3: Dependency analysis
console.log('\n--- Test 3: Dependency analysis ---');
const test3 = runCommand(`node ${SCRIPT_PATH} deps ${TEST_DIR} --format json`);
const test3Json = JSON.parse(test3.stdout);
assert(test3Json.production.includes('lodash'), 'Finds lodash dependency');
assert(test3Json.production.includes('express'), 'Finds express dependency');
assert(test3Json.development.includes('jest'), 'Finds jest devDependency');

// Test 4: Single file analysis
console.log('\n--- Test 4: Single file analysis ---');
const test4 = runCommand(`node ${SCRIPT_PATH} file ${path.join(TEST_DIR, 'simple.js')} --format json`);
const test4Json = JSON.parse(test4.stdout);
assert(test4Json.file === 'simple.js', 'Returns file name');
assert(typeof test4Json.complexity === 'number', 'Returns complexity score');
assert(test4Json.lines, 'Returns line counts');

// Test 5: Full report
console.log('\n--- Test 5: Full report ---');
const test5 = runCommand(`node ${SCRIPT_PATH} report ${TEST_DIR} --format json`);
const test5Json = JSON.parse(test5.stdout);
assert(test5Json.summary, 'Report has summary section');
assert(test5Json.summary.totalFiles === 4, 'Report counts 4 files');
assert(test5Json.complexity, 'Report has complexity section');
assert(test5Json.duplicates, 'Report has duplicates section');
assert(test5Json.dependencies, 'Report has dependencies section');

console.log('\n=== Code Analyzer Tests Complete ===\n');

cleanup();
