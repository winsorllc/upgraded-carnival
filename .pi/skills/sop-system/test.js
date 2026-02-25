#!/usr/bin/env node

/**
 * SOP System Test Suite
 * 
 * Tests the SOP system functionality including:
 * - SOP creation and registration
 * - Run management
 * - Approval flows
 * - State transitions
 * - Audit logging
 */

const fs = require('fs');
const path = require('path');
const sop = require('./sop.js');

// Test state
let passedTests = 0;
let failedTests = 0;
const failedMessages = [];

function test(name, fn) {
  try {
    fn();
    passedTests++;
    console.log(`✅ ${name}`);
  } catch (e) {
    failedTests++;
    failedMessages.push(`${name}: ${e.message}`);
    console.error(`❌ ${name}`);
    console.error(`   Error: ${e.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// Clean up test directories
function cleanup() {
  const runsDir = sop.getRunsDir();
  if (fs.existsSync(runsDir)) {
    const files = fs.readdirSync(runsDir);
    for (const file of files) {
      fs.unlinkSync(path.join(runsDir, file));
    }
  }
  
  // Remove test SOP
  const testSopDir = path.join(sop.getSopsDir(), 'test-sop');
  if (fs.existsSync(testSopDir)) {
    fs.rmSync(testSopDir, { recursive: true });
  }
  
  // Reset index
  const indexPath = path.join(sop.getSopsDir(), 'index.json');
  if (fs.existsSync(indexPath)) {
    fs.unlinkSync(indexPath);
  }
}

// Create test SOP
function createTestSop() {
  const sopDir = path.join(sop.getSopsDir(), 'test-sop');
  fs.mkdirSync(sopDir, { recursive: true });
  
  const manifest = {
    name: 'test-sop',
    description: 'Test SOP for unit tests',
    version: '1.0.0',
    priority: 'normal',
    executionMode: 'step_by_step',
    cooldownSecs: 0,
    maxConcurrent: 1,
    triggers: [{ type: 'manual' }],
    steps: [
      {
        number: 1,
        title: 'Step 1 - No Approval',
        requiresApproval: false,
        suggestedTools: ['shell']
      },
      {
        number: 2,
        title: 'Step 2 - Requires Approval',
        requiresApproval: true,
        approvalTimeoutMins: 5,
        suggestedTools: ['shell']
      },
      {
        number: 3,
        title: 'Step 3 - Final Step',
        requiresApproval: false,
        suggestedTools: ['shell']
      }
    ]
  };
  
  fs.writeFileSync(path.join(sopDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  sop.registerSop('test-sop', path.join(sopDir, 'manifest.json'));
  
  return manifest;
}

// ── Tests ────────────────────────────────────────────────────────

console.log('\n🧪 SOP System Test Suite\n');
console.log('─'.repeat(60));

// Cleanup before tests
cleanup();

test('Initialize SOP system', () => {
  const sops = sop.listSops();
  assert(Array.isArray(sops), 'Should return array');
});

test('Create test SOP', () => {
  const manifest = createTestSop();
  assertEqual(manifest.name, 'test-sop');
  assertEqual(manifest.steps.length, 3);
});

test('List SOPs includes test-sop', () => {
  const sops = sop.listSops();
  const testSop = sops.find(s => s.name === 'test-sop');
  assert(testSop, 'Should find test-sop');
  assertEqual(testSop.version, '1.0.0');
});

test('Load manifest', () => {
  const manifest = sop.loadManifest('test-sop');
  assertEqual(manifest.name, 'test-sop');
  assertEqual(manifest.executionMode, 'step_by_step');
});

test('Create run - step_by_step mode', () => {
  const run = sop.createRun('test-sop', { env: 'test' });
  assertEqual(run.sopName, 'test-sop');
  assertEqual(run.status, 'waiting_approval');
  assertEqual(run.totalSteps, 3);
  assertEqual(run.currentStep, 0);
  assert(run.runId.startsWith('sop_run_'), 'Run ID should have correct format');
  
  // Cleanup
  const runPath = path.join(sop.getRunsDir(), `${run.runId}.json`);
  if (fs.existsSync(runPath)) {
    fs.unlinkSync(runPath);
  }
  const auditPath = path.join(sop.getRunsDir(), `${run.runId}.audit.jsonl`);
  if (fs.existsSync(auditPath)) {
    fs.unlinkSync(auditPath);
  }
});

test('Create run with params', () => {
  const run = sop.createRun('test-sop', { param1: 'value1', param2: 'value2' });
  assertEqual(run.params.param1, 'value1');
  assertEqual(run.params.param2, 'value2');
  
  // Save for next test
  global.testRunId = run.runId;
});

test('Get run status', () => {
  const status = sop.getRunStatus(global.testRunId);
  assertEqual(status.runId, global.testRunId);
  assertEqual(status.status, 'waiting_approval');
  assertEqual(status.totalSteps, 3);
});

test('Start run', () => {
  const result = sop.startRun(global.testRunId);
  assertEqual(result.status, 'running');
  assertEqual(result.waitingSince, null);
});

test('Execute first step (no approval)', () => {
  const result = sop.executeNextStep(global.testRunId);
  assertEqual(result.awaitingApproval, false);
  assertEqual(result.readyToExecute, true);
  assertEqual(result.step.number, 1);
  assertEqual(result.step.title, 'Step 1 - No Approval');
});

test('Complete first step', () => {
  const run = sop.completeStep(global.testRunId, 1, 'Step 1 completed successfully');
  const stepResult = run.stepResults.find(sr => sr.stepNumber === 1);
  assertEqual(stepResult.status, 'completed');
  assertEqual(stepResult.output, 'Step 1 completed successfully');
});

test('Execute second step (requires approval)', () => {
  const result = sop.executeNextStep(global.testRunId);
  assertEqual(result.awaitingApproval, true);
  assertEqual(result.step.number, 2);
  assertEqual(result.step.title, 'Step 2 - Requires Approval');
  
  const run = sop.loadRun(global.testRunId);
  assertEqual(run.status, 'awaiting_approval');
  assert(run.waitingSince !== null, 'Should have waitingSince timestamp');
});

test('Approve step', () => {
  const result = sop.approveStep(global.testRunId, 2, 'Looks good!');
  assertEqual(result.success, true);
  assertEqual(result.status, 'approved');
  
  const run = sop.loadRun(global.testRunId);
  assertEqual(run.status, 'running');
});

test('Complete second step', () => {
  const run = sop.completeStep(global.testRunId, 2, 'Step 2 completed');
  const stepResult = run.stepResults.find(sr => sr.stepNumber === 2);
  assertEqual(stepResult.status, 'completed');
});

test('Execute third step', () => {
  const result = sop.executeNextStep(global.testRunId);
  assertEqual(result.awaitingApproval, false);
  assertEqual(result.step.number, 3);
});

test('Complete third step', () => {
  const run = sop.completeStep(global.testRunId, 3, 'Final step done');
  const stepResult = run.stepResults.find(sr => sr.stepNumber === 3);
  assertEqual(stepResult.status, 'completed');
});

test('Run completes after all steps', () => {
  const result = sop.executeNextStep(global.testRunId);
  assertEqual(result.status, 'completed');
  assert(result.completedAt !== null, 'Should have completedAt timestamp');
});

test('Get audit log', () => {
  const audit = sop.getAuditLog(global.testRunId);
  assertEqual(audit.runId, global.testRunId);
  assert(audit.events.length > 0, 'Should have audit events');
  
  const eventTypes = audit.events.map(e => e.eventType);
  assert(eventTypes.includes('run_created'), 'Should have run_created event');
  assert(eventTypes.includes('run_started'), 'Should have run_started event');
  assert(eventTypes.includes('step_started'), 'Should have step_started events');
  assert(eventTypes.includes('step_completed'), 'Should have step_completed events');
  assert(eventTypes.includes('approval_requested'), 'Should have approval_requested event');
  assert(eventTypes.includes('approval_granted'), 'Should have approval_granted event');
  assert(eventTypes.includes('run_completed'), 'Should have run_completed event');
});

test('List runs', () => {
  const runs = sop.listRuns('test-sop', null, 10);
  assert(runs.length >= 1, 'Should have at least one run');
  const ourRun = runs.find(r => r.runId === global.testRunId);
  assert(ourRun, 'Should find our test run');
  assertEqual(ourRun.status, 'completed');
});

test('Reject step flow', () => {
  // Create new run for reject test
  const run = sop.createRun('test-sop');
  sop.startRun(run.runId);
  sop.executeNextStep(run.runId);
  sop.completeStep(run.runId, 1, 'Step 1 done');
  sop.executeNextStep(run.runId);
  
  const result = sop.rejectStep(run.runId, 2, 'Test rejection');
  assertEqual(result.success, true);
  assertEqual(result.status, 'rejected');
  assertEqual(result.action, 'paused');
  
  const updatedRun = sop.loadRun(run.runId);
  assertEqual(updatedRun.status, 'paused');
});

test('Retry failed run', () => {
  const runs = sop.listRuns('test-sop', 'paused', 1);
  assert(runs.length > 0, 'Should have paused run');
  
  const runId = runs[0].runId;
  const retriedRun = sop.retryRun(runId);
  assertEqual(retriedRun.status, 'running');
  
  const failedStep = retriedRun.stepResults.find(sr => sr.stepNumber === 2);
  assertEqual(failedStep.status, 'pending');
  assertEqual(failedStep.error, null);
});

test('Cancel run', () => {
  const run = sop.createRun('test-sop');
  const cancelledRun = sop.cancelRun(run.runId, 'Test cancellation');
  assertEqual(cancelledRun.status, 'cancelled');
  assert(cancelledRun.completedAt !== null);
});

test('Pause and resume run', () => {
  const run = sop.createRun('test-sop');
  sop.startRun(run.runId);
  
  const pausedRun = sop.pauseRun(run.runId);
  assertEqual(pausedRun.status, 'paused');
  
  const resumedRun = sop.resumeRun(run.runId);
  assertEqual(resumedRun.status, 'running');
});

test('Auto mode SOP', () => {
  // Create auto mode SOP
  const sopDir = path.join(sop.getSopsDir(), 'auto-sop');
  fs.mkdirSync(sopDir, { recursive: true });
  
  const manifest = {
    name: 'auto-sop',
    description: 'Auto-executing SOP',
    version: '1.0.0',
    priority: 'low',
    executionMode: 'auto',
    cooldownSecs: 0,
    maxConcurrent: 1,
    triggers: [{ type: 'manual' }],
    steps: [
      { number: 1, title: 'Auto Step 1', requiresApproval: false },
      { number: 2, title: 'Auto Step 2', requiresApproval: false }
    ]
  };
  
  fs.writeFileSync(path.join(sopDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  sop.registerSop('auto-sop', path.join(sopDir, 'manifest.json'));
  
  const run = sop.createRun('auto-sop');
  assertEqual(run.status, 'running', 'Auto mode should start immediately');
  assertEqual(run.waitingSince, null);
  
  // Cleanup
  const runPath = path.join(sop.getRunsDir(), `${run.runId}.json`);
  if (fs.existsSync(runPath)) fs.unlinkSync(runPath);
  const auditPath = path.join(sop.getRunsDir(), `${run.runId}.audit.jsonl`);
  if (fs.existsSync(auditPath)) fs.unlinkSync(auditPath);
  fs.rmSync(sopDir, { recursive: true });
  sop.registerSop('auto-sop', path.join(sopDir, 'manifest.json')); // Unregister
});

test('Supervised mode SOP', () => {
  const sopDir = path.join(sop.getSopsDir(), 'supervised-sop');
  fs.mkdirSync(sopDir, { recursive: true });
  
  const manifest = {
    name: 'supervised-sop',
    description: 'Supervised SOP',
    version: '1.0.0',
    priority: 'normal',
    executionMode: 'supervised',
    cooldownSecs: 0,
    maxConcurrent: 1,
    triggers: [{ type: 'manual' }],
    steps: [
      { number: 1, title: 'Step 1', requiresApproval: false }
    ]
  };
  
  fs.writeFileSync(path.join(sopDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  sop.registerSop('supervised-sop', path.join(sopDir, 'manifest.json'));
  
  const run = sop.createRun('supervised-sop');
  assertEqual(run.status, 'waiting_approval', 'Supervised should wait before start');
  
  // Cleanup
  const runPath = path.join(sop.getRunsDir(), `${run.runId}.json`);
  if (fs.existsSync(runPath)) fs.unlinkSync(runPath);
  fs.rmSync(sopDir, { recursive: true });
});

// ── Summary ──────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(60));
console.log(`\n📊 Test Results: ${passedTests} passed, ${failedTests} failed\n`);

if (failedTests > 0) {
  console.log('❌ Failed tests:');
  for (const msg of failedMessages) {
    console.log(`  - ${msg}`);
  }
  process.exit(1);
} else {
  console.log('✅ All tests passed!\n');
  
  // Cleanup test data
  cleanup();
  
  // Re-init for user
  fs.mkdirSync(sop.getRunsDir(), { recursive: true });
  const indexPath = path.join(sop.getSopsDir(), 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify({ sops: {}, updatedAt: new Date().toISOString() }, null, 2));
}
