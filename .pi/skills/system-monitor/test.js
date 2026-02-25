#!/usr/bin/env node
/**
 * Test suite for system-monitor skill
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('🧪 Testing system-monitor skill...\n');

// Test 1: Check if skill files exist
console.log('Test 1: Check skill files exist');
const requiredFiles = ['SKILL.md', 'system-doctor.js', 'system-status.js'];
const skillDir = __dirname;

requiredFiles.forEach(file => {
  const filePath = path.join(skillDir, file);
  assert(fs.existsSync(filePath), `Missing file: ${file}`);
  console.log(`  ✓ ${file} exists`);
});

// Test 2: Check if SKILL.md is valid
console.log('\nTest 2: Check SKILL.md structure');
const skillMd = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
assert(skillMd.includes('name:'), 'SKILL.md missing name field');
assert(skillMd.includes('description:'), 'SKILL.md missing description field');
assert(skillMd.includes('# System Monitor'), 'SKILL.md missing header');
console.log('  ✓ SKILL.md has valid structure');

// Test 3: Test module exports
console.log('\nTest 3: Check module exports');
const doctor = require('./system-doctor.js');
const status = require('./system-status.js');

assert(typeof doctor.runDiagnostics === 'function', 'runDiagnostics not exported');
assert(typeof doctor.CHECKS === 'object', 'CHECKS not exported');
assert(typeof status.getStatus === 'function', 'getStatus not exported');
console.log('  ✓ All modules export correctly');

// Test 4: Test individual check functions
console.log('\nTest 4: Test individual checks');
(async () => {
  try {
    // Test disk check
    const diskResult = await doctor.CHECKS.disk();
    assert(typeof diskResult === 'object', 'Disk check should return object');
    assert('healthy' in diskResult, 'Disk check should have healthy property');
    console.log('  ✓ Disk check works');

    // Test memory check
    const memResult = await doctor.CHECKS.memory();
    assert(typeof memResult === 'object', 'Memory check should return object');
    assert('healthy' in memResult, 'Memory check should have healthy property');
    console.log('  ✓ Memory check works');

    // Test CPU check
    const cpuResult = await doctor.CHECKS.cpu();
    assert(typeof cpuResult === 'object', 'CPU check should return object');
    assert('healthy' in cpuResult, 'CPU check should have healthy property');
    console.log('  ✓ CPU check works');

    // Test Node check
    const nodeResult = await doctor.CHECKS.node();
    assert(typeof nodeResult === 'object', 'Node check should return object');
    assert('healthy' in nodeResult, 'Node check should have healthy property');
    assert(nodeResult.version, 'Node check should return version');
    console.log('  ✓ Node check works');

    // Test Git check
    const gitResult = await doctor.CHECKS.git();
    assert(typeof gitResult === 'object', 'Git check should return object');
    assert('healthy' in gitResult, 'Git check should have healthy property');
    assert(gitResult.version, 'Git check should return version');
    console.log('  ✓ Git check works');

    // Test status module
    const statusResult = status.getStatus();
    assert(typeof statusResult === 'object', 'getStatus should return object');
    assert('timestamp' in statusResult, 'Status should have timestamp');
    assert('healthy' in statusResult, 'Status should have healthy property');
    assert('checks' in statusResult, 'Status should have checks property');
    console.log('  ✓ Status module works');

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests passed!');
    console.log('='.repeat(50));
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
