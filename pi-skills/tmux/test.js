#!/usr/bin/env node
/**
 * Test for tmux skill
 */

const { spawnSync } = require('child_process');

console.log('Testing tmux skill CLI wrapper...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result) {
      console.log(`✓ ${name}`);
      passed++;
    } else {
      console.log(`✗ ${name}`);
      failed++;
    }
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
    failed++;
  }
}

// Test 1: Script can be required without syntax errors
test('Script loads without syntax errors', () => {
  try {
    require('./tmux.js');
    return true;
  } catch (e) {
    return false;
  }
});

// Test 2: Shows usage with no args
test('Shows usage with no args', () => {
  const result = spawnSync('node', ['tmux.js'], { encoding: 'utf-8' });
  return result.stderr.includes('Usage:');
});

// Test 3: Handles unknown commands
test('Handles unknown commands', () => {
  const result = spawnSync('node', ['tmux.js', 'invalid'], { encoding: 'utf-8' });
  return result.stderr.includes('Unknown command');
});

// Test 4: list command doesn't error on command parsing
test('List command parses correctly', () => {
  const result = spawnSync('node', ['tmux.js', 'list'], { encoding: 'utf-8' });
  // Should return valid JSON even if tmux isn't running
  try {
    const parsed = JSON.parse(result.stdout);
    return parsed !== null;
  } catch {
    return false;
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log('\n✓ All tests passed!');
