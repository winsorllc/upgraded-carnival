#!/usr/bin/env node

/**
 * Test for SOP Workflow skill
 */

const fs = require('fs');
const path = require('path');
const { SopEngine } = require('./index.js');

// Create temp test directories
const testDir = '/tmp/sop-test-' + Date.now();
const configDir = path.join(testDir, 'config');
const stateDir = path.join(testDir, 'data', 'sops');

fs.mkdirSync(configDir, { recursive: true });
fs.mkdirSync(stateDir, { recursive: true });

// Create test SOP config
const testSops = [
  {
    name: 'Test Deploy',
    description: 'Test deployment SOP',
    triggers: ['manual'],
    steps: [
      {
        id: 'build',
        name: 'Build',
        action: { type: 'command', command: 'echo building' }
      },
      {
        id: 'test',
        name: 'Test',
        action: { type: 'command', command: 'echo testing' }
      },
      {
        id: 'approval',
        name: 'Manual Approval',
        type: 'approval',
        approvers: ['@admin']
      }
    ],
    on_failure: 'rollback'
  }
];

fs.writeFileSync(path.join(configDir, 'SOPS.json'), JSON.stringify(testSops, null, 2));

async function runTests() {
  console.log('🧪 Testing SOP Workflow skill...\n');
  
  let passed = 0;
  let failed = 0;

  const engine = new SopEngine({ 
    sopsDir: configDir, 
    stateDir: stateDir 
  });

  // Test 1: Load SOPs
  try {
    const sops = engine.loadSops();
    if (sops.length === 1 && sops[0].name === 'Test Deploy') {
      console.log('✅ Test 1: Load SOPs');
      passed++;
    } else {
      throw new Error('SOP not loaded correctly');
    }
  } catch (e) {
    console.log('❌ Test 1:', e.message);
    failed++;
  }

  // Test 2: List SOPs
  try {
    const list = engine.listSops();
    if (list.length === 1 && list[0].steps === 3) {
      console.log('✅ Test 2: List SOPs');
      passed++;
    } else {
      throw new Error('List mismatch');
    }
  } catch (e) {
    console.log('❌ Test 2:', e.message);
    failed++;
  }

  // Test 3: Get SOP by name
  try {
    const sop = engine.getSop('Test Deploy');
    if (sop && sop.steps && sop.steps.length === 3) {
      console.log('✅ Test 3: Get SOP by name');
      passed++;
    } else {
      throw new Error('SOP not found');
    }
  } catch (e) {
    console.log('❌ Test 3:', e.message);
    failed++;
  }

  // Test 4: Get non-existent SOP
  try {
    const sop = engine.getSop('NonExistent');
    if (!sop) {
      console.log('✅ Test 4: Get non-existent SOP returns null');
      passed++;
    } else {
      throw new Error('Should have returned null');
    }
  } catch (e) {
    console.log('❌ Test 4:', e.message);
    failed++;
  }

  // Test 5: Start a run (mock execution)
  try {
    // Override executeSteps to avoid actual execution
    engine.executeSteps = async () => {};
    
    const run = await engine.startRun('Test Deploy');
    if (run && run.runId && run.status === 'running') {
      console.log('✅ Test 5: Start SOP run');
      passed++;
    } else {
      throw new Error('Run not started correctly');
    }
  } catch (e) {
    console.log('❌ Test 5:', e.message);
    failed++;
  }

  // Test 6: Approve step
  try {
    // Create a pending run
    engine.activeRuns.clear();
    engine.executeSteps = async () => {};
    
    const run = await engine.startRun('Test Deploy');
    const approved = engine.approveStep(run.runId, 'approval');
    
    if (approved && approved.approval && approved.approval.approved === true) {
      console.log('✅ Test 6: Approve step');
      passed++;
    } else {
      throw new Error('Approval not recorded');
    }
  } catch (e) {
    console.log('❌ Test 6:', e.message);
    failed++;
  }

  // Test 7: Reject step
  try {
    engine.activeRuns.clear();
    engine.executeSteps = async () => {};
    
    const run = await engine.startRun('Test Deploy');
    const rejected = engine.rejectStep(run.runId, 'approval', 'Not ready');
    
    if (rejected && rejected.approval.approved === false && rejected.status === 'rejected') {
      console.log('✅ Test 7: Reject step');
      passed++;
    } else {
      throw new Error('Rejection not recorded');
    }
  } catch (e) {
    console.log('❌ Test 7:', e.message);
    failed++;
  }

  // Test 8: Cancel run
  try {
    engine.activeRuns.clear();
    engine.executeSteps = async () => {};
    
    const run = await engine.startRun('Test Deploy');
    const cancelled = engine.cancelRun(run.runId);
    
    if (cancelled && cancelled.status === 'cancelled') {
      console.log('✅ Test 8: Cancel run');
      passed++;
    } else {
      throw new Error('Cancellation not recorded');
    }
  } catch (e) {
    console.log('❌ Test 8:', e.message);
    failed++;
  }

  // Cleanup
  fs.rmSync(testDir, { recursive: true, force: true });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
