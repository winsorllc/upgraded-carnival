#!/usr/bin/env node
/**
 * Test suite for webhook-server skill
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

console.log('🧪 Testing webhook-server skill...\n');

// Test 1: Check files exist
console.log('Test 1: Check skill files exist');
const requiredFiles = ['SKILL.md', 'webhook-server.js', 'webhook-log.js', 'test-webhook.sh'];
const skillDir = __dirname;

requiredFiles.forEach(file => {
  const filePath = path.join(skillDir, file);
  assert(fs.existsSync(filePath), `Missing file: ${file}`);
  console.log(`  ✓ ${file} exists`);
});

// Test 2: Check SKILL.md
console.log('\nTest 2: Check SKILL.md structure');
const skillMd = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
assert(skillMd.includes('name:'), 'SKILL.md missing name field');
assert(skillMd.includes('description:'), 'SKILL.md missing description field');
console.log('  ✓ SKILL.md structure valid');

// Test 3: Test module exports
console.log('\nTest 3: Check module exports');
const webhookModule = require('./webhook-server.js');
assert(typeof webhookModule.server === 'object', 'server should be exported');
assert(typeof webhookModule.loadConfig === 'function', 'loadConfig should be exported');
assert(typeof webhookModule.verifySignature === 'function', 'verifySignature should be exported');
console.log('  ✓ All exports present');

// Test 4: Test signature verification
console.log('\nTest 4: Test signature verification');
const crypto = require('crypto');
const { verifySignature } = webhookModule;

const secret = 'test-secret';
const payload = '{"test": true}';
const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

assert.strictEqual(verifySignature(payload, signature, secret), true, 'Valid signature should pass');
assert.strictEqual(verifySignature(payload, 'sha256=invalid', secret), false, 'Invalid signature should fail');
assert.strictEqual(verifySignature(payload, null, secret), false, 'Missing signature should fail');
assert.strictEqual(verifySignature(payload, signature, null), true, 'No secret configured should pass');
console.log('  ✓ Signature verification works');

// Test 5: Test server startup (basic check)
console.log('\nTest 5: Test server functionality');
(async () => {
  try {
    // Clean up any existing logs
    const logPath = '/tmp/webhook-logs.jsonl';
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }
    
    // Start server
    const { spawn } = require('child_process');
    const server = spawn('node', [path.join(__dirname, 'webhook-server.js'), '--port', '9999'], {
      detached: true,
      stdio: 'ignore'
    });
    server.unref();
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test health endpoint
    const healthRes = await new Promise((resolve, reject) => {
      const req = http.get('http://127.0.0.1:9999/health', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Timeout')));
    });
    
    assert.strictEqual(healthRes.status, 200, 'Health check should return 200');
    assert.strictEqual(healthRes.data.status, 'healthy', 'Health check should report healthy');
    console.log('  ✓ Health endpoint works');
    
    // Test webhook endpoint
    const webhookRes = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: 9999,
        path: '/webhook/generic',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(data) }); } 
          catch { resolve({ status: res.statusCode, data }); }
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Timeout')));
      req.write(JSON.stringify({ event: 'test' }));
      req.end();
    });
    
    assert.strictEqual(webhookRes.status, 200, 'Webhook should return 200');
    assert.strictEqual(webhookRes.data.success, true, 'Webhook should report success');
    console.log('  ✓ Webhook endpoint works');
    
    // Cleanup
    try {
      process.kill(-server.pid);
    } catch {}
    
    // Test log viewer
    if (fs.existsSync(logPath)) {
      console.log('  ✓ Logs were written');
      fs.unlinkSync(logPath);
    }
    
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