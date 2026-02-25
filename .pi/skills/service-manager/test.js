#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');

console.log('🧪 Testing service-manager...\n');

// Test 1: Files exist
const files = ['SKILL.md', 'service-status.js', 'service-list.js'];
files.forEach(f => {
  assert(fs.existsSync(`/job/.pi/skills/service-manager/${f}`), `Missing: ${f}`);
  console.log(`  ✓ ${f}`);
});

// Test 2: Module exports
console.log('\nTest 2: Module exports');
const statusMod = require('./service-status.js');
const listMod = require('./service-list.js');
assert(typeof statusMod.getProcessStatus === 'function', 'getProcessStatus should export');
assert(typeof listMod.listServices === 'function', 'listServices should export');
console.log('  ✓ Modules export correctly');

console.log('\n' + '='.repeat(50));
console.log('✅ All tests passed!');
console.log('='.repeat(50));
