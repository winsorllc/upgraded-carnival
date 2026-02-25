#!/usr/bin/env node

/**
 * Test suite for gh-issues skill
 */

import { parseArgs } from './index.js';

console.log('🧪 Testing gh-issues skill...\n');

// Helper function
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, test) {
  if (actual === expected) {
    console.log(`  ✅ ${test}`);
    passed++;
  } else {
    console.log(`  ❌ ${test}: expected ${expected}, got ${actual}`);
    failed++;
  }
}

function assertTrue(condition, test) {
  if (condition) {
    console.log(`  ✅ ${test}`);
    passed++;
  } else {
    console.log(`  ❌ ${test}: expected true`);
    failed++;
  }
}

// Test 1: Parse basic arguments
console.log('Test 1: Parse basic arguments');
const result1 = parseArgs(['owner/repo', '--limit', '5']);
assertEqual(result1.repo, 'owner/repo', 'repo');
assertEqual(result1.limit, 5, 'limit');
assertEqual(result1.state, 'open', 'default state');
assertTrue(result1.dryRun === false, 'dryRun is false');

// Test 2: Parse with filters
console.log('\nTest 2: Parse with filters');
const result2 = parseArgs([
  'myorg/myrepo',
  '--label', 'bug',
  '--milestone', 'v1.0',
  '--assignee', '@me',
  '--state', 'all'
]);
assertEqual(result2.label, 'bug', 'label');
assertEqual(result2.milestone, 'v1.0', 'milestone');
assertEqual(result2.assignee, '@me', 'assignee');
assertEqual(result2.state, 'all', 'state');

// Test 3: Parse watch mode
console.log('\nTest 3: Parse watch mode');
const result3 = parseArgs(['owner/repo', '--watch', '--interval', '10']);
assertTrue(result3.watch === true, 'watch is true');
assertEqual(result3.interval, 10, 'interval');

// Test 4: Parse dry run
console.log('\nTest 4: Parse dry run');
const result4 = parseArgs(['owner/repo', '--dry-run', '--limit', '3']);
assertTrue(result4.dryRun === true, 'dryRun is true');
assertEqual(result4.limit, 3, 'limit');

// Test 5: Parse fork mode
console.log('\nTest 5: Parse fork mode');
const result5 = parseArgs(['upstream/repo', '--fork', 'myuser/repo']);
assertEqual(result5.fork, 'myuser/repo', 'fork');

// Test 6: Parse cron mode
console.log('\nTest 6: Parse cron mode');
const result6 = parseArgs(['owner/repo', '--cron']);
assertTrue(result6.cron === true, 'cron is true');
assertTrue(result6.yes === true, 'cron implies auto-yes');

// Test 7: Slugify function
console.log('\nTest 7: Slugify function');
assertEqual(slugify('Fix button color'), 'fix-button-color', 'basic slugify');
assertEqual(slugify('Issue #123: Bug!'), 'issue-123-bug', 'with special chars');
assertEqual(
  slugify('Long title with many words that should be truncated'), 
  'long-title-with-many-words-that-should-be-truncate', 
  'truncation'
);

// Test 8: Default values
console.log('\nTest 8: Default values');
const result8 = parseArgs([]);
assertEqual(result8.limit, 10, 'default limit');
assertEqual(result8.state, 'open', 'default state');
assertTrue(result8.watch === false, 'default watch');

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
console.log('\n✅ All tests passed!\n');
