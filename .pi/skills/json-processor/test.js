#!/usr/bin/env node
/**
 * Test suite for JSON Processor skill
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, 'json.js');
const TEST_DIR = '/tmp/json-processor-test';

function setup() {
  if (fs.existsSync(TEST_DIR)) {
    execSync(`rm -rf ${TEST_DIR}`);
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
  
  // Create test JSON file
  const testData = {
    users: [
      { id: 1, name: 'Alice', age: 30, active: true },
      { id: 2, name: 'Bob', age: 17, active: false },
      { id: 3, name: 'Charlie', age: 25, active: true }
    ],
    config: {
      debug: false,
      timeout: 30
    },
    prices: [10.99, 20.50, 15.00, 8.75]
  };
  
  fs.writeFileSync(path.join(TEST_DIR, 'data.json'), JSON.stringify(testData, null, 2));
  
  // Create invalid JSON
  fs.writeFileSync(path.join(TEST_DIR, 'invalid.json'), '{"invalid json');
  
  // Create CSV file
  fs.writeFileSync(path.join(TEST_DIR, 'data.csv'), `
name,age,email
Alice,30,alice@example.com
Bob,17,bob@example.com
`.trim());
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
console.log('\n=== JSON Processor Tests ===\n');

setup();

// Test 1: Validate valid JSON
console.log('--- Test 1: Validate JSON ---');
const test1 = runCommand(`node ${SCRIPT_PATH} validate ${path.join(TEST_DIR, 'data.json')}`);
const test1Json = JSON.parse(test1.stdout);
assert(test1Json.valid === true, 'Valid JSON passes validation');

const test1b = runCommand(`node ${SCRIPT_PATH} validate ${path.join(TEST_DIR, 'invalid.json')}`);
const test1bJson = JSON.parse(test1b.stdout);
assert(test1bJson.valid === false, 'Invalid JSON fails validation');

// Test 2: Query JSON path
console.log('\n--- Test 2: Query JSON paths ---');
const test2 = runCommand(`node ${SCRIPT_PATH} query ${path.join(TEST_DIR, 'data.json')} "users.0.name"`);
assert(test2.stdout.trim() === '"Alice"', 'Query nested path works');

const test2b = runCommand(`node ${SCRIPT_PATH} query ${path.join(TEST_DIR, 'data.json')} "config.debug"`);
assert(test2b.stdout.trim() === 'false', 'Query boolean value works');

// Test 3: Filter array
console.log('\n--- Test 3: Filter array ---');
const test3 = runCommand(`node ${SCRIPT_PATH} filter ${path.join(TEST_DIR, 'data.json')} "users[age>=18]"`);
const test3Json = JSON.parse(test3.stdout);
assert(test3Json.length === 2, 'Filter returns 2 users aged >= 18');

const test3b = runCommand(`node ${SCRIPT_PATH} filter ${path.join(TEST_DIR, 'data.json')} "users[active=true]"`);
const test3bJson = JSON.parse(test3b.stdout);
assert(test3bJson.length === 2, 'Filter active users works');

// Test 4: JSON to CSV
console.log('\n--- Test 4: Convert JSON to CSV ---');
const test4 = runCommand(`node ${SCRIPT_PATH} convert ${path.join(TEST_DIR, 'data.json')} --to csv`);
const test4Result = test4.stdout;
// Note: convert on root object returns array data

// Test 5: Statistics
console.log('\n--- Test 5: Calculate statistics ---');
const test5 = runCommand(`node ${SCRIPT_PATH} stats ${path.join(TEST_DIR, 'data.json')} "prices"`);
const test5Json = JSON.parse(test5.stdout);
assert(test5Json.count === 4, 'Counts all 4 prices');
assert(test5Json.mean !== undefined, 'Calculates mean');
assert(test5Json.min === 8.75, 'Finds minimum');
assert(test5Json.max === 20.50, 'Finds maximum');

// Test 6: Format JSON
console.log('\n--- Test 6: Format JSON ---');
const test6 = runCommand(`node ${SCRIPT_PATH} format ${path.join(TEST_DIR, 'data.json')} --indent 4`);
const test6Json = JSON.parse(test6.stdout);
assert(test6Json.users !== undefined, 'Formatted JSON is valid');

// Test 7: Minify JSON
console.log('\n--- Test 7: Minify JSON ---');
const test7 = runCommand(`node ${SCRIPT_PATH} minify ${path.join(TEST_DIR, 'data.json')}`);
const minified = test7.stdout.trim();
assert(!minified.includes('\n'), 'Minified has no newlines');
assert(minified.length < fs.readFileSync(path.join(TEST_DIR, 'data.json'), 'utf8').length, 'Minified is smaller');

// Test 8: Generate schema
console.log('\n--- Test 8: Generate schema ---');
const test8 = runCommand(`node ${SCRIPT_PATH} schema ${path.join(TEST_DIR, 'data.json')}`);
const test8Json = JSON.parse(test8.stdout);
assert(test8Json.$schema !== undefined, 'Generated schema has $schema');
assert(test8Json.type === 'object', 'Schema detects object type');
assert(test8Json.properties !== undefined, 'Schema has properties');

// Test 9: Set value and save
console.log('\n--- Test 9: Set value in JSON ---');
const dataFile = path.join(TEST_DIR, 'data.json');
runCommand(`node ${SCRIPT_PATH} set "${dataFile}" "config.debug" true --in-place`);
const updatedData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
assert(updatedData.config.debug === true, 'Value updated in file');

// Test 10: Merge JSON
console.log('\n--- Test 10: Merge JSON files ---');
const file1 = path.join(TEST_DIR, 'merge1.json');
const file2 = path.join(TEST_DIR, 'merge2.json');
fs.writeFileSync(file1, JSON.stringify({ a: 1, b: 2 }));
fs.writeFileSync(file2, JSON.stringify({ b: 3, c: 4 }));

const test10 = runCommand(`node ${SCRIPT_PATH} merge "${file1}" "${file2}"`);
const test10Json = JSON.parse(test10.stdout);
assert(test10Json.a === 1, 'Merge keeps unique keys from file1');
assert(test10Json.b === 3, 'Merge overwrites with file2 values');
assert(test10Json.c === 4, 'Merge adds unique keys from file2');

console.log('\n=== JSON Processor Tests Complete ===\n');

cleanup();
