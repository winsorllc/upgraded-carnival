#!/usr/bin/env node
const assert = require('assert');
const { validateExpr, getNextRun, describe, listJobs } = require('./cron-utils.js');

console.log('🧪 Testing cron-manager...\n');

// Test 1: Validate valid expressions
console.log('Test 1: Valid expressions');
const validExprs = ['0 9 * * *', '*/15 * * * *', '0 0 * * 0', '0 9 * * 1-5'];
validExprs.forEach(expr => {
  const r = validateExpr(expr);
  assert(r.valid, `Should validate: ${expr}`);
  console.log(`  ✓ ${expr}`);
});

// Test 2: Validate invalid expressions
console.log('\nTest 2: Invalid expressions');
const invalidExprs = ['invalid', '60 * * * *', '* * *', '0 0 0 0 0 0'];
invalidExprs.forEach(expr => {
  const r = validateExpr(expr);
  assert(!r.valid, `Should reject: ${expr}`);
  console.log(`  ✓ Rejected: ${expr}`);
});

// Test 3: Describe
console.log('\nTest 3: Descriptions');
const descs = [
  ['0 9 * * *', 'at minute 0 at hour 9'],
  ['*/15 * * * *', 'every 15 minutes'],
  ['0 9 * * 1-5', 'at minute 0 at hour 9 on weekdays']
];
descs.forEach(([expr, expected]) => {
  const d = describe(expr);
  assert(d.includes(expected) || expected.includes(d), `Expected "${d}" to contain "${expected}"`);
  console.log(`  ✓ ${expr} = "${d}"`);
});

// Test 4: Next run
console.log('\nTest 4: Next run calculation');
const now = new Date('2026-02-25T10:00:00');
const next = getNextRun('0 9 * * *', now);
assert(next instanceof Date, 'Should return Date');
console.log(`  ✓ Get next run: ${next.toISOString()}`);

// Test 5: List jobs
console.log('\nTest 5: List jobs');
const fs = require('fs');
const testConfig = [
  { name: 'Test Job', schedule: '0 9 * * *', type: 'agent', job: 'test', enabled: true }
];
const tempPath = '/tmp/cron-test-config.json';
fs.writeFileSync(tempPath, JSON.stringify(testConfig));
const jobs = listJobs(tempPath);
assert(Array.isArray(jobs), 'Should return array');
assert(jobs.length === 1, 'Should have 1 job');
assert(jobs[0].name === 'Test Job', 'Should parse name');
assert(jobs[0].valid, 'Should validate');
console.log(`  ✓ List jobs works`);

fs.unlinkSync(tempPath);

console.log('\n' + '='.repeat(50));
console.log('✅ All tests passed!');
console.log('='.repeat(50));
