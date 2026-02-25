#!/usr/bin/env node

/**
 * Test suite for Cron Manager Advanced skill
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEST_DIR = path.join(__dirname, 'test-tmp');
const CRON_DIR = path.join(TEST_DIR, '.crons');

// Setup test environment
function setup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(CRON_DIR, { recursive: true });
  console.log('✓ Test environment set up');
}

function runCommand(args) {
  const argsStr = JSON.stringify(args.args);
  const result = execSync(
    `node "${path.resolve(__dirname, 'cron-cli.js')}" ${args.command} '${argsStr}'`,
    { 
      encoding: 'utf-8', 
      env: { ...process.env, CRON_DIR }
    }
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

// Test 1: Add cron job
function testAddCron() {
  console.log('\n--- Test: Add cron job ---');
  
  const result = runCommand({
    command: 'add',
    args: {
      name: 'daily-backup',
      schedule: '0 3 * * *',
      command: '/usr/bin/backup.sh',
      description: 'Daily backup at 3am'
    }
  });
  
  assert(result.success === true, 'Should add cron');
  assert(result.cron.name === 'daily-backup', 'Should have correct name');
  
  console.log(`Added: ${result.cron.name}`);
}

// Test 2: Add cron with human-readable schedule
function testAddCronHuman() {
  console.log('\n--- Test: Add cron with human schedule ---');
  
  const result = runCommand({
    command: 'add',
    args: {
      name: 'hourly-check',
      schedule: 'at 5pm',
      command: '/usr/bin/check.sh'
    }
  });
  
  assert(result.success === true, 'Should add cron with human schedule');
  assert(result.cron.schedule.includes('17'), 'Should parse 5pm');
  
  console.log(`Schedule: ${result.cron.schedule}`);
}

// Test 3: List cron jobs
function testListCrons() {
  console.log('\n--- Test: List cron jobs ---');
  
  const result = runCommand({
    command: 'list',
    args: {}
  });
  
  assert(result.success === true, 'Should list crons');
  assert(result.crons.length >= 2, 'Should have cron jobs');
  
  console.log(`Found ${result.crons.length} cron jobs`);
}

// Test 4: List enabled-only cron jobs
function testListEnabled() {
  console.log('\n--- Test: List enabled cron jobs ---');
  
  // First disable one
  runCommand({ command: 'disable', args: { name: 'hourly-check', enabled: false } });
  
  const result = runCommand({
    command: 'list',
    args: { enabled: true }
  });
  
  assert(result.success === true, 'Should list enabled crons');
  assert(result.crons.every(c => c.enabled === true), 'All should be enabled');
  
  console.log(`Found ${result.crons.length} enabled cron jobs`);
}

// Test 5: Filter cron jobs
function testFilterCrons() {
  console.log('\n--- Test: Filter cron jobs ---');
  
  const result = runCommand({
    command: 'list',
    args: { filter: 'backup' }
  });
  
  assert(result.success === true, 'Should filter crons');
  assert(result.crons.length === 1, 'Should find backup cron');
  
  console.log(`Found: ${result.crons[0].name}`);
}

// Test 6: Disable cron job
function testDisableCron() {
  console.log('\n--- Test: Disable cron job ---');
  
  const result = runCommand({
    command: 'enable',
    args: { name: 'daily-backup', enabled: false }
  });
  
  assert(result.success === true, 'Should disable cron');
  
  // Verify
  const listResult = runCommand({ command: 'list', args: {} });
  const cron = listResult.crons.find(c => c.name === 'daily-backup');
  assert(cron.enabled === false, 'Should be disabled');
  
  console.log('Disabled daily-backup');
}

// Test 7: Enable cron job
function testEnableCron() {
  console.log('\n--- Test: Enable cron job ---');
  
  const result = runCommand({
    command: 'enable',
    args: { name: 'daily-backup', enabled: true }
  });
  
  assert(result.success === true, 'Should enable cron');
  
  console.log('Enabled daily-backup');
}

// Test 8: Remove cron job
function testRemoveCron() {
  console.log('\n--- Test: Remove cron job ---');
  
  const result = runCommand({
    command: 'remove',
    args: { name: 'hourly-check' }
  });
  
  assert(result.success === true, 'Should remove cron');
  
  // Verify
  const listResult = runCommand({ command: 'list', args: {} });
  assert(!listResult.crons.find(c => c.name === 'hourly-check'), 'Should be removed');
  
  console.log('Removed hourly-check');
}

// Test 9: Update cron job
function testUpdateCron() {
  console.log('\n--- Test: Update cron job ---');
  
  const result = runCommand({
    command: 'update',
    args: {
      name: 'daily-backup',
      schedule: '0 4 * * *',
      description: 'Updated backup description'
    }
  });
  
  assert(result.success === true, 'Should update cron');
  assert(result.cron.schedule === '0 4 * * *', 'Should update schedule');
  assert(result.cron.description === 'Updated backup description', 'Should update description');
  
  console.log('Updated daily-backup schedule');
}

// Main test runner
function runTests() {
  console.log('========================================');
  console.log('Cron Manager Advanced - Test Suite');
  console.log('========================================');
  
  try {
    setup();
    testAddCron();
    testAddCronHuman();
    testListCrons();
    testListEnabled();
    testFilterCrons();
    testDisableCron();
    testEnableCron();
    testRemoveCron();
    testUpdateCron();
    
    console.log('\n========================================');
    console.log('ALL TESTS PASSED! ✓');
    console.log('========================================');
    
    // Cleanup
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
    process.exit(0);
  } catch (error) {
    console.error('\n========================================');
    console.error('TEST FAILED:', error.message);
    console.error('========================================');
    process.exit(1);
  }
}

runTests();
