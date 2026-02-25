#!/usr/bin/env node

/**
 * Test for Heartbeat skill
 */

const fs = require('fs');
const path = require('path');
const { Heartbeat } = require('./index.js');

// Create temp test directories
const testDir = '/tmp/heartbeat-test-' + Date.now();
const heartbeatFile = path.join(testDir, 'HEARTBEAT.md');
const stateDir = path.join(testDir, 'data');

fs.mkdirSync(stateDir, { recursive: true });

// Create test HEARTBEAT.md
const testContent = `# Periodic Tasks

- Check my email for important messages
- Review calendar for upcoming events
- Check the weather forecast
`;

fs.writeFileSync(heartbeatFile, testContent);

async function runTests() {
  console.log('🧪 Testing Heartbeat skill...\n');
  
  let passed = 0;
  let failed = 0;

  const heartbeat = new Heartbeat({
    workspaceDir: testDir,
    intervalMinutes: 1
  });

  // Test 1: Parse tasks
  try {
    const tasks = heartbeat.parseTasks();
    if (tasks.length === 3 && tasks.includes('Check my email for important messages')) {
      console.log('✅ Test 1: Parse tasks from HEARTBEAT.md');
      passed++;
    } else {
      throw new Error(`Expected 3 tasks, got ${tasks.length}`);
    }
  } catch (e) {
    console.log('❌ Test 1:', e.message);
    failed++;
  }

  // Test 2: List tasks
  try {
    const tasks = heartbeat.listTasks();
    if (tasks.length === 3) {
      console.log('✅ Test 2: List tasks');
      passed++;
    } else {
      throw new Error('List mismatch');
    }
  } catch (e) {
    console.log('❌ Test 2:', e.message);
    failed++;
  }

  // Test 3: Add task
  try {
    heartbeat.addTask('New task');
    const tasks = heartbeat.listTasks();
    if (tasks.length === 4 && tasks.includes('New task')) {
      console.log('✅ Test 3: Add task');
      passed++;
    } else {
      throw new Error('Task not added');
    }
  } catch (e) {
    console.log('❌ Test 3:', e.message);
    failed++;
  }

  // Test 4: Remove task
  try {
    heartbeat.removeTask('New task');
    const tasks = heartbeat.listTasks();
    if (tasks.length === 3 && !tasks.includes('New task')) {
      console.log('✅ Test 4: Remove task');
      passed++;
    } else {
      throw new Error('Task not removed');
    }
  } catch (e) {
    console.log('❌ Test 4:', e.message);
    failed++;
  }

  // Test 5: Run heartbeat
  try {
    const result = await heartbeat.run();
    if (result && result.runId && result.results && result.results.length === 3) {
      console.log('✅ Test 5: Run heartbeat');
      passed++;
    } else {
      throw new Error('Run did not execute correctly');
    }
  } catch (e) {
    console.log('❌ Test 5:', e.message);
    failed++;
  }

  // Test 6: History
  try {
    const history = heartbeat.getHistory();
    if (history.length === 1 && history[0].tasks) {
      console.log('✅ Test 6: History tracking');
      passed++;
    } else {
      throw new Error('History not recorded');
    }
  } catch (e) {
    console.log('❌ Test 6:', e.message);
    failed++;
  }

  // Test 7: Get state
  try {
    const state = heartbeat.getState();
    if (state.runs && state.runs.length > 0) {
      console.log('✅ Test 7: State persistence');
      passed++;
    } else {
      throw new Error('State not persisted');
    }
  } catch (e) {
    console.log('❌ Test 7:', e.message);
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
