#!/usr/bin/env node

/**
 * CLI Discovery Skill Test Suite
 * Tests all functionality of the cli-discovery skill
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test utility
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    return false;
  }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

function assertContains(actual, substring, message) {
  if (!actual.includes(substring)) {
    throw new Error(`${message}\nExpected to contain: ${substring}\nActual: ${actual}`);
  }
}

function assertTrue(actual, message) {
  if (!actual) {
    throw new Error(`${message} - Expected true`);
  }
}

// Run tests
console.log('=== CLI Discovery Skill Tests ===\n');

let passed = 0;
let failed = 0;

// Test 1: Discover command finds tools
if (test('Discover finds git', () => {
  const output = execSync('node /job/pi-skills/cli-discovery/discover.js discover', { encoding: 'utf8' });
  const result = JSON.parse(output);
  assertTrue(result.total > 0, 'Should find at least some tools');
  assertTrue(result.tools.some(t => t.name === 'git'), 'Should find git');
})) passed++; else failed++;

// Test 2: Search finds tools by keyword (docker might not be installed)
if (test('Search works for known tools', () => {
  const output = execSync('node /job/pi-skills/cli-discovery/discover.js search docker', { encoding: 'utf8' });
  const result = JSON.parse(output);
  // Just check that search works - docker may not be installed
  assertTrue(result.matches !== undefined, 'Should return matches array');
})) passed++; else failed++;

// Test 3: Search finds git-related tools
if (test('Search finds git-related tools', () => {
  const output = execSync('node /job/pi-skills/cli-discovery/discover.js search git', { encoding: 'utf8' });
  const result = JSON.parse(output);
  assertTrue(result.matches.some(t => t.name === 'git'), 'Should find git');
})) passed++; else failed++;

// Test 4: Info returns version
if (test('Info returns version for curl', () => {
  const output = execSync('node /job/pi-skills/cli-discovery/discover.js info curl', { encoding: 'utf8' });
  const result = JSON.parse(output);
  assertTrue(result.version.length > 0, 'Should have version');
  assertTrue(result.version.includes('7.'), 'Version should start with 7');
})) passed++; else failed++;

// Test 5: Info returns options
if (test('Info returns parsed options for curl', () => {
  const output = execSync('node /job/pi-skills/cli-discovery/discover.js info curl', { encoding: 'utf8' });
  const result = JSON.parse(output);
  assertTrue(result.options.length > 0, 'Should have options parsed');
  assertTrue(result.options.some(o => o.flag.includes('-o')), 'Should have -o option');
})) passed++; else failed++;

// Test 6: Examples generates curl examples
if (test('Examples generates curl examples', () => {
  const output = execSync('node /job/pi-skills/cli-discovery/discover.js examples curl', { encoding: 'utf8' });
  const result = JSON.parse(output);
  assertTrue(result.examples.length > 0, 'Should generate examples');
  assertTrue(result.examples.some(e => e.includes('curl')), 'Should contain curl');
})) passed++; else failed++;

// Test 7: Examples generates git examples
if (test('Examples generates git examples', () => {
  const output = execSync('node /job/pi-skills/cli-discovery/discover.js examples git', { encoding: 'utf8' });
  const result = JSON.parse(output);
  assertTrue(result.examples.length > 0, 'Should generate examples');
  assertTrue(result.examples.some(e => e.includes('git push')), 'Should include git push');
})) passed++; else failed++;

// Test 8: Unknown tool returns error
if (test('Unknown tool returns error', () => {
  const output = execSync('node /job/pi-skills/cli-discovery/discover.js info nonexistent_tool_xyz', { encoding: 'utf8' });
  const result = JSON.parse(output);
  assertTrue(result.error !== undefined, 'Should have error field');
})) passed++; else failed++;

// Test 9: Clear cache works
if (test('Clear cache works', () => {
  const output = execSync('node /job/pi-skills/cli-discovery/discover.js clear-cache', { encoding: 'utf8' });
  assertContains(output, 'Cache cleared', 'Should confirm cache cleared');
})) passed++; else failed++;

// Test 10: NPM search
if (test('Search finds npm', () => {
  const output = execSync('node /job/pi-skills/cli-discovery/discover.js search npm', { encoding: 'utf8' });
  const result = JSON.parse(output);
  assertTrue(result.matches.some(t => t.name === 'npm'), 'Should find npm');
})) passed++; else failed++;

// Summary
console.log(`\n=== Test Results: ${passed}/${passed + failed} passed ===`);

if (failed > 0) {
  console.log('\n⚠️ Some tests failed');
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}
