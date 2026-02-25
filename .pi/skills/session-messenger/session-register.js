#!/usr/bin/env node

/**
 * Session Register - Register this session for inter-agent communication
 * 
 * This should be called at the start of any agent job that wants to
 * participate in inter-agent communication.
 * 
 * Usage:
 *   node session-register.js "My task description"
 */

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = process.env.SESSION_MESSAGES_DIR || '/tmp/session-messages';
const METADATA_DIR = path.join(MESSAGES_DIR, 'metadata');
const HEARTBEAT_FILE = path.join(METADATA_DIR, 'heartbeats.json');
const SESSION_ID = process.env.SESSION_ID || process.env.JOB_ID || 'local';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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

function saveHeartbeats(heartbeats) {
  ensureDir(METADATA_DIR);
  fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify(heartbeats, null, 2));
}

function registerSession(description = 'Agent session') {
  ensureDir(path.join(MESSAGES_DIR, 'inbox', SESSION_ID));
  
  const heartbeats = loadHeartbeats();
  
  if (!heartbeats[SESSION_ID]) {
    heartbeats[SESSION_ID] = {
      startedAt: new Date().toISOString(),
      description: description,
      inboxCount: 0,
      outboxCount: 0
    };
    console.log(`📝 Session registered: ${SESSION_ID}`);
    console.log(`   Description: ${description}`);
  } else {
    // Update existing session
    heartbeats[SESSION_ID].description = description;
  }
  
  heartbeats[SESSION_ID].lastSeen = new Date().toISOString();
  saveHeartbeats(heartbeats);
  
  return heartbeats[SESSION_ID];
}

function main() {
  const description = process.argv[2] || process.env.JOB_DESCRIPTION || 'Agent session';
  
  const session = registerSession(description);
  
  console.log(`✅ Session ${SESSION_ID} is ready for inter-agent communication`);
  console.log(`   Started: ${session.startedAt}`);
  console.log(`   Last heartbeat: ${session.lastSeen}`);
}

main();
