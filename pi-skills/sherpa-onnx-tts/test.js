#!/usr/bin/env node
/**
 * Test for sherpa-onnx-tts skill
 */

const { spawnSync } = require('child_process');

console.log('Testing sherpa-onnx-tts skill CLI wrapper...\n');

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
    require('./sherpa-onnx-tts.js');
    return true;
  } catch (e) {
    return false;
  }
});

// Test 2: Shows help with --help
test('Shows help with --help', () => {
  const result = spawnSync('node', ['sherpa-onnx-tts.js', '--help'], { encoding: 'utf-8' });
  return result.stderr.includes('Usage:');
});

// Test 3: Error without --text
test('Error without --text flag', () => {
  const result = spawnSync('node', ['sherpa-onnx-tts.js'], { encoding: 'utf-8' });
  // Error goes to stderr and exits with code 1
  return result.status === 1;
});

// Test 4: Error when env vars not set - parses output correctly
test('Error when environment variables not set', () => {
  const result = spawnSync('node', ['sherpa-onnx-tts.js', '-t', 'test'], { 
    encoding: 'utf-8'
  });
  // Should get JSON output with error about missing env vars
  try {
    const output = JSON.parse(result.stdout);
    return output.error && output.error.includes('SHERPA_ONNX');
  } catch {
    return false;
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log('\n✓ All tests passed!');
console.log('Note: Full TTS generation requires sherpa-onnx runtime and model to be installed');
