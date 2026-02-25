#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🧪 Testing notification-center...\n');

// Test 1: Send notification
console.log('Test 1: Send notification');
const result = execSync('node /job/.pi/skills/notification-center/notify.js "Test message" --priority info', { encoding: 'utf8' });
assert(result.includes('Test message'), 'Should show message');
console.log('  ✓ Notification sent');

// Test 2: List notifications
console.log('\nTest 2: List notifications');
const listOutput = execSync('node /job/.pi/skills/notification-center/notify-list.js', { encoding: 'utf8' });
assert(listOutput.includes('Test message') || listOutput.includes('Notifications'), 'Should list or show empty');
console.log('  ✓ List works');

// Test 3: File created
console.log('\nTest 3: Notification log file');
const fileExists = fs.existsSync('/tmp/notifications.jsonl');
assert(fileExists, 'Should create log file');
console.log('  ✓ Log file exists');

// Cleanup
fs.unlinkSync('/tmp/notifications.jsonl');

console.log('\n' + '='.repeat(50));
console.log('✅ All tests passed!');
console.log('='.repeat(50));
