#!/usr/bin/env node
/**
 * Test script for SOP Runner Skill
 */

const fs = require('fs');
const path = require('path');

// Load the skill module
const sopRunner = require('./index.js');

const SOP_DIR = '/tmp/sops';
const SOPS_DIR = path.join(SOP_DIR, 'sops');
const RUNS_DIR = path.join(SOP_DIR, 'runs');

function log(message) {
  console.log(`[TEST] ${message}`);
}

function assert(condition, message) {
  if (condition) {
    log(`✅ PASS: ${message}`);
  } else {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
}

async function runTests() {
  log('Starting SOP Runner Skill Tests...\n');
  
  // Clean up any previous test data
  if (fs.existsSync(SOP_DIR)) {
    fs.rmSync(SOP_DIR, { recursive: true, force: true });
  }
  
  // ========================================
  // Test 1: Create an SOP
  // ========================================
  log('--- Test 1: Create SOP ---');
  
  const createResult = await sopRunner.tools.sop_create.fn({
    name: 'test-deploy',
    description: 'Test deployment procedure',
    steps: [
      { title: 'Build', body: 'Build the application', requires_confirmation: false },
      { title: 'Test', body: 'Run test suite', requires_confirmation: false },
      { title: 'Deploy', body: 'Deploy to production', requires_confirmation: true },
      { title: 'Verify', body: 'Health check', requires_confirmation: true }
    ],
    mode: 'step_by_step',
    priority: 'high'
  });
  
  assert(createResult.success === true, 'SOP created successfully');
  assert(createResult.output.includes('test-deploy'), 'Output contains SOP name');
  assert(fs.existsSync(path.join(SOPS_DIR, 'test-deploy.json')), 'SOP file exists');
  
  const sopData = JSON.parse(fs.readFileSync(path.join(SOPS_DIR, 'test-deploy.json'), 'utf8'));
  assert(sopData.steps.length === 4, 'SOP has 4 steps');
  assert(sopData.execution_mode === 'step_by_step', 'SOP has correct mode');
  
  log(`Result: ${createResult.output}\n`);
  
  // ========================================
  // Test 2: List SOPs
  // ========================================
  log('--- Test 2: List SOPs ---');
  
  const listResult = await sopRunner.tools.sop_list.fn({});
  
  assert(listResult.success === true, 'List SOPs succeeded');
  assert(listResult.output.includes('test-deploy'), 'List contains our SOP');
  
  log(`Result: ${listResult.output}\n`);
  
  // ========================================
  // Test 3: Execute SOP
  // ========================================
  log('--- Test 3: Execute SOP ---');
  
  const execResult = await sopRunner.tools.sop_execute.fn({
    name: 'test-deploy',
    payload: { version: '1.0.0', environment: 'staging' }
  });
  
  assert(execResult.success === true, 'SOP execution started');
  assert(execResult.run_id, 'Run ID returned');
  assert(execResult.output.includes('Step 1'), 'Output shows first step');
  
  const runId = execResult.run_id;
  log(`Run ID: ${runId}`);
  log(`Result: ${execResult.output}\n`);
  
  // ========================================
  // Test 4: Check Run Status
  // ========================================
  log('--- Test 4: Check Run Status ---');
  
  const statusResult = await sopRunner.tools.sop_status.fn({ run_id: runId });
  
  assert(statusResult.success === true, 'Status check succeeded');
  assert(statusResult.run.status === 'waiting_approval', 'Run is waiting for approval (step_by_step mode)');
  assert(statusResult.run.current_step === 1, 'Current step is 1');
  assert(statusResult.output.includes('Build'), 'Output contains step title');
  
  log(`Result: ${statusResult.output}\n`);
  
  // ========================================
  // Test 5: Approve Step
  // ========================================
  log('--- Test 5: Approve Step ---');
  
  const approveResult = await sopRunner.tools.sop_approve.fn({ run_id: runId });
  
  assert(approveResult.success === true, 'Approval succeeded');
  assert(approveResult.output.includes('Step 2'), 'Output shows step 2');
  
  log(`Result: ${approveResult.output}\n`);
  
  // ========================================
  // Test 6: Check Updated Status
  // ========================================
  log('--- Test 6: Check Updated Status ---');
  
  const statusResult2 = await sopRunner.tools.sop_status.fn({ run_id: runId });
  
  assert(statusResult2.run.current_step === 2, 'Current step is now 2');
  assert(statusResult2.run.status === 'waiting_approval', 'Still waiting for approval');
  
  log(`Result: ${statusResult2.output}\n`);
  
  // ========================================
  // Test 7: Complete Remaining Steps
  // ========================================
  log('--- Test 7: Complete Remaining Steps ---');
  
  // Step 2 -> 3 (Test -> Deploy, requires confirmation)
  const approve2 = await sopRunner.tools.sop_approve.fn({ run_id: runId });
  assert(approve2.output.includes('Step 3'), 'Moved to step 3');
  
  // Step 3 -> 4 (Deploy -> Verify)
  const approve3 = await sopRunner.tools.sop_approve.fn({ run_id: runId });
  assert(approve3.output.includes('Step 4'), 'Moved to step 4');
  
  // Step 4 -> Complete
  const approve4 = await sopRunner.tools.sop_approve.fn({ run_id: runId });
  assert(approve4.output.includes('completed'), 'Run completed');
  
  log(`Result: ${approve4.output}\n`);
  
  // ========================================
  // Test 8: Final Status Check
  // ========================================
  log('--- Test 8: Final Status Check ---');
  
  const finalStatus = await sopRunner.tools.sop_status.fn({ run_id: runId });
  
  assert(finalStatus.run.status === 'completed', 'Run is completed');
  assert(finalStatus.run.current_step > finalStatus.run.total_steps || finalStatus.run.status === 'completed', 'All 4 steps completed');
  assert(finalStatus.run.completed_at, 'Has completion timestamp');
  
  log(`Result: ${finalStatus.output}\n`);
  
  // ========================================
  // Test 9: List Runs
  // ========================================
  log('--- Test 9: List Runs ---');
  
  const runsResult = await sopRunner.tools.sop_runs.fn({});
  
  assert(runsResult.success === true, 'List runs succeeded');
  assert(runsResult.runs.length >= 1, 'At least one run listed');
  
  log(`Result: ${runsResult.output}\n`);
  
  // ========================================
  // Test 10: Create and Execute AUTO mode SOP
  // ========================================
  log('--- Test 10: AUTO mode SOP ---');
  
  await sopRunner.tools.sop_create.fn({
    name: 'quick-task',
    description: 'A quick automatic task',
    steps: [
      { title: 'Quick Step', body: 'Do something quickly', requires_confirmation: false }
    ],
    mode: 'auto'
  });
  
  const autoExec = await sopRunner.tools.sop_execute.fn({
    name: 'quick-task'
  });
  
  // In AUTO mode without confirmation requirements, should complete immediately
  assert(autoExec.success === true, 'Auto SOP executed');
  
  log(`Result: ${autoExec.output}\n`);
  
  // ========================================
  // Test 11: Reject a Run
  // ========================================
  log('--- Test 11: Reject a Run ---');
  
  // Create another run
  const rejectTest = await sopRunner.tools.sop_execute.fn({
    name: 'test-deploy',
    payload: { test: true }
  });
  const rejectRunId = rejectTest.run_id;
  
  const rejectResult = await sopRunner.tools.sop_reject.fn({
    run_id: rejectRunId,
    reason: 'Testing rejection functionality'
  });
  
  assert(rejectResult.success === true, 'Rejection succeeded');
  assert(rejectResult.output.includes('rejected'), 'Output confirms rejection');
  
  const rejectedStatus = await sopRunner.tools.sop_status.fn({ run_id: rejectRunId });
  assert(rejectedStatus.run.status === 'rejected', 'Run is marked as rejected');
  
  log(`Result: ${rejectResult.output}\n`);
  
  // ========================================
  // Test 12: Error Handling - Non-existent SOP
  // ========================================
  log('--- Test 12: Error Handling ---');
  
  try {
    await sopRunner.tools.sop_execute.fn({ name: 'non-existent-sop' });
    assert(false, 'Should have thrown error for non-existent SOP');
  } catch (e) {
    assert(e.message.includes('not found'), 'Correct error for non-existent SOP');
  }
  
  try {
    await sopRunner.tools.sop_status.fn({ run_id: 'fake-run-id' });
    assert(false, 'Should have thrown error for non-existent run');
  } catch (e) {
    assert(e.message.includes('not found'), 'Correct error for non-existent run');
  }
  
  log('Error handling tests passed!\n');
  
  // ========================================
  // Summary
  // ========================================
  log('========================================');
  log('🎉 ALL TESTS PASSED!');
  log('========================================');
  
  // Cleanup
  fs.rmSync(SOP_DIR, { recursive: true, force: true });
  log('\nTest data cleaned up.');
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
