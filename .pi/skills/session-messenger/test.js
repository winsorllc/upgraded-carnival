#!/usr/bin/env node

/**
 * Session Messenger Test Suite
 * 
 * Tests the inter-agent communication system:
 * 1. Session registration
 * 2. Session discovery
 * 3. Message sending
 * 4. Message receiving
 * 5. Message history
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const MESSAGES_DIR = '/tmp/session-messages-test';
const SKILL_DIR = __dirname;

// Test utilities
const tests = [];
let passed = 0;
let failed = 0;

// Set environment for tests
process.env.SESSION_MESSAGES_DIR = MESSAGES_DIR;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertContains(str, substring, message) {
  if (!str || !str.includes(substring)) {
    throw new Error(message || `Expected string to contain: "${substring}"\nGot: ${str}`);
  }
}

function cleanup() {
  try {
    execSync(`rm -rf ${MESSAGES_DIR}`, { stdio: 'ignore' });
  } catch (e) {}
}

function runCommand(script, args = [], sessionId = 'test-session') {
  return new Promise((resolve, reject) => {
    const env = { 
      ...process.env, 
      SESSION_ID: sessionId,
      JOB_ID: sessionId,
      SESSION_MESSAGES_DIR: MESSAGES_DIR
    };
    
    const proc = spawn('node', [path.join(SKILL_DIR, script), ...args], { env });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());
    
    proc.on('close', code => {
      resolve({ code, stdout, stderr });
    });
    
    proc.on('error', reject);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      proc.kill();
      reject(new Error('Command timed out'));
    }, 10000);
  });
}

// Tests
test('1. Registration - Session can register itself', async () => {
  cleanup();
  
  const uniqueId = 'test-' + Date.now();
  const result = await runCommand('session-register.js', ['Test agent task'], uniqueId);
  
  assert(result.code === 0, `Exit code should be 0, got ${result.code}: ${result.stderr}`);
  assertContains(result.stdout, 'Session registered', 'Should confirm registration');
  
  // Verify heartbeat file was created
  const heartbeatFile = path.join(MESSAGES_DIR, 'metadata', 'heartbeats.json');
  assert(fs.existsSync(heartbeatFile), 'Heartbeat file should exist');
  
  const heartbeats = JSON.parse(fs.readFileSync(heartbeatFile, 'utf8'));
  const sessionId = Object.keys(heartbeats)[0];
  assert(sessionId === uniqueId, `Session ID should match: expected ${uniqueId}, got ${sessionId}`);
  
  console.log(`   ✅ Session ID: ${sessionId}`);
});

test('2. Discovery - Can list active sessions', async () => {
  cleanup();
  
  const uniqueId = 'discovery-' + Date.now();
  
  // Register a session
  await runCommand('session-register.js', ['Discovery test agent'], uniqueId);
  
  // List sessions
  const result = await runCommand('session-list.js', [], uniqueId);
  
  assert(result.code === 0, `List should succeed: ${result.stderr}`);
  assertContains(result.stdout, uniqueId, `Should find our session ${uniqueId} in: ${result.stdout}`);
  assertContains(result.stdout, 'Discovery test agent', 'Should show description');
  
  console.log(`   ✅ Found session in list`);
});

test('3. Send - Can send message to another session', async () => {
  cleanup();
  
  const senderId = 'sender-' + Date.now();
  const receiverId = 'receiver-' + Date.now();
  
  // Register both sessions in heartbeats (simulating they exist)
  const heartbeatFile = path.join(MESSAGES_DIR, 'metadata', 'heartbeats.json');
  fs.mkdirSync(path.join(MESSAGES_DIR, 'metadata'), { recursive: true });
  const heartbeats = {
    [senderId]: {
      startedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      description: 'Sender agent',
      inboxCount: 0,
      outboxCount: 0
    },
    [receiverId]: {
      startedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      description: 'Receiver agent',
      inboxCount: 0,
      outboxCount: 0
    }
  };
  fs.writeFileSync(heartbeatFile, JSON.stringify(heartbeats, null, 2));
  
  // Send message from sender to receiver
  const result = await runCommand('session-send.js', 
    ['--to', receiverId, '--message', 'Hello from sender!'], 
    senderId
  );
  
  assertContains(result.stdout, 'Message sent', `Should confirm message sent: ${result.stdout} ${result.stderr}`);
  assertContains(result.stdout, receiverId, 'Should reference receiver');
  
  console.log(`   ✅ Message sent successfully`);
});

test('4. Receive - Message appears in receiver inbox', async () => {
  cleanup();
  
  const senderId = 'sender2-' + Date.now();
  const receiverId = 'receiver2-' + Date.now();
  
  // Create both sessions in heartbeats
  const heartbeatFile = path.join(MESSAGES_DIR, 'metadata', 'heartbeats.json');
  fs.mkdirSync(path.join(MESSAGES_DIR, 'metadata'), { recursive: true });
  const heartbeats = {
    [senderId]: {
      startedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      description: 'Sender agent',
      inboxCount: 0,
      outboxCount: 0
    },
    [receiverId]: {
      startedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      description: 'Receiver agent',
      inboxCount: 0,
      outboxCount: 0
    }
  };
  fs.writeFileSync(heartbeatFile, JSON.stringify(heartbeats, null, 2));
  
  // Send message
  const result = await runCommand('session-send.js', 
    ['--to', receiverId, '--message', 'Test message'], 
    senderId
  );
  
  // Check inbox was created
  const inboxDir = path.join(MESSAGES_DIR, 'inbox', receiverId);
  assert(fs.existsSync(inboxDir), `Inbox directory should exist: ${inboxDir}`);
  
  const files = fs.readdirSync(inboxDir).filter(f => f.endsWith('.json'));
  assert(files.length > 0, `Should have at least one message in inbox, found ${files.length}`);
  
  // Read the message
  const messageFile = path.join(inboxDir, files[0]);
  const message = JSON.parse(fs.readFileSync(messageFile, 'utf8'));
  
  assert(message.from === senderId, `Message should be from sender, got ${message.from}`);
  assert(message.content === 'Test message', `Message content should match, got ${message.content}`);
  
  console.log(`   ✅ Message received: "${message.content}"`);
});

test('5. History - Can retrieve message history', async () => {
  cleanup();
  
  const senderId = 'history-sender-' + Date.now();
  const receiverId = 'history-receiver-' + Date.now();
  
  // Create both sessions
  const heartbeatFile = path.join(MESSAGES_DIR, 'metadata', 'heartbeats.json');
  fs.mkdirSync(path.join(MESSAGES_DIR, 'metadata'), { recursive: true });
  const heartbeats = {
    [senderId]: {
      startedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      description: 'History sender',
      inboxCount: 0,
      outboxCount: 0
    },
    [receiverId]: {
      startedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      description: 'History receiver',
      inboxCount: 0,
      outboxCount: 0
    }
  };
  fs.writeFileSync(heartbeatFile, JSON.stringify(heartbeats, null, 2));
  
  // Send a message
  await runCommand('session-send.js', 
    ['--to', receiverId, '--message', 'Message for history'], 
    senderId
  );
  
  // Check history for sender (should show sent message)
  const result = await runCommand('session-history.js', [senderId], senderId);
  
  assert(result.code === 0, `History should succeed: ${result.stderr}`);
  assertContains(result.stdout, 'Message for history', 'Should show the message content');
  assertContains(result.stdout, 'Outbox:', 'Should show outbox section');
  
  console.log(`   ✅ History retrieved successfully`);
});

test('6. Error handling - Rejects invalid session', async () => {
  cleanup();
  
  const senderId = 'error-test-' + Date.now();
  
  // Register a valid session
  await runCommand('session-register.js', ['Valid session'], senderId);
  
  // Try to send to non-existent session
  const result = await runCommand('session-send.js', 
    ['--to', 'non-existent-session', '--message', 'Test'], 
    senderId
  );
  
  const output = result.stdout + result.stderr;
  
  assert(result.code !== 0, `Should fail for non-existent session: code=${result.code}`);
  assert(output.includes('not active') || output.includes('does not exist'), `Should indicate session not found. Got: ${output}`);
  
  console.log(`   ✅ Proper error handling for invalid session`);
});

// Run tests
async function runAllTests() {
  console.log('🧪 Session Messenger Test Suite\n');
  console.log('─'.repeat(50));
  
  for (const t of tests) {
    try {
      console.log(`\n📋 ${t.name}`);
      await t.fn();
      passed++;
      console.log(`   ✅ PASSED`);
    } catch (e) {
      failed++;
      console.log(`   ❌ FAILED: ${e.message}`);
    }
  }
  
  console.log('\n' + '─'.repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  // Cleanup
  cleanup();
  
  if (failed > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

runAllTests().catch(e => {
  console.error('Test suite error:', e);
  cleanup();
  process.exit(1);
});
