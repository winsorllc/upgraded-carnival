#!/usr/bin/env node
/**
 * Test suite for API Tester skill
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPT_PATH = path.join(__dirname, 'tester.js');
const TEST_SUITE_FILE = '/tmp/api-test-suite.json';

function runCommand(cmd) {
  try {
    return {
      stdout: execSync(cmd, { encoding: 'utf8', timeout: 15000 }),
      exitCode: 0
    };
  } catch (e) {
    return {
      stdout: e.stdout || '',
      stderr: e.stderr || '',
      exitCode: e.status || 1
    };
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
console.log('\n=== API Tester Tests ===\n');

// Test 1: Basic GET request to httpbin
console.log('--- Test 1: GET request to httpbin.org/get ---');
const test1 = runCommand(`node ${SCRIPT_PATH} get https://httpbin.org/get 2>/dev/null`);
const test1Json = JSON.parse(test1.stdout);
assert(test1Json.success === true, 'GET request succeeded');
assert(test1Json.status === 200, 'Response status 200');
assert(test1Json.body !== undefined, 'Response body parsed');

// Test 2: POST with JSON data
console.log('\n--- Test 2: POST request with JSON data ---');
const test2 = runCommand(`node ${SCRIPT_PATH} post https://httpbin.org/post -d '{"test":true}' 2>/dev/null`);
const test2Json = JSON.parse(test2.stdout);
assert(test2Json.success === true, 'POST request succeeded');
assert(test2Json.status === 200, 'Response status 200');
assert(JSON.stringify(test2Json.body).includes('test'), 'Posted data echoed');

// Test 3: Status validation (expecting wrong status)
console.log('\n--- Test 3: Status validation (expecting wrong status) ---');
const test3 = runCommand(`node ${SCRIPT_PATH} get https://httpbin.org/status/404 --expect-status 200 2>/dev/null`);
const test3Json = JSON.parse(test3.stdout);
assert(test3Json.success === false, 'Validation correctly failed');
assert(test3Json.errors.length > 0, 'Error message present');

// Test 4: Status validation (correct status)
console.log('\n--- Test 4: Status validation (correct status) ---');
const test4 = runCommand(`node ${SCRIPT_PATH} get https://httpbin.org/status/201 --expect-status 201 2>/dev/null`);
const test4Json = JSON.parse(test4.stdout);
assert(test4Json.success === true, 'Validation succeeded');

// Test 5: Test suite execution
console.log('\n--- Test 5: Test suite execution ---');
const testSuite = {
  name: "HttpBin Test Suite",
  baseUrl: "https://httpbin.org",
  defaults: {
    headers: {
      "Accept": "application/json"
    }
  },
  tests: [
    {
      name: "Get request",
      method: "GET",
      "path": "/get",
      expect: {
        status: 200
      }
    },
    {
      name: "Post request",
      method: "POST",
      "path": "/post",
      body: { test: true },
      expect: {
        status: 200
      }
    }
  ]
};

fs.writeFileSync(TEST_SUITE_FILE, JSON.stringify(testSuite, null, 2));
const test5 = runCommand(`node ${SCRIPT_PATH} run ${TEST_SUITE_FILE}`);
assert(test5.exitCode === 0, 'Test suite passed');
assert(test5.stdout.includes('2 passed') || test5.stderr.includes('2 passed'), 'Both tests reported passing');

// Cleanup
if (fs.existsSync(TEST_SUITE_FILE)) {
  fs.unlinkSync(TEST_SUITE_FILE);
}

console.log('\n=== API Tester Tests Complete ===\n');
