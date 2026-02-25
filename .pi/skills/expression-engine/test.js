#!/usr/bin/env node
/**
 * Expression Engine Test Suite
 */

const { 
  expressions, 
  displayExpression, 
  generateLedPattern, 
  statusIndicator, 
  getExpression 
} = require('./express.js');

function runTest(name, fn) {
  console.log(`\n▶ ${name}`);
  try {
    fn();
    console.log('✓ PASSED');
    return true;
  } catch (err) {
    console.error('✗ FAILED:', err.message);
    return false;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected "${expected}", got "${actual}"`);
  }
}

function assertContains(str, substr, msg) {
  if (!str.includes(substr)) {
    throw new Error(`${msg}: "${str}" does not contain "${substr}"`);
  }
}

let passed = 0;
let failed = 0;

// Test 1: Expressions object
if (runTest('Expressions object defined', () => {
  assertEqual(typeof expressions, 'object', 'expressions should be object');
  assertEqual(Object.keys(expressions).length >= 6, true, 'should have at least 6 expressions');
})) passed++; else failed++;

// Test 2: Get expression
if (runTest('Get expression', () => {
  const happy = getExpression('happy');
  assertEqual(happy.emoji, '😊', 'happy emoji is correct');
  const sad = getExpression('SAD');
  assertEqual(sad.emoji, '😢', 'sad emoji is correct (case insensitive)');
})) passed++; else failed++;

// Test 3: Display expression
if (runTest('Display expression', () => {
  const output = displayExpression('happy');
  assertContains(output, '😊', 'output contains emoji');
})) passed++; else failed++;

// Test 4: JSON output
if (runTest('JSON output', () => {
  const json = displayExpression('working', { json: true });
  const obj = JSON.parse(json);
  assertEqual(obj.name, 'working', 'name is correct');
  assertContains(obj.emoji, '⚙', 'emoji is correct');
})) passed++; else failed++;

// Test 5: LED pattern generation
if (runTest('LED pattern generation', () => {
  const pattern = generateLedPattern('excited');
  assertEqual(pattern.expression, 'excited', 'expression name correct');
  assertContains(pattern.description, 'rapid', 'description is correct');
})) passed++; else failed++;

// Test 6: Status indicator
if (runTest('Status indicator', () => {
  const status = statusIndicator('success', 'Done!');
  assertContains(status, 'Done!', 'status contains message');
  assertContains(status, '✅', 'status contains emoji');
})) passed++; else failed++;

// Test 7: ASCII mode
if (runTest('ASCII mode', () => {
  const ascii = displayExpression('thinking', { ascii: true });
  assertContains(ascii, '?', 'ascii contains question mark');
})) passed++; else failed++;

console.log('\n' + '='.repeat(50));
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

process.exit(failed > 0 ? 1 : 0);
