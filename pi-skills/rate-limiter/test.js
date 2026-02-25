#!/usr/bin/env node

/**
 * Test for Rate Limiter skill
 */

const fs = require('fs');
const path = require('path');

// Completely isolated test - each test uses its own state file
async function runTests() {
  console.log('🧪 Testing Rate Limiter skill...\n');
  
  let passed = 0;
  let failed = 0;
  const testDir = '/tmp/rate-limit-test-' + Date.now();
  fs.mkdirSync(testDir, { recursive: true });

  // Test 1: Initial check allows requests
  try {
    const { RateLimiter } = require('./index.js');
    const limiter = new RateLimiter({
      windowMs: 60000,
      maxRequests: 5,
      burstAllowance: 2,
      stateFile: path.join(testDir, 't1.json')
    });
    
    const allowed = limiter.check('test-api');
    if (allowed === true) {
      console.log('✅ Test 1: Initial check allows requests');
      passed++;
    } else {
      throw new Error('Should allow initial request');
    }
  } catch (e) {
    console.log('❌ Test 1:', e.message);
    failed++;
  }

  // Test 2: Record request
  try {
    delete require.cache[require.resolve('./index.js')];
    const { RateLimiter } = require('./index.js');
    const limiter = new RateLimiter({
      windowMs: 60000,
      maxRequests: 5,
      burstAllowance: 2,
      stateFile: path.join(testDir, 't2.json')
    });
    
    const result = limiter.record('test-api');
    if (result && result.remaining < 5) {
      console.log('✅ Test 2: Record request');
      passed++;
    } else {
      throw new Error('Record failed');
    }
  } catch (e) {
    console.log('❌ Test 2:', e.message);
    failed++;
  }

  // Test 3: Get remaining
  try {
    delete require.cache[require.resolve('./index.js')];
    const { RateLimiter } = require('./index.js');
    const limiter = new RateLimiter({
      windowMs: 60000,
      maxRequests: 5,
      burstAllowance: 2,
      stateFile: path.join(testDir, 't3.json')
    });
    
    limiter.record('test-api');
    const remaining = limiter.getRemaining('test-api');
    if (remaining >= 0 && remaining <= 7) {
      console.log('✅ Test 3: Get remaining quota');
      passed++;
    } else {
      throw new Error(`Remaining out of range: ${remaining}`);
    }
  } catch (e) {
    console.log('❌ Test 3:', e.message);
    failed++;
  }

  // Test 4: Cost tracking
  try {
    delete require.cache[require.resolve('./index.js')];
    const { RateLimiter } = require('./index.js');
    const limiter = new RateLimiter({
      windowMs: 60000,
      maxRequests: 5,
      burstAllowance: 2,
      maxCostPerDay: 100,
      stateFile: path.join(testDir, 't4.json')
    });
    
    limiter.record('cost-api', { cost: 10 });
    const remaining = limiter.getRemainingCost('cost-api');
    const expected = 100 - 10;
    // Check that cost was recorded (remaining should be less than max)
    if (remaining < 100) {
      console.log('✅ Test 4: Cost tracking');
      passed++;
    } else {
      throw new Error(`Cost not tracked: ${remaining}`);
    }
  } catch (e) {
    console.log('❌ Test 4:', e.message);
    failed++;
  }

  // Test 5: Cost limit exceeded
  try {
    delete require.cache[require.resolve('./index.js')];
    const { RateLimiter } = require('./index.js');
    const limiter = new RateLimiter({
      windowMs: 60000,
      maxRequests: 5,
      burstAllowance: 2,
      maxCostPerDay: 100,
      stateFile: path.join(testDir, 't5.json')
    });
    
    const allowed = limiter.check('cost-api', { cost: 150 });
    if (allowed === false) {
      console.log('✅ Test 5: Cost limit exceeded');
      passed++;
    } else {
      throw new Error('Should block when cost exceeds limit');
    }
  } catch (e) {
    console.log('❌ Test 5:', e.message);
    failed++;
  }

  // Test 6: Multiple keys independent
  try {
    delete require.cache[require.resolve('./index.js')];
    const { RateLimiter } = require('./index.js');
    const limiter = new RateLimiter({
      windowMs: 60000,
      maxRequests: 5,
      burstAllowance: 2,
      stateFile: path.join(testDir, 't6.json')
    });
    
    limiter.record('key1');
    const remaining1 = limiter.getRemaining('key1');
    const remaining2 = limiter.getRemaining('key2');
    
    if (remaining2 > remaining1) { // key2 should have more (full) than key1 (used)
      console.log('✅ Test 6: Multiple keys independent');
      passed++;
    } else {
      throw new Error(`Keys should be independent: k1=${remaining1}, k2=${remaining2}`);
    }
  } catch (e) {
    console.log('❌ Test 6:', e.message);
    failed++;
  }

  // Test 7: Reset
  try {
    delete require.cache[require.resolve('./index.js')];
    const { RateLimiter } = require('./index.js');
    const limiter = new RateLimiter({
      windowMs: 60000,
      maxRequests: 5,
      burstAllowance: 2,
      stateFile: path.join(testDir, 't7.json')
    });
    
    limiter.record('test-api');
    limiter.reset('test-api');
    const remaining = limiter.getRemaining('test-api');
    if (remaining >= 5) { // Should be back to maxRequests (5)
      console.log('✅ Test 7: Reset key');
      passed++;
    } else {
      throw new Error(`Reset did not restore quota: ${remaining}`);
    }
  } catch (e) {
    console.log('❌ Test 7:', e.message);
    failed++;
  }

  // Test 8: Stats structure
  try {
    delete require.cache[require.resolve('./index.js')];
    const { RateLimiter } = require('./index.js');
    const limiter = new RateLimiter({
      windowMs: 60000,
      maxRequests: 5,
      burstAllowance: 2,
      stateFile: path.join(testDir, 't8.json')
    });
    
    limiter.record('key1');
    limiter.record('key2');
    
    const stats = limiter.getStats();
    if (stats && stats.keys && stats.keys.length >= 1) {
      console.log('✅ Test 8: Statistics');
      passed++;
    } else {
      throw new Error('Stats not returned correctly');
    }
  } catch (e) {
    console.log('❌ Test 8:', e.message);
    failed++;
  }

  // Cleanup
  fs.rmSync(testDir, { recursive: true, force: true });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
