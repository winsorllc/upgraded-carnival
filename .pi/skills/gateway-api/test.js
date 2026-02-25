#!/usr/bin/env node
const assert = require('assert');
const http = require('http');
const { server, routes } = require('./gateway.js');

console.log('🧪 Testing gateway-api...\n');

// Start server on test port
const TEST_PORT = 9876;
server.listen(TEST_PORT, '127.0.0.1');

setTimeout(async () => {
  // Test 1: Health endpoint
  console.log('Test 1: Health endpoint');
  const health = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${TEST_PORT}/health`, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    }).on('error', reject);
  });
  assert.strictEqual(health.status, 200);
  assert.strictEqual(health.data.status, 'healthy');
  console.log('  ✓ Health endpoint works');
  
  // Test 2: Status endpoint
  console.log('\nTest 2: Status endpoint');
  const status = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${TEST_PORT}/status`, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    }).on('error', reject);
  });
  assert.strictEqual(status.status, 200);
  assert('uptime' in status.data);
  console.log('  ✓ Status endpoint works');
  
  // Cleanup
  server.close();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests passed!');
  console.log('='.repeat(50));
}, 1000);
