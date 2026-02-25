#!/usr/bin/env node

/**
 * Test for Signal CLI skill
 * Tests the SignalClient class functionality
 */

const { SignalClient } = require('./index.js');

async function runTests() {
  console.log('🧪 Testing Signal CLI skill...\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Client initialization
  try {
    const client = new SignalClient();
    if (client && client.exec) {
      console.log('✅ Test 1: Client initialization');
      passed++;
    } else {
      throw new Error('Missing required methods');
    }
  } catch (e) {
    console.log('❌ Test 1: Client initialization -', e.message);
    failed++;
  }

  // Test 2: Parse groups output
  try {
    const client = new SignalClient();
    const testOutput = `
Group ID: abc123
Group Name: Test Group
Members: +1234567890, +0987654321
Group ID: def456  
Group Name: Another Group
Members: +1234567890
    `.trim();
    
    const groups = client.parseGroups(testOutput);
    if (groups.length >= 2) {
      console.log('✅ Test 2: Parse groups output');
      passed++;
    } else {
      throw new Error('Expected at least 2 groups');
    }
  } catch (e) {
    console.log('❌ Test 2: Parse groups output -', e.message);
    failed++;
  }

  // Test 3: Send message argument construction
  try {
    const client = new SignalClient();
    const originalExec = client.exec;
    let capturedArgs = null;
    
    client.exec = async (args) => {
      capturedArgs = args;
      return 'OK';
    };
    
    await client.sendMessage('+1234567890', 'Hello test');
    
    if (capturedArgs && capturedArgs.includes('send') && 
        capturedArgs.includes('-m') && capturedArgs.includes('Hello test') &&
        capturedArgs.includes('+1234567890')) {
      console.log('✅ Test 3: Send message argument construction');
      passed++;
    } else {
      throw new Error('Args not correct: ' + JSON.stringify(capturedArgs));
    }
  } catch (e) {
    console.log('❌ Test 3: Send message argument construction -', e.message);
    failed++;
  }

  // Test 4: Group message argument construction
  try {
    const client = new SignalClient();
    let capturedArgs = null;
    
    client.exec = async (args) => {
      capturedArgs = args;
      return 'OK';
    };
    
    await client.sendMessage('test-group', 'Hello group', { groupName: 'Test Group' });
    
    if (capturedArgs && capturedArgs.includes('-g')) {
      console.log('✅ Test 4: Group message argument construction');
      passed++;
    } else {
      throw new Error('Group flag missing: ' + JSON.stringify(capturedArgs));
    }
  } catch (e) {
    console.log('❌ Test 4: Group message -', e.message);
    failed++;
  }

  // Test 5: Attachment support
  try {
    const client = new SignalClient();
    let capturedArgs = null;
    
    client.exec = async (args) => {
      capturedArgs = args;
      return 'OK';
    };
    
    await client.sendMessage('+1234567890', 'Check this', { attachment: '/path/to/file.jpg' });
    
    if (capturedArgs && capturedArgs.includes('-a') && capturedArgs.includes('/path/to/file.jpg')) {
      console.log('✅ Test 5: Attachment support');
      passed++;
    } else {
      throw new Error('Attachment flag missing: ' + JSON.stringify(capturedArgs));
    }
  } catch (e) {
    console.log('❌ Test 5: Attachment support -', e.message);
    failed++;
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
