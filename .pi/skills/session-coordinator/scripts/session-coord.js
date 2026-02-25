#!/usr/bin/env node
/**
 * Session Coordinator - Coordinate across multiple work sessions
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const SESSIONS_DIR = path.join(process.cwd(), '.sessions');

function ensureSessionsDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function generateSessionId() {
  return `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function createSession(name, parentSession = null) {
  ensureSessionsDir();
  
  const sessionId = generateSessionId();
  const sessionPath = path.join(SESSIONS_DIR, sessionId);
  
  fs.mkdirSync(sessionPath, { recursive: true });
  
  const session = {
    id: sessionId,
    name: name || 'unnamed',
    status: 'active',
    created: new Date().toISOString(),
    parentSession: parentSession,
    messages: [],
    metadata: {}
  };
  
  fs.writeFileSync(
    path.join(sessionPath, 'session.json'),
    JSON.stringify(session, null, 2)
  );
  
  // Create working directory
  fs.mkdirSync(path.join(sessionPath, 'workspace'), { recursive: true });
  
  // Create message log
  fs.writeFileSync(path.join(sessionPath, 'messages.jsonl'), '');
  
  return session;
}

function listSessions() {
  ensureSessionsDir();
  
  const entries = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true });
  const sessions = [];
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const sessionFile = path.join(SESSIONS_DIR, entry.name, 'session.json');
      if (fs.existsSync(sessionFile)) {
        try {
          const session = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
          sessions.push(session);
        } catch (e) {
          // Skip corrupted session
        }
      }
    }
  }
  
  return sessions;
}

function getSession(sessionId) {
  const sessionFile = path.join(SESSIONS_DIR, sessionId, 'session.json');
  if (!fs.existsSync(sessionFile)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
}

function updateSession(sessionId, updates) {
  const session = getSession(sessionId);
  if (!session) return null;
  
  Object.assign(session, updates);
  
  const sessionPath = path.join(SESSIONS_DIR, sessionId, 'session.json');
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
  
  return session;
}

function sendMessage(fromSession, toSession, message, announce = true) {
  const to = getSession(toSession);
  if (!to) {
    return { success: false, error: 'Target session not found' };
  }
  
  const msg = {
    id: `msg-${Date.now()}`,
    from: fromSession,
    to: toSession,
    timestamp: new Date().toISOString(),
    message: message,
    acknowledged: false
  };
  
  // Append to message log
  const messagesPath = path.join(SESSIONS_DIR, toSession, 'messages.jsonl');
  fs.appendFileSync(messagesPath, JSON.stringify(msg) + '\n');
  
  // Update session
  to.messages = to.messages || [];
  to.messages.push(msg.id);
  updateSession(toSession, { messages: to.messages });
  
  // In real implementation, this would use sockets/gateway
  // For now we write to a "inbox" file
  const inboxPath = path.join(SESSIONS_DIR, toSession, 'inbox.jsonl');
  fs.appendFileSync(inboxPath, JSON.stringify(msg) + '\n');
  
  return { success: true, messageId: msg.id };
}

function getHistory(sessionId) {
  const messagesPath = path.join(SESSIONS_DIR, sessionId, 'messages.jsonl');
  if (!fs.existsSync(messagesPath)) {
    return [];
  }
  
  const content = fs.readFileSync(messagesPath, 'utf8').trim();
  if (!content) return [];
  
  return content.split('\n').map(line => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return null;
    }
  }).filter(m => m !== null);
}

function getInbox(sessionId) {
  const inboxPath = path.join(SESSIONS_DIR, sessionId, 'inbox.jsonl');
  if (!fs.existsSync(inboxPath)) {
    return [];
  }
  
  const content = fs.readFileSync(inboxPath, 'utf8').trim();
  if (!content) return [];
  
  return content.split('\n').map(line => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return null;
    }
  }).filter(m => m !== null);
}

function clearInbox(sessionId) {
  const inboxPath = path.join(SESSIONS_DIR, sessionId, 'inbox.jsonl');
  if (fs.existsSync(inboxPath)) {
    fs.unlinkSync(inboxPath);
  }
}

async function spawnSession(name, command, args = []) {
  const session = createSession(name);
  
  // Store spawn command
  fs.writeFileSync(
    path.join(SESSIONS_DIR, session.id, 'spawn.json'),
    JSON.stringify({ command, args, timestamp: new Date().toISOString() }, null, 2)
  );
  
  // For this demo, we'll just create the session without actually spawning
  // In a real implementation, this would fork/spawn a new process
  
  return session;
}

function parseArgs(args) {
  const result = {
    command: null,
    session: null,
    to: null,
    from: null,
    message: null,
    name: null,
    format: 'text'
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--command': result.command = args[++i]; break;
      case '--session': result.session = args[++i]; break;
      case '--to': result.to = args[++i]; break;
      case '--from': result.from = args[++i]; break;
      case '--message': result.message = args[++i]; break;
      case '--name': result.name = args[++i]; break;
      case '--json': result.format = 'json'; break;
    }
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.command) {
    console.log('Session Coordinator - Coordinate across multiple sessions');
    console.log('');
    console.log('Usage: session-coord.js --command <cmd> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  list              List all active sessions');
    console.log('  history           Get session message history');
    console.log('  send              Send message to session');
    console.log('  spawn             Create new session');
    console.log('  status            Check session status');
    console.log('  inbox             Check session inbox');
    console.log('');
    console.log('Options:');
    console.log('  --session <id>      Target session ID');
    console.log('  --to <id>          Destination session ID');
    console.log('  --from <id>        Source session ID (default: current)');
    console.log('  --message <text>   Message to send');
    console.log('  --name <name>      Session name for spawn');
    console.log('  --json             Output as JSON');
    process.exit(1);
  }
  
  switch (args.command) {
    case 'list': {
      const sessions = listSessions();
      
      if (args.format === 'json') {
        console.log(JSON.stringify(sessions, null, 2));
      } else {
        console.log('Active Sessions');
        console.log('═══════════════');
        console.log('');
        
        if (sessions.length === 0) {
          console.log('No active sessions');
        } else {
          for (const s of sessions) {
            console.log(`${s.id}`);
            console.log(`  Name: ${s.name}`);
            console.log(`  Status: ${s.status}`);
            console.log(`  Created: ${s.created}`);
            if (s.parentSession) {
              console.log(`  Parent: ${s.parentSession}`);
            }
            console.log('');
          }
        }
        
        console.log(`Total: ${sessions.length} session(s)`);
      }
      break;
    }
    
    case 'history': {
      if (!args.session) {
        console.error('Error: --session required');
        process.exit(1);
      }
      
      const history = getHistory(args.session);
      
      if (args.format === 'json') {
        console.log(JSON.stringify(history, null, 2));
      } else {
        console.log(`Session History: ${args.session}`);
        console.log('═══════════════════════');
        
        if (history.length === 0) {
          console.log('No messages');
        } else {
          for (const msg of history) {
            console.log(`\n[${msg.timestamp}]`);
            console.log(`  From: ${msg.from}`);
            console.log(`  Message: ${msg.message}`);
          }
        }
        
        console.log(`\nTotal: ${history.length} message(s)`);
      }
      break;
    }
    
    case 'send': {
      if (!args.to || !args.message) {
        console.error('Error: --to and --message required');
        process.exit(1);
      }
      
      const fromSession = args.from || 'current-session';
      const result = sendMessage(fromSession, args.to, args.message);
      
      if (result.success) {
        if (args.format === 'json') {
          console.log(JSON.stringify({ success: true, messageId: result.messageId }, null, 2));
        } else {
          console.log(`✓ Message sent to ${args.to}`);
          console.log(`  Message ID: ${result.messageId}`);
        }
      } else {
        if (args.format === 'json') {
          console.log(JSON.stringify({ success: false, error: result.error }, null, 2));
        } else {
          console.error(`✗ Failed: ${result.error}`);
          process.exit(1);
        }
      }
      break;
    }
    
    case 'spawn': {
      const newSession = createSession(args.name || 'unnamed');
      
      if (args.format === 'json') {
        console.log(JSON.stringify({ success: true, session: newSession }, null, 2));
      } else {
        console.log('✓ Session created');
        console.log(`  ID: ${newSession.id}`);
        console.log(`  Name: ${newSession.name}`);
        console.log(`  Status: ${newSession.status}`);
        console.log(`\nWorking directory: ${path.join(SESSIONS_DIR, newSession.id, 'workspace')}`);
      }
      break;
    }
    
    case 'status': {
      const sessions = listSessions();
      const active = sessions.filter(s => s.status === 'active');
      const idle = sessions.filter(s => s.status === 'idle');
      const failed = sessions.filter(s => s.status === 'failed');
      
      if (args.format === 'json') {
        console.log(JSON.stringify({ total: sessions.length, active: active.length, idle: idle.length, failed: failed.length, sessions }, null, 2));
      } else {
        console.log('Session Status');
        console.log('══════════════');
        console.log(`Total: ${sessions.length}`);
        console.log(`Active: ${active.length}`);
        console.log(`Idle: ${idle.length}`);
        console.log(`Failed: ${failed.length}`);
        
        if (sessions.length > 0) {
          console.log('\nSessions:');
          for (const s of sessions) {
            const statusIcon = s.status === 'active' ? '●' : s.status === 'failed' ? '✗' : '○';
            console.log(`  ${statusIcon} ${s.id.substring(0, 20)}... - ${s.name} (${s.status})`);
          }
        }
      }
      break;
    }
    
    case 'inbox': {
      if (!args.session) {
        console.error('Error: --session required');
        process.exit(1);
      }
      
      const inbox = getInbox(args.session);
      
      if (args.format === 'json') {
        console.log(JSON.stringify(inbox, null, 2));
      } else {
        console.log(`Inbox: ${args.session}`);
        console.log('═════════');
        
        if (inbox.length === 0) {
          console.log('No messages in inbox');
        } else {
          for (const msg of inbox) {
            console.log(`\n[${msg.timestamp}]`);
            console.log(`  From: ${msg.from}`);
            console.log(`  Message: ${msg.message}`);
            console.log(`  Acknowledged: ${msg.acknowledged}`);
          }
        }
        
        console.log(`\nTotal: ${inbox.length} message(s)`);
      }
      break;
    }
    
    default:
      console.error(`Unknown command: ${args.command}`);
      process.exit(1);
  }
}

main();