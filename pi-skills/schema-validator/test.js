#!/usr/bin/env node
/**
 * Test for schema-validator skill
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Testing schema-validator skill...\n');

let passed = 0;
let failed = 0;

// Create temp test files
const testDir = '/tmp/schema-test-' + Date.now();
fs.mkdirSync(testDir, { recursive: true });

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

// Test 1: Script loads without syntax errors
test('Script loads without syntax errors', () => {
  try {
    require('./schema-validator.js');
    return true;
  } catch (e) {
    return false;
  }
});

// Test 2: Shows help with --help
test('Shows help with --help', () => {
  const result = spawnSync('node', ['schema-validator.js', '--help'], { encoding: 'utf-8' });
  return result.stderr.includes('Usage:');
});

// Test 3: Valid JSON passes validation
test('Valid JSON passes validation', () => {
  const schema = { type: 'object', properties: { name: { type: 'string' } } };
  const data = { name: 'test' };
  
  fs.writeFileSync(path.join(testDir, 'schema.json'), JSON.stringify(schema));
  fs.writeFileSync(path.join(testDir, 'data.json'), JSON.stringify(data));
  
  const result = spawnSync('node', [
    'schema-validator.js',
    '--schema', path.join(testDir, 'schema.json'),
    '--data', path.join(testDir, 'data.json')
  ], { encoding: 'utf-8' });
  
  try {
    const output = JSON.parse(result.stdout);
    return output.valid === true;
  } catch {
    return false;
  }
});

// Test 4: Invalid type fails validation
test('Invalid type fails validation', () => {
  const schema = { type: 'object', properties: { name: { type: 'string' } } };
  const data = { name: 123 };
  
  fs.writeFileSync(path.join(testDir, 'schema2.json'), JSON.stringify(schema));
  fs.writeFileSync(path.join(testDir, 'data2.json'), JSON.stringify(data));
  
  const result = spawnSync('node', [
    'schema-validator.js',
    '--schema', path.join(testDir, 'schema2.json'),
    '--data', path.join(testDir, 'data2.json')
  ], { encoding: 'utf-8' });
  
  try {
    const output = JSON.parse(result.stdout);
    return output.valid === false;
  } catch {
    return false;
  }
});

// Test 5: Missing required property fails
test('Missing required property fails', () => {
  const schema = { 
    type: 'object', 
    required: ['name'],
    properties: { name: { type: 'string' } } 
  };
  const data = { other: 'value' };
  
  fs.writeFileSync(path.join(testDir, 'schema3.json'), JSON.stringify(schema));
  fs.writeFileSync(path.join(testDir, 'data3.json'), JSON.stringify(data));
  
  const result = spawnSync('node', [
    'schema-validator.js',
    '--schema', path.join(testDir, 'schema3.json'),
    '--data', path.join(testDir, 'data3.json')
  ], { encoding: 'utf-8' });
  
  try {
    const output = JSON.parse(result.stdout);
    return output.valid === false && output.errors.some(e => e.message.includes('required'));
  } catch {
    return false;
  }
});

// Test 6: Check schema mode
test('Check schema mode works', () => {
  const schema = { type: 'object', properties: { name: { type: 'string' } } };
  fs.writeFileSync(path.join(testDir, 'schema4.json'), JSON.stringify(schema));
  
  const result = spawnSync('node', [
    'schema-validator.js',
    '--check-schema', path.join(testDir, 'schema4.json')
  ], { encoding: 'utf-8' });
  
  try {
    const output = JSON.parse(result.stdout);
    return output.valid === true;
  } catch {
    return false;
  }
});

// Cleanup
fs.rmSync(testDir, { recursive: true, force: true });

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log('\n✓ All tests passed!');
