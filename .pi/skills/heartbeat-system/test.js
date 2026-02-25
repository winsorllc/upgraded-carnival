#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const { runHeartbeat } = require('./heartbeat.js');

async function runTests() {
  console.log('🧪 Testing heartbeat-system...\n');

  // Test 1: Basic run
  console.log('Test 1: Basic heartbeat');
  const result = await runHeartbeat('/nonexistent');
  assert(result.timestamp, 'Should have timestamp');
  assert('healthy' in result, 'Should have healthy status');
  assert('metrics' in result, 'Should have metrics');
  console.log(`  ✓ Heartbeat ran: ${result.healthy ? 'healthy' : 'status unknown'}`);

  // Test 2: History file
  console.log('\nTest 2: History logging');
  const HISTORY_FILE = '/tmp/heartbeat-history.jsonl';
  if (fs.existsSync(HISTORY_FILE)) fs.unlinkSync(HISTORY_FILE);

  await runHeartbeat();
  assert(fs.existsSync(HISTORY_FILE), 'Should create history file');
  const lines = fs.readFileSync(HISTORY_FILE, 'utf8').trim().split('\n');
  assert(lines.length >= 1, 'Should have at least 1 entry');
  console.log(`  ✓ History written: ${lines.length} entries`);

  // Cleanup
  fs.unlinkSync(HISTORY_FILE);

  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests passed!');
  console.log('='.repeat(50));
}

runTests().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
