#!/usr/bin/env node

/**
 * Session List - List all active agent sessions
 * 
 * Lists all sessions that have registered heartbeats within the last 30 minutes.
 * Each session represents an active agent job that can receive messages.
 * 
 * Usage: node session-list.js
 */

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = process.env.SESSION_MESSAGES_DIR || '/tmp/session-messages';
const HEARTBEAT_FILE = path.join(MESSAGES_DIR, 'metadata', 'heartbeats.json');
const SESSION_ID = process.env.SESSION_ID || process.env.JOB_ID || 'local';

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

function isActive(heartbeat, maxAgeMs = 30 * 60 * 1000) {
  const lastSeen = new Date(heartbeat.lastSeen).getTime();
  return (Date.now() - lastSeen) < maxAgeMs;
}

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function main() {
  console.log('🔍 Discovering active sessions...\n');
  
  const heartbeats = loadHeartbeats();
  const activeSessions = Object.entries(heartbeats)
    .filter(([id, hb]) => isActive(hb))
    .sort((a, b) => new Date(b[1].lastSeen) - new Date(a[1].lastSeen));
  
  if (activeSessions.length === 0) {
    console.log('No active sessions found.');
    console.log('Sessions register themselves when they start. A session will appear here once it has sent a heartbeat.');
    process.exit(0);
  }
  
  console.log(`Found ${activeSessions.length} active session(s):\n`);
  console.log('─'.repeat(70));
  
  for (const [sessionId, hb] of activeSessions) {
    const age = Date.now() - new Date(hb.lastSeen).getTime();
    const status = sessionId === SESSION_ID ? ' (this session)' : '';
    
    console.log(`📋 ${sessionId}${status}`);
    console.log(`   Description: ${hb.description || 'N/A'}`);
    console.log(`   Started:    ${new Date(hb.startedAt).toISOString()}`);
    console.log(`   Last seen:  ${formatDuration(age)} ago`);
    console.log(`   Messages:   ${hb.inboxCount || 0} received, ${hb.outboxCount || 0} sent`);
    console.log('─'.repeat(70));
  }
  
  console.log('\nTo send a message to another session, use:');
  console.log('  session-send.js --to <SESSION_ID> --message "your message"');
}

main();
