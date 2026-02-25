#!/usr/bin/env node
/**
 * Test suite for File Watcher skill
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEMP_DIR = '/tmp/file-watcher-test';
const SCRIPT_PATH = path.join(__dirname, 'watcher.js');

function setup() {
  console.log('Setting up test environment...');
  if (fs.existsSync(TEMP_DIR)) {
    execSync(`rm -rf ${TEMP_DIR}`);
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function cleanup() {
  console.log('Cleaning up...');
  if (fs.existsSync(TEMP_DIR)) {
    execSync(`rm -rf ${TEMP_DIR}`);
  }
  
  // Stop all watchers
  try {
    execSync(`node ${SCRIPT_PATH} stop-all 2>/dev/null`);
  } catch (e) {
    // Ignore
  }
}

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 5000 });
  } catch (e) {
    return e.stdout || e.stderr || '';
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
console.log('\n=== File Watcher Tests ===\n');

setup();

// Test 1: Watch a file
console.log('\n--- Test 1: Watch file creation and modification ---');
const testFile = path.join(TEMP_DIR, 'test.txt');
const actionFile = path.join(TEMP_DIR, 'action.log');

// Start watcher in background with action that writes to actionFile
const watcherProcess = require('child_process').spawn('node', [
  SCRIPT_PATH,
  'watch',
  testFile,
  '--action',
  `echo "triggered" > ${actionFile}`,
  '--throttle',
  '50'
], { stdio: 'pipe' });

// Give watcher time to start
setTimeout(() => {
  // Create the file
  fs.writeFileSync(testFile, 'Hello');
  
  setTimeout(() => {
    // Modify the file
    fs.writeFileSync(testFile, 'World');
    
    setTimeout(() => {
      // Check if action was triggered
      const triggered = fs.existsSync(actionFile);
      assert(triggered, 'Action was triggered on file change');
      
      // Cleanup watcher
      watcherProcess.kill('SIGTERM');
      
      // Test 2: List watchers
      console.log('\n--- Test 2: List watchers ---');
      const listOutput = runCommand(`node ${SCRIPT_PATH} list`);
      assert(listOutput.includes('watchers'), 'List command returns watchers array');
      
      // Test 3: Stop all
      console.log('\n--- Test 3: Stop all watchers ---');
      const stopOutput = runCommand(`node ${SCRIPT_PATH} stop-all`);
      assert(stopOutput.includes('stopped-all'), 'Stop-all command works');
      
      console.log('\n=== File Watcher Tests Complete ===\n');
      cleanup();
    }, 500);
  }, 200);
}, 200);

// Safety timeout
setTimeout(() => {
  cleanup();
  process.exit(process.exitCode || 0);
}, 10000);
