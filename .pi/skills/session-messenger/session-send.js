#!/usr/bin/env node

/**
 * Session Send - Send a message to another agent session
 * 
 * Usage:
 *   node session-send.js --to JOB_ID --message "Your message"
 *   node session-send.js --to JOB_ID --message "Message" --await
 *   node session-send.js --to JOB_ID --json '{"task": "review", "data": {...}}'
 */

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = process.env.SESSION_MESSAGES_DIR || '/tmp/session-messages';
const HEARTBEAT_FILE = path.join(MESSAGES_DIR, 'metadata', 'heartbeats.json');
const OUTBOX_DIR = path.join(MESSAGES_DIR, 'outbox');
const SESSION_ID = process.env.SESSION_ID || process.env.JOB_ID || 'local';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    to: null,
    message: null,
    json: null,
    await: false,
    timeout: 60000 // 1 minute default timeout
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--to' && args[i + 1]) {
      options.to = args[++i];
    } else if (arg === '--message' && args[i + 1]) {
      options.message = args[++i];
    } else if (arg === '--json' && args[i + 1]) {
      try {
        options.json = JSON.parse(args[++i]);
      } catch (e) {
        console.error('Error: Invalid JSON format');
        process.exit(1);
      }
    } else if (arg === '--await') {
      options.await = true;
    } else if (arg === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[++i], 10) * 1000;
    }
  }
  
  return options;
}

function loadHeartbeats() {
  try {
    if (fs.existsSync(HEARTBEAT_FILE)) {
      const data = fs.readFileSync(HEARTBEAT_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    // File doesn't exist or is corrupted
  }
  return {};
}

function isActive(heartbeats, sessionId, maxAgeMs = 30 * 60 * 1000) {
  const hb = heartbeats[sessionId];
  if (!hb) return false;
  const lastSeen = new Date(hb.lastSeen).getTime();
  return (Date.now() - lastSeen) < maxAgeMs;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function saveMessage(message) {
  ensureDir(OUTBOX_DIR);
  const filename = `${message.id}.json`;
  const filepath = path.join(OUTBOX_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(message, null, 2));
  
  // Also deliver to receiver's inbox
  const inboxDir = path.join(MESSAGES_DIR, 'inbox', message.to);
  ensureDir(inboxDir);
  const inboxFile = path.join(inboxDir, filename);
  fs.writeFileSync(inboxFile, JSON.stringify(message, null, 2));
  
  // Update heartbeats with counts
  const heartbeats = loadHeartbeats();
  if (heartbeats[SESSION_ID]) {
    heartbeats[SESSION_ID].outboxCount = (heartbeats[SESSION_ID].outboxCount || 0) + 1;
  }
  if (heartbeats[message.to]) {
    heartbeats[message.to].inboxCount = (heartbeats[message.to].inboxCount || 0) + 1;
  }
  fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify(heartbeats, null, 2));
}

function waitForResponse(correlationId, timeout) {
  const inboxDir = path.join(MESSAGES_DIR, 'inbox', SESSION_ID);
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      if (fs.existsSync(inboxDir)) {
        const files = fs.readdirSync(inboxDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filepath = path.join(inboxDir, file);
            const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            if (data.correlationId === correlationId) {
              return data;
            }
          }
        }
      }
    } catch (e) {
      // Continue polling
    }
    fs.readFileSync('/dev/null'); // Small delay
  }
  
  return null;
}

function main() {
  const options = parseArgs();
  
  if (!options.to) {
    console.error('Error: --to is required');
    console.error('Usage: session-send.js --to JOB_ID --message "Your message" [--await]');
    console.error('       session-send.js --to JOB_ID --json \'{"key": "value"}\'');
    process.exit(1);
  }
  
  if (!options.message && !options.json) {
    console.error('Error: --message or --json is required');
    process.exit(1);
  }
  
  const heartbeats = loadHeartbeats();
  
  if (!isActive(heartbeats, options.to)) {
    console.error(`Error: Session "${options.to}" is not active or does not exist.`);
    console.error('Run session-list.js to see active sessions.');
    process.exit(1);
  }
  
  if (options.to === SESSION_ID) {
    console.error('Error: Cannot send message to yourself');
    process.exit(1);
  }
  
  const message = {
    id: `${SESSION_ID}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    from: SESSION_ID,
    to: options.to,
    content: options.message || JSON.stringify(options.json),
    json: options.json,
    timestamp: new Date().toISOString(),
    correlationId: options.await ? `${SESSION_ID}-await-${Date.now()}` : null
  };
  
  console.log(`📤 Sending message to ${options.to}...`);
  console.log(`   From: ${SESSION_ID}`);
  console.log(`   Message: ${message.content}`);
  
  saveMessage(message);
  
  console.log(`✅ Message sent! ID: ${message.id}`);
  
  if (options.await) {
    console.log(`⏳ Waiting for response (timeout: ${options.timeout / 1000}s)...`);
    const response = waitForResponse(message.correlationId, options.timeout);
    
    if (response) {
      console.log(`\n📥 Response received from ${response.from}:`);
      console.log(`   ${response.content}`);
      console.log(`\nFull response:`, JSON.stringify(response, null, 2));
    } else {
      console.log(`\n⚠️ No response received within ${options.timeout / 1000}s`);
    }
  }
}

main();
