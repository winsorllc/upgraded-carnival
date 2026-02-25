#!/usr/bin/env node
/**
 * Test for nano-pdf skill
 * Validates the CLI wrapper script logic
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');

console.log('Testing nano-pdf skill CLI wrapper...\n');

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
    require('./nano-pdf.js');
    return true;
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') return true; // Expected for missing deps
    return false;
  }
});

// Test 2: Shows usage with no args
test('Shows usage with no args', () => {
  const result = spawnSync('node', ['nano-pdf.js'], { encoding: 'utf-8' });
  return result.stderr.includes('Usage:') || (result.stdout && result.stdout.includes('Usage:'));
});

// Test 3: Handles unknown commands
test('Handles unknown commands', () => {
  const result = spawnSync('node', ['nano-pdf.js', 'invalid'], { encoding: 'utf-8' });
  return (result.stderr && result.stderr.includes('Unknown command')) || 
         (result.stdout && result.stdout.includes('Unknown command'));
});

// Test 4: Edit command requires 3 args
test('Edit command shows error with missing args', () => {
  const result = spawnSync('node', ['nano-pdf.js', 'edit', 'test.pdf'], { encoding: 'utf-8' });
  return (result.stderr && result.stderr.includes('requires')) || 
         (result.stdout && result.stdout.includes('requires'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log('\n✓ All tests passed!');
console.log('Note: Full functionality requires nano-pdf to be installed (Python required in Docker container)');
