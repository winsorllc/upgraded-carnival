#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🧪 Testing image-processor...\n');

// Create dummy file
const dummyFile = '/tmp/test-image.jpg';
fs.writeFileSync(dummyFile, Buffer.from('fake-image-data'));

// Test info
const output = execSync(`node /job/.pi/skills/image-processor/img-info.js ${dummyFile}`, { encoding: 'utf8' });
assert(output.includes('JPEG'), 'Should detect JPEG');
assert(output.includes('size:'), 'Should have size');
console.log('  ✓ img-info.js works');

// Cleanup
fs.unlinkSync(dummyFile);

console.log('\n' + '='.repeat(50));
console.log('✅ All tests passed!');
console.log('='.repeat(50));
