#!/usr/bin/env node

/**
 * Test suite for Git Ops Advanced skill
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEST_DIR = path.join(__dirname, 'test-tmp');

// Setup test environment
function setup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
  
  // Initialize git repo
  execSync('git init', { cwd: TEST_DIR, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: TEST_DIR, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: TEST_DIR, stdio: 'pipe' });
  
  // Create initial commit
  fs.writeFileSync(path.join(TEST_DIR, 'README.md'), '# Test Repo\n');
  execSync('git add .', { cwd: TEST_DIR, stdio: 'pipe' });
  execSync('git commit -m "Initial commit"', { cwd: TEST_DIR, stdio: 'pipe' });
  
  // Create a branch and commit
  execSync('git checkout -b feature/test', { cwd: TEST_DIR, stdio: 'pipe' });
  fs.writeFileSync(path.join(TEST_DIR, 'feature.js'), 'console.log("feature");\n');
  execSync('git add .', { cwd: TEST_DIR, stdio: 'pipe' });
  execSync('git commit -m "Add feature"', { cwd: TEST_DIR, stdio: 'pipe' });
  execSync('git checkout master', { cwd: TEST_DIR, stdio: 'pipe' });
  
  console.log('✓ Test environment set up');
}

function runCommand(args) {
  const argsStr = JSON.stringify(args.args);
  const result = execSync(
    `node "${path.resolve(__dirname, 'git-ops.js')}" ${args.command} '${argsStr}'`,
    { 
      encoding: 'utf-8', 
      cwd: TEST_DIR
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

// Test 1: List branches
function testBranches() {
  console.log('\n--- Test: List branches ---');
  
  const result = runCommand({ command: 'branches', args: { all: true } });
  
  assert(result.success === true, 'Should list branches');
  assert(result.branches && result.branches.length > 0, 'Should have branches');
  
  console.log(`Found ${result.branches.length} branches`);
}

// Test 2: Commit log
function testLog() {
  console.log('\n--- Test: Commit log ---');
  
  const result = runCommand({ command: 'log', args: { limit: 5, oneline: true } });
  
  assert(result.success === true, 'Should get log');
  assert(result.commits > 0, 'Should have commits');
  
  console.log(`Found ${result.commits} commits`);
}

// Test 3: Diff
function testDiff() {
  console.log('\n--- Test: Diff ---');
  
  // Make a change
  fs.appendFileSync(path.join(TEST_DIR, 'README.md'), 'Updated!\n');
  
  const result = runCommand({ command: 'diff', args: {} });
  
  assert(result.success === true, 'Should get diff');
  assert(result.hasChanges === true, 'Should show changes');
  
  // Reset
  execSync('git checkout README.md', { cwd: TEST_DIR, stdio: 'pipe' });
  
  console.log('Diff works!');
}

// Test 4: Status
function testStatus() {
  console.log('\n--- Test: Status ---');
  
  const result = runCommand({ command: 'status', args: { short: true } });
  
  assert(result.success === true, 'Should get status');
  assert(result.currentBranch, 'Should show branch');
  
  console.log(`On branch: ${result.currentBranch}`);
}

// Test 5: Diff with stat
function testDiffStat() {
  console.log('\n--- Test: Diff with stat ---');
  
  fs.appendFileSync(path.join(TEST_DIR, 'README.md'), 'More updates!\n');
  
  const result = runCommand({ command: 'diff', args: { stat: true } });
  
  assert(result.success === true, 'Should get diff stat');
  assert(result.files > 0, 'Should show file count');
  
  // Reset
  execSync('git checkout README.md', { cwd: TEST_DIR, stdio: 'pipe' });
  
  console.log('Diff stat works!');
}

// Main test runner
function runTests() {
  console.log('========================================');
  console.log('Git Ops Advanced Skill - Test Suite');
  console.log('========================================');
  
  try {
    setup();
    testBranches();
    testLog();
    testDiff();
    testStatus();
    testDiffStat();
    
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
