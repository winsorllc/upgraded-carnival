#!/usr/bin/env node

/**
 * Test for Secure Vault skill
 */

const fs = require('fs');
const path = require('path');

// Completely isolate each test
async function runTests() {
  console.log('🧪 Testing Secure Vault skill...\n');
  
  let passed = 0;
  let failed = 0;
  const testDir = '/tmp/vault-test-' + Date.now();
  fs.mkdirSync(testDir, { recursive: true });

  // Test 1: Initialize vault
  try {
    delete require.cache[require.resolve('./index.js')];
    const { SecureVault } = require('./index.js');
    
    const keyFile = path.join(testDir, 't1.key');
    const vaultFile = path.join(testDir, 't1.vault');
    
    const vault = new SecureVault({ keyFile, vaultFile });
    await vault.init();
    
    if (fs.existsSync(keyFile)) {
      console.log('✅ Test 1: Initialize vault');
      passed++;
    } else {
      throw new Error('Key file not created');
    }
  } catch (e) {
    console.log('❌ Test 1:', e.message);
    failed++;
  }

  // Test 2: Store and retrieve secret
  try {
    delete require.cache[require.resolve('./index.js')];
    const { SecureVault } = require('./index.js');
    
    const keyFile = path.join(testDir, 't2.key');
    const vaultFile = path.join(testDir, 't2.vault');
    
    const vault = new SecureVault({ keyFile, vaultFile });
    await vault.init();
    await vault.set('api_key', 'secret123');
    const value = await vault.get('api_key');
    
    if (value === 'secret123') {
      console.log('✅ Test 2: Store and retrieve secret');
      passed++;
    } else {
      throw new Error(`Expected secret123, got ${value}`);
    }
  } catch (e) {
    console.log('❌ Test 2:', e.message);
    failed++;
  }

  // Test 3: List secrets
  try {
    delete require.cache[require.resolve('./index.js')];
    const { SecureVault } = require('./index.js');
    
    const keyFile = path.join(testDir, 't3.key');
    const vaultFile = path.join(testDir, 't3.vault');
    
    const vault = new SecureVault({ keyFile, vaultFile });
    await vault.init();
    await vault.set('api_key', 'secret1');
    await vault.set('db_pass', 'secret2');
    const secrets = await vault.list();
    
    if (secrets.length === 2 && secrets.find(s => s.name === 'api_key')) {
      console.log('✅ Test 3: List secrets');
      passed++;
    } else {
      throw new Error(`Expected 2 secrets, got ${secrets.length}`);
    }
  } catch (e) {
    console.log('❌ Test 3:', e.message);
    failed++;
  }

  // Test 4: Delete secret
  try {
    delete require.cache[require.resolve('./index.js')];
    const { SecureVault } = require('./index.js');
    
    const keyFile = path.join(testDir, 't4.key');
    const vaultFile = path.join(testDir, 't4.vault');
    
    const vault = new SecureVault({ keyFile, vaultFile });
    await vault.init();
    await vault.set('api_key', 'secret1');
    await vault.delete('api_key');
    const secrets = await vault.list();
    
    if (secrets.length === 0) {
      console.log('✅ Test 4: Delete secret');
      passed++;
    } else {
      throw new Error('Secret not deleted');
    }
  } catch (e) {
    console.log('❌ Test 4:', e.message);
    failed++;
  }

  // Test 5: Lock vault
  try {
    delete require.cache[require.resolve('./index.js')];
    const { SecureVault } = require('./index.js');
    
    const keyFile = path.join(testDir, 't5.key');
    const vaultFile = path.join(testDir, 't5.vault');
    
    const vault = new SecureVault({ keyFile, vaultFile });
    await vault.init();
    await vault.set('api_key', 'secret');
    vault.lock();
    
    // After locking, key should be cleared
    if (!vault.key) {
      console.log('✅ Test 5: Lock vault');
      passed++;
    } else {
      throw new Error('Key should be null after lock');
    }
  } catch (e) {
    console.log('❌ Test 5:', e.message);
    failed++;
  }

  // Test 6: Encryption/decryption
  try {
    delete require.cache[require.resolve('./index.js')];
    const { SecureVault } = require('./index.js');
    
    const keyFile = path.join(testDir, 't6.key');
    const vaultFile = path.join(testDir, 't6.vault');
    
    const vault = new SecureVault({ keyFile, vaultFile });
    await vault.init();
    await vault.unlock();
    
    const encrypted = vault.encrypt('test message');
    const decrypted = vault.decrypt(encrypted);
    
    if (decrypted === 'test message') {
      console.log('✅ Test 6: Encryption/decryption');
      passed++;
    } else {
      throw new Error('Decryption failed');
    }
  } catch (e) {
    console.log('❌ Test 6:', e.message);
    failed++;
  }

  // Test 7: Update existing secret
  try {
    delete require.cache[require.resolve('./index.js')];
    const { SecureVault } = require('./index.js');
    
    const keyFile = path.join(testDir, 't7.key');
    const vaultFile = path.join(testDir, 't7.vault');
    
    const vault = new SecureVault({ keyFile, vaultFile });
    await vault.init();
    await vault.set('api_key', 'old_value');
    await vault.set('api_key', 'new_value');
    const value = await vault.get('api_key');
    
    if (value === 'new_value') {
      console.log('✅ Test 7: Update existing secret');
      passed++;
    } else {
      throw new Error('Secret not updated');
    }
  } catch (e) {
    console.log('❌ Test 7:', e.message);
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
