#!/usr/bin/env node
/**
 * Test suite for git-ops skill
 */

const { status, log, branch, diff, remote, stash } = require('./git-ops.js');

console.log('🧪 Testing git-ops skill...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result.success) {
      console.log(`✅ ${name}`);
      passed++;
      return result;
    } else {
      console.log(`❌ ${name}: ${result.error}`);
      failed++;
      return result;
    }
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    failed++;
    return { success: false, error: e.message };
  }
}

// Test 1: Status
const statusResult = test('status command', () => status());
console.log('   Branch:', statusResult.data?.branch);

// Test 2: Log
const logResult = test('log command', () => log(5));
console.log('   Commits found:', logResult.data?.length);

// Test 3: Branch
const branchResult = test('branch command', () => branch());
console.log('   Current branch:', branchResult.data?.current);
console.log('   Local branches:', branchResult.data?.local?.length);

// Test 4: Diff
const diffResult = test('diff command', () => diff({ stat: true }));
console.log('   Files changed:', diffResult.data?.total?.files);

// Test 5: Remote
const remoteResult = test('remote command', () => remote());
console.log('   Remotes:', Object.keys(remoteResult.data || {}).join(', '));

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
