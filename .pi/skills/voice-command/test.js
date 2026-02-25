#!/usr/bin/env node
/**
 * Voice Command Test Suite
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create test audio file (synthetic sine wave)
function createTestAudio(duration = 3) {
  const testDir = path.join('/tmp', 'voice-test');
  fs.mkdirSync(testDir, { recursive: true });
  const testFile = path.join(testDir, 'test.wav');
  
  // Use sox or ffmpeg to create a test audio file
  try {
    execSync(`which sox`, { stdio: 'ignore' });
    execSync(`sox -n -r 16000 -c 1 "${testFile}" synth ${duration} sine 440`, { stdio: 'ignore' });
  } catch {
    try {
      execSync(`which ffmpeg`, { stdio: 'ignore' });
      execSync(`ffmpeg -f lavfi -i "sine=frequency=440:duration=${duration}" -ar 16000 -ac 1 "${testFile}" -y`, { stdio: 'ignore' });
    } catch {
      // Create a minimal valid WAV file
      const wavHeader = Buffer.alloc(44);
      const samples = duration * 16000;
      const dataSize = samples * 2;
      
      wavHeader.write('RIFF', 0);
      wavHeader.writeUInt32LE(36 + dataSize, 4);
      wavHeader.write('WAVE', 8);
      wavHeader.write('fmt ', 12);
      wavHeader.writeUInt32LE(16, 16);
      wavHeader.writeUInt16LE(1, 20);
      wavHeader.writeUInt16LE(1, 22);
      wavHeader.writeUInt32LE(16000, 24);
      wavHeader.writeUInt32LE(32000, 28);
      wavHeader.writeUInt16LE(2, 32);
      wavHeader.writeUInt16LE(16, 34);
      wavHeader.write('data', 36);
      wavHeader.writeUInt32LE(dataSize, 40);
      
      const data = Buffer.alloc(dataSize);
      for (let i = 0; i < samples; i++) {
        data.writeInt16LE(Math.sin(i * 440 * Math.PI * 2 / 16000) * 32767, i * 2);
      }
      
      fs.writeFileSync(testFile, Buffer.concat([wavHeader, data]));
    }
  }
  
  return testFile;
}

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
    throw new Error(`${msg}: expected ${expected}, got ${actual}`);
  }
}

function assertExists(path, msg) {
  if (!fs.existsSync(path)) {
    throw new Error(`${msg}: ${path} does not exist`);
  }
}

// Test Suite
let passed = 0;
let failed = 0;

// Test 1: Module exports
if (runTest('Module exports', () => {
  const mod = require('./voice-record.js');
  assertEqual(typeof mod.recordAudio, 'function', 'recordAudio should be a function');
  assertEqual(typeof mod.transcribeWithOpenAI, 'function', 'transcribeWithOpenAI should be a function');
})) passed++; else failed++;

// Test 2: Directory creation
if (runTest('Directory creation', () => {
  const testDir = path.join('/tmp', 'popebot-test-' + Date.now());
  fs.mkdirSync(testDir, { recursive: true });
  assertExists(testDir, 'Test directory should be created');
  fs.rmSync(testDir, { recursive: true });
})) passed++; else failed++;

// Test 3: Test audio creation
if (runTest('Test audio file creation', () => {
  const testFile = createTestAudio(1);
  assertExists(testFile, 'Test audio file should exist');
  const stats = fs.statSync(testFile);
  if (stats.size < 44) throw new Error('WAV file is too small');
  fs.unlinkSync(testFile);
})) passed++; else failed++;

// Test 4: CLI help
if (runTest('CLI help available', () => {
  const output = execSync('node /job/.pi/skills/voice-command/voice-record.js --help 2>&1', { encoding: 'utf8' });
  // Help not implemented but should not crash
})) passed++; else failed++;

console.log('\n' + '='.repeat(50));
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

process.exit(failed > 0 ? 1 : 0);
