#!/usr/bin/env node

/**
 * Session History - Get message history for a session
 * 
 * Usage:
 *   node session-history.js [SESSION_ID]
 * 
 * If SESSION_ID is not provided, shows this session's inbox.
 */

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = process.env.SESSION_MESSAGES_DIR || '/tmp/session-messages';
const SESSION_ID = process.env.SESSION_ID || process.env.JOB_ID || 'local';

function main() {
  const targetSession = process.argv[2] || SESSION_ID;
  
  console.log(`📬 Message history for session: ${targetSession}\n`);
  
  // Check inbox
  const inboxDir = path.join(MESSAGES_DIR, 'inbox', targetSession);
  const outboxDir = path.join(MESSAGES_DIR, 'outbox');
  
  let inboxMessages = [];
  let outboxMessages = [];
  
  if (fs.existsSync(inboxDir)) {
    const files = fs.readdirSync(inboxDir).filter(f => f.endsWith('.json'));
    inboxMessages = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(inboxDir, f), 'utf8'));
      return { ...data, direction: 'received' };
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  
  if (fs.existsSync(outboxDir)) {
    const files = fs.readdirSync(outboxDir).filter(f => f.endsWith('.json'));
    outboxMessages = files
      .filter(f => f.startsWith(targetSession + '-'))
      .map(f => {
        const data = JSON.parse(fs.readFileSync(path.join(outboxDir, f), 'utf8'));
        return { ...data, direction: 'sent' };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  
  console.log('─'.repeat(70));
  console.log(`📥 Inbox: ${inboxMessages.length} message(s)`);
  console.log('─'.repeat(70));
  
  if (inboxMessages.length === 0) {
    console.log('  (no messages received)');
  } else {
    for (const msg of inboxMessages.slice(0, 10)) {
      console.log(`\n  From: ${msg.from}`);
      console.log(`  Time: ${new Date(msg.timestamp).toLocaleString()}`);
      console.log(`  Content: ${msg.content}`);
      if (msg.json) {
        console.log(`  Data: ${JSON.stringify(msg.json)}`);
      }
    }
  }
  
  console.log('\n' + '─'.repeat(70));
  console.log(`📤 Outbox: ${outboxMessages.length} message(s)`);
  console.log('─'.repeat(70));
  
  if (outboxMessages.length === 0) {
    console.log('  (no messages sent)');
  } else {
    for (const msg of outboxMessages.slice(0, 10)) {
      console.log(`\n  To: ${msg.to}`);
      console.log(`  Time: ${new Date(msg.timestamp).toLocaleString()}`);
      console.log(`  Content: ${msg.content}`);
    }
  }
  
  console.log('\n' + '─'.repeat(70));
}

main();
