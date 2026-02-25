#!/usr/bin/env node

/**
 * Test script for cost-tracker skill
 * Simulates agent usage
 */

const { spawn } = require('child_process');
const path = require('path');

const COST_TRACKER = path.join(__dirname, 'cost-tracker.js');

function runCommand(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [COST_TRACKER, ...args], {
      stdio: 'pipe'
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => { stdout += data; });
    proc.stderr.on('data', (data) => { stderr += data; });
    
    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function runTests() {
  console.log('🧪 Testing Cost Tracker Skill\n');
  console.log('='.repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Summary command
  console.log('\n📋 Test 1: summary command');
  try {
    const result = await runCommand(['summary']);
    if (result.code === 0 && result.stdout.includes('Cost Summary')) {
      console.log('   ✅ PASSED');
      console.log('   Output:', result.stdout.split('\n').slice(0, 5).join('\n'));
      passed++;
    } else {
      console.log('   ❌ FAILED');
      console.log('   Error:', result.stderr);
      failed++;
    }
  } catch (e) {
    console.log('   ❌ FAILED:', e.message);
    failed++;
  }
  
  // Test 2: Breakdown command
  console.log('\n📋 Test 2: breakdown command');
  try {
    const result = await runCommand(['breakdown']);
    if (result.code === 0 && result.stdout.includes('Cost Breakdown')) {
      console.log('   ✅ PASSED');
      console.log('   Output:', result.stdout.split('\n').slice(0, 8).join('\n'));
      passed++;
    } else {
      console.log('   ❌ FAILED');
      console.log('   Error:', result.stderr);
      failed++;
    }
  } catch (e) {
    console.log('   ❌ FAILED:', e.message);
    failed++;
  }
  
  // Test 3: Job command
  console.log('\n📋 Test 3: job command');
  try {
    const result = await runCommand(['job', 'test-job-002']);
    if (result.code === 0 && result.stdout.includes('test-job-002')) {
      console.log('   ✅ PASSED');
      console.log('   Output:', result.stdout);
      passed++;
    } else {
      console.log('   ❌ FAILED');
      console.log('   Error:', result.stderr);
      failed++;
    }
  } catch (e) {
    console.log('   ❌ FAILED:', e.message);
    failed++;
  }
  
  // Test 4: Trend command
  console.log('\n📋 Test 4: trend command');
  try {
    const result = await runCommand(['trend']);
    if (result.code === 0 && result.stdout.includes('Daily Cost Trend')) {
      console.log('   ✅ PASSED');
      console.log('   Output:', result.stdout.split('\n').slice(0, 10).join('\n'));
      passed++;
    } else {
      console.log('   ❌ FAILED');
      console.log('   Error:', result.stderr);
      failed++;
    }
  } catch (e) {
    console.log('   ❌ FAILED:', e.message);
    failed++;
  }
  
  // Test 5: Compare command
  console.log('\n📋 Test 5: compare command');
  try {
    const result = await runCommand(['compare', 'last-7d', 'last-30d']);
    if (result.code === 0 && result.stdout.includes('Period Comparison')) {
      console.log('   ✅ PASSED');
      console.log('   Output:', result.stdout);
      passed++;
    } else {
      console.log('   ❌ FAILED');
      console.log('   Error:', result.stderr);
      failed++;
    }
  } catch (e) {
    console.log('   ❌ FAILED:', e.message);
    failed++;
  }
  
  // Test 6: Invalid job
  console.log('\n📋 Test 6: invalid job returns error');
  try {
    const result = await runCommand(['job', 'nonexistent-job']);
    if (result.code === 0 && result.stdout.includes('not found')) {
      console.log('   ✅ PASSED');
      console.log('   Output:', result.stdout);
      passed++;
    } else {
      console.log('   ❌ FAILED');
      console.log('   Expected "not found", got:', result.stdout);
      failed++;
    }
  } catch (e) {
    console.log('   ❌ FAILED:', e.message);
    failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('\n✅ All tests passed! Cost-tracker skill is working correctly.\n');
  } else {
    console.log('\n❌ Some tests failed. Please review the output above.\n');
    process.exit(1);
  }
}

runTests();
