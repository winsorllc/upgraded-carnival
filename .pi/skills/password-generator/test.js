#!/usr/bin/env node
/**
 * Test suite for Password Generator skill
 */

const { execSync } = require('child_process');
const path = require('path');

const SCRIPT_PATH = path.join(__dirname, 'passgen.js');

function runCommand(cmd) {
  try {
    return {
      stdout: execSync(cmd, { encoding: 'utf8', timeout: 5000 }),
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
console.log('\n=== Password Generator Tests ===\n');

// Test 1: Generate password
console.log('--- Test 1: Generate password ---');
const test1 = runCommand(`node ${SCRIPT_PATH} password`);
const test1Json = JSON.parse(test1.stdout);
assert(test1Json.password !== undefined, 'Generated password');
assert(test1Json.password.length >= 16, 'Default length is 16');
assert(test1Json.strength !== undefined, 'Includes strength analysis');

// Test 2: Custom length
console.log('\n--- Test 2: Custom length password ---');
const test2 = runCommand(`node ${SCRIPT_PATH} password --length 24`);
const test2Json = JSON.parse(test2.stdout);
assert(test2Json.password.length === 24, 'Custom length works');

// Test 3: Passphrase generation
console.log('\n--- Test 3: Passphrase generation ---');
const test3 = runCommand(`node ${SCRIPT_PATH} passphrase --words 5`);
const test3Json = JSON.parse(test3.stdout);
const words = test3Json.passphrase.split('-');
assert(words.length === 5, 'Generated 5-word passphrase');
assert(test3Json.passphrase.includes('-'), 'Uses hyphen separator');

// Test 4: Token generation
console.log('\n--- Test 4: Token generation ---');
const test4 = runCommand(`node ${SCRIPT_PATH} token --length 32`);
const test4Json = JSON.parse(test4.stdout);
assert(test4Json.token !== undefined, 'Generated token');
assert(test4Json.token.length === 32, 'Correct token length');
assert(/^[a-f0-9]+$/.test(test4Json.token), 'Hex format by default');

// Test 5: Base64 token
console.log('\n--- Test 5: Base64 token ---');
const test5 = runCommand(`node ${SCRIPT_PATH} token --length 32 --format base64`);
const test5Json = JSON.parse(test5.stdout);
assert(test5Json.format === 'base64', 'Format is base64');
assert(!test5Json.token.includes('='), 'Base64 without padding');

// Test 6: Password strength check
console.log('\n--- Test 6: Password strength check ---');
const test6 = runCommand(`node ${SCRIPT_PATH} check "a"`);
const test6Json = JSON.parse(test6.stdout);
assert(test6Json.score === 0 || test6Json.score === 1, 'Very weak password scored low');
assert(test6Json.recommendations.length > 0, 'Has improvement recommendations');

const test6b = runCommand(`node ${SCRIPT_PATH} check "MyStr0ng#P@ssw0rd!123"`);
const test6bJson = JSON.parse(test6b.stdout);
assert(test6bJson.strength === 'Very Strong' || test6bJson.score >= 3, 'Strong password scored high');

// Test 7: Multiple passwords
console.log('\n--- Test 7: Multiple passwords ---');
const test7 = runCommand(`node ${SCRIPT_PATH} password --count 3`);
const test7Json = JSON.parse(test7.stdout);
assert(test7Json.passwords !== undefined, 'Returns passwords array');
assert(test7Json.passwords.length === 3, 'Generated 3 passwords');

// Test 8: Custom options
console.log('\n--- Test 8: Custom character sets ---');
const test8 = runCommand(`node ${SCRIPT_PATH} password --length 20 --upper --numbers`);
const test8Json = JSON.parse(test8.stdout);
assert(!/[a-z]/.test(test8Json.password), 'No lowercase when omitted');
assert(/[A-Z]/.test(test8Json.password), 'Has uppercase');
assert(/[0-9]/.test(test8Json.password), 'Has numbers');
console.log('\n=== Password Generator Tests Complete ===\n');
