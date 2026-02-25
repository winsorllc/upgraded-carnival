#!/usr/bin/env node
/**
 * PopeBot Doctor - Test Suite
 */

const doctor = require('../index');
const assert = require('assert');

// Test utilities
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.error(`   ${err.message}`);
    return false;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.error(`   ${err.message}`);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('\n🧪 PopeBot Doctor Test Suite\n');
  console.log('=' .repeat(50) + '\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Module exports
  if (test('Module exports all functions', () => {
    assert(doctor.popebotDoctorRun, 'popebotDoctorRun should exist');
    assert(doctor.popebotDoctorCheck, 'popebotDoctorCheck should exist');
    assert(doctor.popebotDoctorRepair, 'popebotDoctorRepair should exist');
    assert(doctor.popebotDoctorReport, 'popebotDoctorReport should exist');
    assert(doctor.version, 'version should exist');
  })) passed++; else failed++;
  
  // Test 2: Version check
  if (test('Version is defined', () => {
    assert.strictEqual(typeof doctor.version, 'string');
    assert(doctor.version.match(/^\d+\.\d+\.\d+$/));
  })) passed++; else failed++;
  
  // Test 3: Quick check
  if (await testAsync('Quick check runs successfully', async () => {
    const result = await doctor.popebotDoctorCheck({ category: 'environment' });
    assert.strictEqual(typeof result, 'boolean');
  })) passed++; else failed++;
  
  // Test 4: Full diagnostic
  if (await testAsync('Full diagnostic runs', async () => {
    const result = await doctor.popebotDoctorRun({ 
      categories: ['environment', 'config'] 
    });
    assert(typeof result === 'object' || typeof result === 'string');
    
    // If string, parse it
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    assert(parsed.items, 'Should have items');
    assert(parsed.summary, 'Should have summary');
    assert(typeof parsed.summary.ok === 'number');
    assert(typeof parsed.summary.warning === 'number');
    assert(typeof parsed.summary.error === 'number');
  })) passed++; else failed++;
  
  // Test 5: Report generation
  if (await testAsync('Report generation works', async () => {
    // First get some results
    const results = await doctor.popebotDoctorRun({ 
      categories: ['environment'],
      format: 'object' 
    });
    
    // Generate markdown report
    const report = await doctor.popebotDoctorReport({ 
      results: typeof results === 'string' ? JSON.parse(results) : results,
      format: 'markdown' 
    });
    
    assert(typeof report === 'string');
    assert(report.includes('PopeBot Doctor'));
    assert(report.includes('Summary'));
  })) passed++; else failed++;
  
  // Test 6: Repair dry-run
  if (await testAsync('Repair dry-run works', async () => {
    const result = await doctor.popebotDoctorRepair({ dryRun: true });
    assert(typeof result === 'object');
    assert.strictEqual(result.mode, 'dry-run');
  })) passed++; else failed++;
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('\n✨ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️ Some tests failed');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTests().catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
