#!/usr/bin/env node
/**
 * Test suite for Log Analyzer skill
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, 'log-analyzer.js');
const TEST_DIR = '/tmp/log-analyzer-test';

function setup() {
  if (fs.existsSync(TEST_DIR)) {
    execSync(`rm -rf ${TEST_DIR}`);
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
  
  // Create sample log file
  const logContent = `2026-02-25T10:00:00Z INFO Server started
2026-02-25T10:01:00Z DEBUG Processing request
2026-02-25T10:02:00Z WARN Slow response
2026-02-25T10:03:00Z ERROR Connection timeout
2026-02-25T10:04:00Z ERROR Database error
2026-02-25T10:05:00Z INFO Request completed
2026-02-25T10:06:00Z INFO Another request
2026-02-25T10:07:00Z ERROR Timeout again
`;
  fs.writeFileSync(path.join(TEST_DIR, 'app.log'), logContent);
  
  // Create Nginx-like log
  const nginxLog = `192.168.1.1 - - [25/Feb/2026:10:00:00 +0000] "GET /index.html HTTP/1.1" 200 1234 "-" "Mozilla/5.0"
192.168.1.2 - - [25/Feb/2026:10:01:00 +0000] "GET /api/users HTTP/1.1" 200 512 "-" "curl/7.68"
192.168.1.1 - - [25/Feb/2026:10:02:00 +0000] "POST /api/login HTTP/1.1" 401 128 "-" "Mozilla/5.0"
`;
  fs.writeFileSync(path.join(TEST_DIR, 'nginx.log'), nginxLog);
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
console.log('\n=== Log Analyzer Tests ===\n');

setup();

// Test 1: Analyze log
console.log('--- Test 1: Analyze log file ---');
const test1 = runCommand(`node ${SCRIPT_PATH} analyze ${path.join(TEST_DIR, 'app.log')}`);
const test1Json = JSON.parse(test1.stdout);
assert(test1Json.stats !== undefined, 'Analysis has stats');
assert(test1Json.stats.totalLines === 8, 'Counted 8 lines (last newline creates empty line ignored in parse)');
assert(test1Json.stats.byLevel.error >= 2, 'Found at least 2 errors');

// Test 2: Search for pattern
console.log('\n--- Test 2: Search for pattern ---');
const test2 = runCommand(`node ${SCRIPT_PATH} search ${path.join(TEST_DIR, 'app.log')} --pattern "ERROR"`);
const test2Json = JSON.parse(test2.stdout);
assert(Array.isArray(test2Json), 'Search returns array');
assert(test2Json.length >= 2, 'Found at least 2 ERROR entries');
assert(test2Json.every(r => r.line.includes('ERROR')), 'All results contain ERROR');

// Test 3: Extract errors only
console.log('\n--- Test 3: Extract errors ---');
const test3 = runCommand(`node ${SCRIPT_PATH} errors ${path.join(TEST_DIR, 'app.log')}`);
const test3Json = JSON.parse(test3.stdout);
assert(Array.isArray(test3Json), 'Errors returns array');
assert(test3Json.length >= 2, 'Found errors');

// Test 4: Summary
console.log('\n--- Test 4: Get summary ---');
const test4 = runCommand(`node ${SCRIPT_PATH} summary ${path.join(TEST_DIR, 'app.log')}`);
const test4Json = JSON.parse(test4.stdout);
assert(test4Json.stats !== undefined, 'Summary has stats');
assert(test4Json.stats.byLevel !== undefined, 'Summary has level breakdown');

// Test 5: Analyze Nginx format
console.log('\n--- Test 5: Analyze Nginx log ---');
const test5 = runCommand(`node ${SCRIPT_PATH} analyze ${path.join(TEST_DIR, 'nginx.log')} --format nginx`);
const test5Json = JSON.parse(test5.stdout);
assert(test5Json.format === 'nginx', 'Detected nginx format');
assert(test5Json.stats.totalLines === 3, 'Counted 3 nginx lines');

// Test 6: Missing file
console.log('\n--- Test 6: Missing file handling ---');
const test6 = runCommand(`node ${SCRIPT_PATH} analyze /nonexistent.log`);
assert(test6.exitCode !== 0, 'Returns error for missing file');

// Test 7: Export to file
console.log('\n--- Test 7: Export to file ---');
const outputFile = path.join(TEST_DIR, 'output.json');
const test7 = runCommand(`node ${SCRIPT_PATH} summary ${path.join(TEST_DIR, 'app.log')} --output ${outputFile}`);
const test7Json = JSON.parse(test7.stdout);
assert(test7Json.saved === true, 'Output saved');
assert(fs.existsSync(outputFile), 'Output file created');

console.log('\n=== Log Analyzer Tests Complete ===\n');

cleanup();
