#!/usr/bin/env node
/**
 * Test suite for Clipboard skill
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, 'clip.js');
const TEST_DIR = '/tmp/clipboard-test';
const CLIPBOARD_FILE = '/tmp/popebot-clipboard.json';

function setup() {
  // Clear any existing clipboard
  if (fs.existsSync(CLIPBOARD_FILE)) {
    fs.unlinkSync(CLIPBOARD_FILE);
  }
  
  if (fs.existsSync(TEST_DIR)) {
    execSync(`rm -rf ${TEST_DIR}`);
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
  
  // Create test file
  fs.writeFileSync(path.join(TEST_DIR, 'input.txt'), 'Test file content');
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    execSync(`rm -rf ${TEST_DIR}`);
  }
  if (fs.existsSync(CLIPBOARD_FILE)) {
    fs.unlinkSync(CLIPBOARD_FILE);
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
console.log('\n=== Clipboard Tests ===\n');

setup();

// Test 1: Copy and paste
console.log('--- Test 1: Copy and Paste ---');
const test1 = runCommand(`node ${SCRIPT_PATH} copy "Hello World"`);
const test1Json = JSON.parse(test1.stdout);
assert(test1Json.copied === true, 'Copy returns success');
assert(test1Json.length === 11, 'Correct length reported');

const test1b = runCommand(`node ${SCRIPT_PATH} paste`);
const pastedContent = test1b.stdout.trim();
assert(pastedContent === '"Hello World"', 'Paste returns clipboard content');

// Test 2: Copy file
console.log('\n--- Test 2: Copy File ---');
const test2 = runCommand(`node ${SCRIPT_PATH} copy-file ${path.join(TEST_DIR, 'input.txt')}`);
const test2Json = JSON.parse(test2.stdout);
assert(test2Json.copied === true, 'Copy file returns success');

const test2b = runCommand(`node ${SCRIPT_PATH} show`);
const showContent = test2b.stdout.trim();
assert(showContent === '"Test file content"', 'File content in clipboard');

// Test 3: Append and prepend
console.log('\n--- Test 3: Append and Prepend ---');
runCommand(`node ${SCRIPT_PATH} copy "Hello"`);
const test3 = runCommand(`node ${SCRIPT_PATH} append " World"`);
const test3Json = JSON.parse(test3.stdout);
assert(test3Json.appended === true, 'Append returned success');

const test3b = runCommand(`node ${SCRIPT_PATH} paste`);
const appendedContent = test3b.stdout.trim();
assert(appendedContent === '"Hello World"', 'Append worked correctly');

const test3c = runCommand(`node ${SCRIPT_PATH} prepend "Say: "`);
const test3cJson = JSON.parse(test3c.stdout);
assert(test3cJson.prepended === true, 'Prepend returned success');

// Test 4: Save to file
console.log('\n--- Test 4: Save to File ---');
const outputFile = path.join(TEST_DIR, 'output.txt');
const test4 = runCommand(`node ${SCRIPT_PATH} save ${outputFile}`);
const test4Json = JSON.parse(test4.stdout);
assert(test4Json.saved === true, 'Save returned success');
assert(fs.existsSync(outputFile), 'File was created');
const savedContent = fs.readFileSync(outputFile, 'utf8');
assert(savedContent === 'Say: Hello World', 'Correct content saved');

// Test 5: Clear
console.log('\n--- Test 5: Clear Clipboard ---');
const test5 = runCommand(`node ${SCRIPT_PATH} clear`);
const test5Json = JSON.parse(test5.stdout);
assert(test5Json.cleared === true, 'Clear returned success');

const test5b = runCommand(`node ${SCRIPT_PATH} show`);
const clearedContent = test5b.stdout.trim();
assert(clearedContent === '""', 'Clipboard is empty after clear');

// Test 6: History
console.log('\n--- Test 6: History ---');
runCommand(`node ${SCRIPT_PATH} copy "One"`);
runCommand(`node ${SCRIPT_PATH} copy "Two"`);
runCommand(`node ${SCRIPT_PATH} copy "Three"`);

const test6 = runCommand(`node ${SCRIPT_PATH} history --limit 3`);
const test6Json = JSON.parse(test6.stdout);
assert(test6Json.totalItems === 3, 'History has 3 items');
assert(test6Json.history.length === 3, 'Returned 3 history items');

// Test 7: History set
console.log('\n--- Test 7: History Set ---');
const test7 = runCommand(`node ${SCRIPT_PATH} history-set 1`);
const test7Json = JSON.parse(test7.stdout);
assert(test7Json.set === true, 'History set returned success');

console.log('\n=== Clipboard Tests Complete ===\n');

cleanup();
