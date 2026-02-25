#!/usr/bin/env node

/**
 * Test suite for Pushover skill
 */

const { execSync } = require('child_process');
const path = require('path');

function runCommand(args) {
  const argsStr = JSON.stringify(args.args);
  const result = execSync(
    `node "${path.resolve(__dirname, 'pushover.js')}" ${args.command} '${argsStr}'`,
    { encoding: 'utf-8' }
  );
  return JSON.parse(result);
}

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

console.log('========================================');
console.log('Pushover Skill - Test Suite');
console.log('========================================');

try {
  // Test 1: Missing message
  console.log('\n--- Test: Missing message ---');
  let result = runCommand({ command: 'send', args: {} });
  assert(result.success === false, 'Should fail without message');
  assert(result.error, 'Should return error');
  
  // Test 2: Missing credentials
  console.log('\n--- Test: Missing credentials ---');
  result = runCommand({ command: 'send', args: { message: 'Test' } });
  assert(result.success === false, 'Should fail without credentials');
  assert(result.setup, 'Should show setup instructions');
  
  // Test 3: Validate without credentials
  console.log('\n--- Test: Validate without credentials ---');
  result = runCommand({ command: 'validate', args: {} });
  assert(result.success === false, 'Should fail validation');
  assert(result.configured === false, 'Should show not configured');
  
  // Test 4: Unknown command
  console.log('\n--- Test: Unknown command ---');
  result = runCommand({ command: 'unknown', args: {} });
  assert(result.success === false, 'Should fail for unknown command');
  
  console.log('\n========================================');
  console.log('ALL TESTS PASSED! (credential tests as expected)');
  console.log('========================================');
  
  process.exit(0);
} catch (error) {
  console.error('\n========================================');
  console.error('TEST FAILED:', error.message);
  console.error('========================================');
  process.exit(1);
}
