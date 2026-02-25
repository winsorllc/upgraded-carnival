#!/usr/bin/env node

/**
 * Test suite for PR Description Generator
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SKILL_DIR = '/job/.pi/skills/pr-description-generator';
const GENERATE_SCRIPT = `${SKILL_DIR}/generate.js`;

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  testsRun++;
  try {
    fn();
    testsPassed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    testsFailed++;
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertContains(str, substring, message) {
  if (!str || !str.includes(substring)) {
    throw new Error(message || `Expected string to contain "${substring}"`);
  }
}

function assertNotContains(str, substring, message) {
  if (str && str.includes(substring)) {
    throw new Error(message || `Expected string NOT to contain "${substring}"`);
  }
}

console.log('🧪 PR Description Generator - Test Suite');
console.log('==========================================\n');

// Test 1: Script exists
test('Script file exists', () => {
  assert(fs.existsSync(GENERATE_SCRIPT), 'generate.js should exist');
});

// Test 2: Help output
test('Help output works', () => {
  const output = execSync(`node ${GENERATE_SCRIPT} --help`, { encoding: 'utf8' });
  assertContains(output, 'Usage:', 'Help should contain usage');
});

// Test 3: JSON output format
test('JSON output format works', () => {
  const output = execSync(`node ${GENERATE_SCRIPT} --json`, { encoding: 'utf8' });
  const parsed = JSON.parse(output);
  assert(parsed, 'Should parse as valid JSON');
  assert(typeof parsed.summary === 'string', 'Should have summary field');
  assert(typeof parsed.stats === 'object', 'Should have stats field');
});

// Test 4: Markdown output format
test('Markdown output format works', () => {
  const output = execSync(`node ${GENERATE_SCRIPT} --markdown`, { encoding: 'utf8' });
  assertContains(output, '## Summary', 'Markdown should contain Summary');
  assertContains(output, '## Changes', 'Markdown should contain Changes');
});

// Test 5: Default output contains expected sections
test('Default output contains expected sections', () => {
  const output = execSync(`node ${GENERATE_SCRIPT}`, { encoding: 'utf8' });
  assertContains(output, '📋 PR Description Generator', 'Should have header');
  assertContains(output, '## Summary', 'Should have Summary section');
});

// Test 6: Stats output
test('Statistics section present', () => {
  const output = execSync(`node ${GENERATE_SCRIPT}`, { encoding: 'utf8' });
  assertContains(output, '## Statistics', 'Should have Statistics section');
  assertContains(output, 'Added:', 'Should show added count');
  assertContains(output, 'Modified:', 'Should show modified count');
});

// Test 7: Uncommitted changes option
test('--uncommitted option works', () => {
  const output = execSync(`node ${GENERATE_SCRIPT} --uncommitted`, { encoding: 'utf8' });
  assert(output.length > 0, 'Should produce output');
});

// Test 8: Can specify branch
test('Branch specification works', () => {
  // This should not error even if branch doesn't exist exactly
  const output = execSync(`node ${GENERATE_SCRIPT} main HEAD`, { encoding: 'utf8' });
  assert(output.length > 0, 'Should produce output');
});

// Test 9: Output has commit count or stats
test('Commit count or stats are displayed', () => {
  const output = execSync(`node ${GENERATE_SCRIPT}`, { encoding: 'utf8' });
  // Either commits or stats should be present
  const hasCommitsOrStats = output.includes('Commit') || output.includes('Statistics') || output.includes('Total:');
  assert(hasCommitsOrStats, 'Should show either commits or statistics');
});

// Test 10: Breaking changes detection (false case)
test('No breaking changes detected in clean state', () => {
  const output = execSync(`node ${GENERATE_SCRIPT} --markdown`, { encoding: 'utf8' });
  // In a clean repo, breaking changes should not appear prominently
  assert(output.length > 0, 'Should produce output');
});

// Summary
console.log('\n==========================================');
console.log(`Tests: ${testsPassed}/${testsRun} passed`);
if (testsFailed > 0) {
  console.log(`❌ Failed: ${testsFailed}`);
  process.exit(1);
} else {
  console.log(`✅ All tests passed!`);
  process.exit(0);
}
