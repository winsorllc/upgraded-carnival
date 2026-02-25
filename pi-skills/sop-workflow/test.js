#!/usr/bin/env node

/**
 * Test suite for SOP Workflow skill
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEST_DIR = path.join(__dirname, 'test-tmp');
let SOP_DIR; // Will be set in setup()

// Setup test environment
function setup() {
  // Clean up any existing test directory
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
  process.chdir(TEST_DIR);
  
  // Set absolute path for SOP_DIR after TEST_DIR is created
  SOP_DIR = path.join(TEST_DIR, '.sops');
  process.env.SOP_DIR = SOP_DIR;
  console.log('✓ Test environment set up (SOP_DIR: ' + SOP_DIR + ')');
}

function runCommand(args) {
  const env = { ...process.env, SOP_DIR };
  const argsStr = JSON.stringify(args.args);
  const cmd = `node ${path.join(__dirname, 'sop-cli.js')} ${args.command} '${argsStr.replace(/'/g, "'\\''")}'`;
  console.log('Running:', cmd);
  const result = execSync(cmd, { encoding: 'utf-8', env });
  return JSON.parse(result);
}

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

// Test 1: Create an SOP
function testCreateSop() {
  console.log('\n--- Test: Create SOP ---');
  
  const result = runCommand({
    command: 'create',
    args: {
      name: 'test-deployment',
      description: 'Test deployment SOP',
      priority: 'high',
      triggers: ['manual', 'webhook'],
      steps: [
        { title: 'Build', body: 'Build the project', requires_confirmation: false },
        { title: 'Deploy', body: 'Deploy to staging', requires_confirmation: true },
        { title: 'Verify', body: 'Verify deployment', requires_confirmation: false }
      ]
    }
  });
  
  assert(result.success === true, 'SOP should be created successfully');
  assert(result.output.includes('test-deployment'), 'Output should mention SOP name');
  assert(result.output.includes('3 steps'), 'Output should show step count');
  
  // Verify file was created
  const sopFile = path.join(SOP_DIR, 'test-deployment.json');
  assert(fs.existsSync(sopFile), 'SOP file should exist');
  
  console.log('SOP created and verified!');
}

// Test 2: List SOPs
function testListSops() {
  console.log('\n--- Test: List SOPs ---');
  
  const result = runCommand({ command: 'list', args: {} });
  
  assert(result.success === true, 'List should succeed');
  assert(result.output.includes('test-deployment'), 'Should show our test SOP');
  assert(result.output.includes('high'), 'Should show priority');
  
  console.log('SOP list works!');
}

// Test 3: List with filter
function testListWithFilter() {
  console.log('\n--- Test: List with filter ---');
  
  const result = runCommand({ 
    command: 'list', 
    args: { filter: 'high' } 
  });
  
  assert(result.success === true, 'Filtered list should succeed');
  assert(result.output.includes('test-deployment'), 'Should show filtered result');
  
  // Test non-matching filter
  const noResult = runCommand({ 
    command: 'list', 
    args: { filter: 'nonexistent' } 
  });
  
  assert(noResult.output.includes('No SOPs found'), 'Should handle no matches');
  
  console.log('Filter works!');
}

// Test 4: Execute SOP
function testExecuteSop() {
  console.log('\n--- Test: Execute SOP ---');
  
  const result = runCommand({ 
    command: 'execute', 
    args: { name: 'test-deployment' } 
  });
  
  assert(result.success === true, 'Execution should start');
  assert(result.run_id, 'Should return a run ID');
  assert(result.output.includes('Build') || result.output.includes('Step 1'), 'Should mention first step');
  
  // Save run ID for other tests
  fs.writeFileSync(path.join(TEST_DIR, 'last-run-id.txt'), result.run_id);
  
  console.log('SOP execution works!');
  return result.run_id;
}

// Test 5: Check status
function testStatusSop(runId) {
  console.log('\n--- Test: Status SOP ---');
  
  const result = runCommand({ 
    command: 'status', 
    args: { run_id: runId } 
  });
  
  assert(result.success === true, 'Status should succeed');
  assert(result.output.includes('test-deployment'), 'Should show SOP name');
  assert(result.output.includes('Step') || result.output.includes('Build'), 'Should show current step');
  assert(result.output.includes('pending'), 'Should show pending status');
  
  console.log('SOP status works!');
}

// Test 6: Approve step
function testApproveStep(runId) {
  console.log('\n--- Test: Approve Step ---');
  
  const result = runCommand({ 
    command: 'approve', 
    args: { run_id: runId } 
  });
  
  assert(result.success === true, 'Approval should succeed');
  assert(result.output.includes('approved'), 'Should confirm approval');
  
  console.log('SOP approval works!');
}

// Test 7: Advance step
function testAdvanceStep(runId) {
  console.log('\n--- Test: Advance Step ---');
  
  const result = runCommand({ 
    command: 'advance', 
    args: { run_id: runId } 
  });
  
  assert(result.success === true, 'Advance should succeed');
  assert(result.output.includes('step 2'), 'Should advance to step 2');
  
  console.log('SOP advance works!');
}

// Test 8: Complete SOP
function testCompleteSop(runId) {
  console.log('\n--- Test: Complete SOP ---');
  
  // First approve
  runCommand({ command: 'approve', args: { run_id: runId } });
  
  // Then advance to step 3 (final step)
  let result = runCommand({ command: 'advance', args: { run_id: runId } });
  assert(result.success === true, 'Advance to step 3 should succeed');
  
  // Approve and advance to completion
  runCommand({ command: 'approve', args: { run_id: runId } });
  result = runCommand({ command: 'advance', args: { run_id: runId } });
  
  assert(result.success === true, 'Complete should succeed');
  assert(result.output.includes('completed'), 'Should show completion');
  
  console.log('SOP completion works!');
}

// Test 9: Error handling
function testErrorHandling() {
  console.log('\n--- Test: Error Handling ---');
  
  // Missing name
  let result = runCommand({ command: 'create', args: {} });
  assert(result.success === false, 'Should fail without name');
  
  // Unknown SOP
  result = runCommand({ command: 'execute', args: { name: 'nonexistent' } });
  assert(result.success === false, 'Should fail for nonexistent SOP');
  
  // Unknown run ID
  result = runCommand({ command: 'status', args: { run_id: 'fake-id' } });
  assert(result.success === false, 'Should fail for nonexistent run');
  
  console.log('Error handling works!');
}

// Main test runner
function runTests() {
  console.log('========================================');
  console.log('SOP Workflow Skill - Test Suite');
  console.log('========================================');
  
  try {
    setup();
    testCreateSop();
    testListSops();
    testListWithFilter();
    const runId = testExecuteSop();
    testStatusSop(runId);
    testApproveStep(runId);
    testAdvanceStep(runId);
    testCompleteSop(runId);
    testErrorHandling();
    
    console.log('\n========================================');
    console.log('ALL TESTS PASSED! ✓');
    console.log('========================================');
    
    // Cleanup
    process.chdir('/');
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
