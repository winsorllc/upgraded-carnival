#!/usr/bin/env node
/**
 * Test suite for QR Generator skill
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, 'qr.js');
const TEMP_DIR = '/tmp/qr-test';

function setup() {
  if (fs.existsSync(TEMP_DIR)) {
    execSync(`rm -rf ${TEMP_DIR}`);
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function cleanup() {
  if (fs.existsSync(TEMP_DIR)) {
    execSync(`rm -rf ${TEMP_DIR}`);
  }
}

function runCommand(cmd) {
  try {
    return {
      stdout: execSync(cmd, { encoding: 'utf8', timeout: 10000 }),
      exitCode: 0
    };
  } catch (e) {
    return { stdout: e.stdout || '', stderr: e.stderr || '', exitCode: e.status || 1 };
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ FAILED: ${message}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`✓ ${message}`);
  return true;
}

// Tests
console.log('\n=== QR Generator Tests ===\n');

setup();

// Test 1: URL QR
console.log('--- Test 1: URL QR Code ---');
const test1 = runCommand(`node ${SCRIPT_PATH} url "https://example.com" 2>/dev/null`);
const lines = test1.stdout.split('\n');
const jsonLine = lines.find(l => l.startsWith('{'));
const test1Json = JSON.parse(jsonLine);
assert(test1Json.success === true, 'URL QR generation succeeded');
assert(test1Json.type === 'url', 'Type is URL');
assert(test1Json.content === 'https://example.com', 'Content is the URL');

// Test 2: Text QR
console.log('\n--- Test 2: Text QR Code ---');
const test2 = runCommand(`node ${SCRIPT_PATH} text "Hello World" 2>/dev/null`);
const lines2 = test2.stdout.split('\n');
const jsonLine2 = lines2.find(l => l.startsWith('{'));
const test2Json = JSON.parse(jsonLine2);
assert(test2Json.success === true, 'Text QR generation succeeded');
assert(test2Json.type === 'text', 'Type is text');
assert(test2Json.content === 'Hello World', 'Content is correct');

// Test 3: WiFi QR
console.log('\n--- Test 3: WiFi QR Code ---');
const test3 = runCommand(`node ${SCRIPT_PATH} wifi --ssid "TestNetwork" --password "secret123" --type WPA 2>/dev/null`);
const lines3 = test3.stdout.split('\n');
const jsonLine3 = lines3.find(l => l.startsWith('{'));
const test3Json = JSON.parse(jsonLine3);
assert(test3Json.success === true, 'WiFi QR generation succeeded');
assert(test3Json.type === 'wifi', 'Type is wifi');
assert(test3Json.content.includes('WIFI:S:TestNetwork'), 'Contains SSID');
assert(test3Json.content.includes('P:secret123'), 'Contains password');
assert(test3Json.wifi !== undefined, 'Has wifi section');
assert(test3Json.wifi.ssid === 'TestNetwork', 'WiFi SSID correct');

// Test 4: Contact QR
console.log('\n--- Test 4: Contact QR Code ---');
const test4 = runCommand(`node ${SCRIPT_PATH} contact --name "John Doe" --phone "+1234567890" --email "john@example.com" 2>/dev/null`);
const lines4 = test4.stdout.split('\n');
const jsonLine4 = lines4.find(l => l.startsWith('{'));
const test4Json = JSON.parse(jsonLine4);
assert(test4Json.success === true, 'Contact QR generation succeeded');
assert(test4Json.type === 'contact', 'Type is contact');
assert(test4Json.content.includes('John Doe'), 'Contains name');
assert(test4Json.contact !== undefined, 'Has contact section');
assert(test4Json.contact.name === 'John Doe', 'Contact name correct');

// Test 5: Empty text should fail
console.log('\n--- Test 5: Empty text should fail ---');
const test5 = runCommand(`node ${SCRIPT_PATH} text "" 2>/dev/null`);
assert(test5.exitCode !== 0, 'Empty text fails appropriately');

// Test 6: No SSID should fail for WiFi
console.log('\n--- Test 6: WiFi without SSID fails ---');
const test6 = runCommand(`node ${SCRIPT_PATH} wifi 2>/dev/null`);
assert(test6.exitCode !== 0, 'WiFi without SSID fails');

// Test 7: No name should fail for contact
console.log('\n--- Test 7: Contact without name fails ---');
const test7 = runCommand(`node ${SCRIPT_PATH} contact 2>/dev/null`);
assert(test7.exitCode !== 0, 'Contact without name fails');

console.log('\n=== QR Generator Tests Complete ===\n');

cleanup();
