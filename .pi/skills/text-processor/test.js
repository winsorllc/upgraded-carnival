#!/usr/bin/env node
/**
 * Test suite for Text Processor skill
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, 'processor.js');
const TEST_DIR = '/tmp/text-processor-test';

function setup() {
  if (fs.existsSync(TEST_DIR)) {
    execSync(`rm -rf ${TEST_DIR}`);
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
  
  // Create test files
  fs.writeFileSync(path.join(TEST_DIR, 'sample.txt'), `Hello World
This is a test file.
It has multiple lines.
Contact: test@example.com
Visit: https://example.com`);
  
  fs.writeFileSync(path.join(TEST_DIR, 'file1.txt'), `Line 1
Line 2
Line 3`);
  
  fs.writeFileSync(path.join(TEST_DIR, 'file2.txt'), `Line 1
Line 2 modified
Line 3
Line 4`);
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    execSync(`rm -rf ${TEST_DIR}`);
  }
}

function runCommand(cmd) {
  try {
    return {
      stdout: execSync(cmd, { encoding: 'utf8', timeout: 5000 }),
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
console.log('\n=== Text Processor Tests ===\n');

setup();

// Test 1: Case conversion
console.log('--- Test 1: Case conversion ---');
const test1 = runCommand(`node ${SCRIPT_PATH} case "Hello World" --to upper`);
const test1Json = JSON.parse(test1.stdout);
assert(test1Json.result.includes('HELLO WORLD'), 'Uppercase conversion works');

const test1b = runCommand(`node ${SCRIPT_PATH} case "Hello World" --to lower`);
const test1bJson = JSON.parse(test1b.stdout);
assert(test1bJson.result.includes('hello world'), 'Lowercase conversion works');

// Test 2: Format conversion
console.log('\n--- Test 2: Format conversion ---');
const test2 = runCommand(`node ${SCRIPT_PATH} format "hello_world" --to camel`);
const test2Json = JSON.parse(test2.stdout);
assert(test2Json.result === 'helloWorld', 'Snake to camel case works');

const test2b = runCommand(`node ${SCRIPT_PATH} format "helloWorld" --to snake`);
const test2bJson = JSON.parse(test2b.stdout);
assert(test2bJson.result === 'hello_world', 'Camel to snake case works');

// Test 3: Text statistics
console.log('\n--- Test 3: Text statistics ---');
const test3File = path.join(TEST_DIR, 'sample.txt');
const test3 = runCommand(`node ${SCRIPT_PATH} stats ${test3File}`);
const test3Json = JSON.parse(test3.stdout);
assert(test3Json.result.words === 14, 'Word count correct');
assert(test3Json.result.lines === 5, 'Line count correct');

// Test 4: Pattern extraction
console.log('\n--- Test 4: Pattern extraction ---');
const test4 = runCommand(`node ${SCRIPT_PATH} extract ${test3File} --pattern emails`);
const test4Json = JSON.parse(test4.stdout);
assert(test4Json.results.includes('test@example.com'), 'Email extracted');
assert(test4Json.count === 1, 'Found 1 email');

const test4b = runCommand(`node ${SCRIPT_PATH} extract ${test3File} --pattern urls`);
const test4bJson = JSON.parse(test4b.stdout);
assert(test4bJson.results.includes('https://example.com'), 'URL extracted');

// Test 5: Encode/decode
console.log('\n--- Test 5: Encode/decode ---');
const test5 = runCommand(`node ${SCRIPT_PATH} encode "Hello World" --method base64`);
const test5Json = JSON.parse(test5.stdout);
assert(test5Json.result === 'SGVsbG8gV29ybGQ=', 'Base64 encoding works');

const test5b = runCommand(`node ${SCRIPT_PATH} decode "SGVsbG8gV29ybGQ=" --method base64`);
const test5bJson = JSON.parse(test5b.stdout);
assert(test5bJson.result === 'Hello World', 'Base64 decoding works');

// Test 6: Diff
console.log('\n--- Test 6: Diff comparison ---');
const file1 = path.join(TEST_DIR, 'file1.txt');
const file2 = path.join(TEST_DIR, 'file2.txt');
const test6 = runCommand(`node ${SCRIPT_PATH} diff ${file1} ${file2}`);
const test6Json = JSON.parse(test6.stdout);
assert(test6Json.summary.deletions === 1, 'Found 1 deletion');
assert(test6Json.summary.additions === 2, 'Found 2 additions');

// Test 7: Metrics
console.log('\n--- Test 7: Text metrics ---');
const test7 = runCommand(`node ${SCRIPT_PATH} metrics ${test3File}`);
const test7Json = JSON.parse(test7.stdout);
assert(test7Json.result.readability !== undefined, 'Readability score calculated');
assert(test7Json.result.lexicalDiversity !== undefined, 'Lexical diversity calculated');

// Test 8: Find and replace
console.log('\n--- Test 8: Find and replace ---');
const test8 = runCommand(`node ${SCRIPT_PATH} replace ${test3File} --find "test" --replace "DEMO"`);
const test8Json = JSON.parse(test8.stdout);
assert(test8Json.result.includes('DEMO'), 'Replace works');

console.log('\n=== Text Processor Tests Complete ===\n');

cleanup();
