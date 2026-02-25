#!/usr/bin/env node

/**
 * Test for Matrix CLI skill
 */

const { MatrixClient } = require('./index.js');

async function runTests() {
  console.log('🧪 Testing Matrix CLI skill...\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Client initialization
  try {
    const client = new MatrixClient({ credentials: '/tmp/test-creds.json' });
    if (client.credentials === '/tmp/test-creds.json') {
      console.log('✅ Test 1: Client initialization with custom credentials');
      passed++;
    } else {
      throw new Error('Credentials not set correctly');
    }
  } catch (e) {
    console.log('❌ Test 1:', e.message);
    failed++;
  }

  // Test 2: Send message argument construction
  try {
    const client = new MatrixClient();
    let capturedArgs = null;
    
    client.exec = async (args) => {
      capturedArgs = args;
      return 'OK';
    };
    
    await client.sendMessage('Hello test', '#room:matrix.org');
    
    if (capturedArgs && capturedArgs.includes('-m') && 
        capturedArgs.includes('Hello test') &&
        capturedArgs.includes('-r') &&
        capturedArgs.includes('#room:matrix.org')) {
      console.log('✅ Test 2: Send message argument construction');
      passed++;
    } else {
      throw new Error('Args not correct: ' + JSON.stringify(capturedArgs));
    }
  } catch (e) {
    console.log('❌ Test 2:', e.message);
    failed++;
  }

  // Test 3: Send DM argument construction
  try {
    const client = new MatrixClient();
    let capturedArgs = null;
    
    client.exec = async (args) => {
      capturedArgs = args;
      return 'OK';
    };
    
    await client.sendDM('Hello DM', '@user:matrix.org');
    
    if (capturedArgs && capturedArgs.includes('-u') && 
        capturedArgs.includes('@user:matrix.org')) {
      console.log('✅ Test 3: Send DM argument construction');
      passed++;
    } else {
      throw new Error('DM flag missing: ' + JSON.stringify(capturedArgs));
    }
  } catch (e) {
    console.log('❌ Test 3:', e.message);
    failed++;
  }

  // Test 4: Parse rooms output
  try {
    const client = new MatrixClient();
    const testOutput = `
Joined rooms:
#general:matrix.org
#random:matrix.org  
!roomid:matrix.org
    `.trim();
    
    const rooms = client.parseRooms(testOutput);
    if (rooms.length >= 2) {
      console.log('✅ Test 4: Parse rooms output');
      passed++;
    } else {
      throw new Error('Expected at least 2 rooms');
    }
  } catch (e) {
    console.log('❌ Test 4:', e.message);
    failed++;
  }

  // Test 5: Join room arguments
  try {
    const client = new MatrixClient();
    let capturedArgs = null;
    
    client.exec = async (args) => {
      capturedArgs = args;
      return 'OK';
    };
    
    await client.joinRoom('#newroom:matrix.org');
    
    if (capturedArgs && capturedArgs.includes('--join-room') && 
        capturedArgs.includes('#newroom:matrix.org')) {
      console.log('✅ Test 5: Join room arguments');
      passed++;
    } else {
      throw new Error('Join room args missing: ' + JSON.stringify(capturedArgs));
    }
  } catch (e) {
    console.log('❌ Test 5:', e.message);
    failed++;
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
