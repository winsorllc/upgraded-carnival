#!/usr/bin/env node

/**
 * Test for Component Health skill
 */

const { HealthMonitor } = require('./index.js');

async function runTests() {
  console.log('🧪 Testing Component Health skill...\n');
  
  let passed = 0;
  let failed = 0;
  const monitor = new HealthMonitor();

  // Test 1: Initial state
  try {
    const snapshot = monitor.getSnapshot();
    if (snapshot.pid && snapshot.uptime_seconds >= 0 && snapshot.components) {
      console.log('✅ Test 1: Initial health snapshot');
      passed++;
    } else {
      throw new Error('Snapshot missing required fields');
    }
  } catch (e) {
    console.log('❌ Test 1:', e.message);
    failed++;
  }

  // Test 2: Mark component OK
  try {
    monitor.markOk('database');
    const status = monitor.getStatus('database');
    if (status && status.status === 'ok' && status.lastOk) {
      console.log('✅ Test 2: Mark component OK');
      passed++;
    } else {
      throw new Error('Status not updated');
    }
  } catch (e) {
    console.log('❌ Test 2:', e.message);
    failed++;
  }

  // Test 3: Mark component error
  try {
    monitor.markError('api', 'Connection timeout');
    const status = monitor.getStatus('api');
    if (status && status.status === 'error' && status.lastError) {
      console.log('✅ Test 3: Mark component error');
      passed++;
    } else {
      throw new Error('Error not recorded');
    }
  } catch (e) {
    console.log('❌ Test 3:', e.message);
    failed++;
  }

  // Test 4: Mark component degraded
  try {
    monitor.markDegraded('cache', 'High latency');
    const status = monitor.getStatus('cache');
    if (status && status.status === 'degraded' && status.lastError) {
      console.log('✅ Test 4: Mark component degraded');
      passed++;
    } else {
      throw new Error('Degraded not recorded');
    }
  } catch (e) {
    console.log('❌ Test 4:', e.message);
    failed++;
  }

  // Test 5: List components
  try {
    const list = monitor.list();
    if (list.length >= 3) {
      console.log('✅ Test 5: List components');
      passed++;
    } else {
      throw new Error(`Expected at least 3 components, got ${list.length}`);
    }
  } catch (e) {
    console.log('❌ Test 5:', e.message);
    failed++;
  }

  // Test 6: Has errors check
  try {
    if (monitor.hasErrors() === true) {
      console.log('✅ Test 6: Has errors check');
      passed++;
    } else {
      throw new Error('Should have errors');
    }
  } catch (e) {
    console.log('❌ Test 6:', e.message);
    failed++;
  }

  // Test 7: Get error count
  try {
    if (monitor.getErrorCount() >= 1) {
      console.log('✅ Test 7: Get error count');
      passed++;
    } else {
      throw new Error('Error count should be >= 1');
    }
  } catch (e) {
    console.log('❌ Test 7:', e.message);
    failed++;
  }

  // Test 8: Reset component
  try {
    monitor.reset('api');
    const status = monitor.getStatus('api');
    if (!status) {
      console.log('✅ Test 8: Reset component');
      passed++;
    } else {
      throw new Error('Component not reset');
    }
  } catch (e) {
    console.log('❌ Test 8:', e.message);
    failed++;
  }

  // Test 9: Snapshot contains error components
  try {
    const snapshot = monitor.getSnapshot();
    const apiComponent = snapshot.components['api'];
    if (!apiComponent) {
      console.log('✅ Test 9: Snapshot after reset');
      passed++;
    } else {
      throw new Error('Reset component should not appear');
    }
  } catch (e) {
    console.log('❌ Test 9:', e.message);
    failed++;
  }

  // Test 10: Restart count bump
  try {
    monitor.bumpRestart('database');
    const status = monitor.getStatus('database');
    if (status && status.restartCount === 1) {
      console.log('✅ Test 10: Restart count bump');
      passed++;
    } else {
      throw new Error('Restart count not incremented');
    }
  } catch (e) {
    console.log('❌ Test 10:', e.message);
    failed++;
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
