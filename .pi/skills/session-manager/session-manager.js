#!/usr/bin/env node

/**
 * Session Manager Skill
 * Manage conversation sessions with persistence and context management
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

const DB_PATH = path.join(os.homedir(), '.thepopebot', 'sessions.db');

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize database
function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      message_count INTEGER DEFAULT 0,
      starred INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      metadata TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at);
  `);
}

// Create a new session
function createSession(title) {
  const stmt = db.prepare('INSERT INTO sessions (title) VALUES (?)');
  const result = stmt.run(title || 'Untitled Session');
  
  // Create initial system message
  const msgStmt = db.prepare('INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)');
  msgStmt.run(result.lastInsertRowid, 'system', 'Session started');
  
  console.log(`Created session #${result.lastInsertRowid}: ${title}`);
  return result.lastInsertRowid;
}

// List all sessions
function listSessions(limit = 50) {
  const sessions = db.prepare(`
    SELECT id, title, created_at, updated_at, message_count, starred, active
    FROM sessions
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(limit);

  return sessions;
}

// Get session details
function getSession(id) {
  const session = db.prepare(`
    SELECT * FROM sessions WHERE id = ?
  `).get(id);

  return session;
}

// Resume a session (mark as active)
function resumeSession(id) {
  const stmt = db.prepare('UPDATE sessions SET active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(id);
  console.log(`Resumed session #${id}`);
}

// Add message to session
function addMessage(sessionId, role, content) {
  const stmt = db.prepare('INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)');
  stmt.run(sessionId, role, content);
  
  // Update session
  const updateStmt = db.prepare(`
    UPDATE sessions 
    SET message_count = message_count + 1, 
        updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);
  updateStmt.run(sessionId);
  
  console.log(`Added ${role} message to session #${sessionId}`);
}

// Get session history
function getHistory(sessionId, limit = 100) {
  const messages = db.prepare(`
    SELECT role, content, created_at
    FROM messages
    WHERE session_id = ?
    ORDER BY created_at ASC
    LIMIT ?
  `).all(sessionId, limit);

  return messages;
}

// Search sessions
function searchSessions(query, limit = 20) {
  const sessions = db.prepare(`
    SELECT DISTINCT s.id, s.title, s.updated_at, m.content
    FROM sessions s
    JOIN messages m ON s.id = m.session_id
    WHERE m.content LIKE ?
    ORDER BY s.updated_at DESC
    LIMIT ?
  `).all(`%${query}%`, limit);

  return sessions;
}

// Prune old sessions
function pruneSessions(olderThan) {
  // Parse duration (e.g., "30d" -> 30 days)
  const match = olderThan.match(/^(\d+)([dhms]?)$/);
  if (!match) {
    throw new Error('Invalid duration. Use format: 30d, 7d, 24h, 60m');
  }
  
  const value = parseInt(match[1]);
  const unit = match[2] || 'd';
  
  let seconds;
  switch (unit) {
    case 'd': seconds = value * 86400; break;
    case 'h': seconds = value * 3600; break;
    case 'm': seconds = value * 60; break;
    default: seconds = value;
  }
  
  const cutoff = Math.floor(Date.now() / 1000) - seconds;
  
  // Get sessions to delete
  const toDelete = db.prepare(`
    SELECT id, title FROM sessions
    WHERE updated_at < datetime(cutoff, 'unixepoch')
  `).all({ cutoff });
  
  if (toDelete.length === 0) {
    console.log('No sessions to prune');
    return 0;
  }
  
  // Delete sessions (cascades to messages)
  const deleteStmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  for (const session of toDelete) {
    deleteStmt.run(session.id);
  }
  
  console.log(`Pruned ${toDelete.length} session(s)`);
  return toDelete.length;
}

// Delete a session
function deleteSession(id) {
  const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  const result = stmt.run(id);
  console.log(`Deleted ${result.changes} session(s)`);
  return result.changes;
}

// Get statistics
function getStats() {
  const totalSessions = db.prepare('SELECT COUNT(*) as count FROM sessions').get();
  const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get();
  const activeSessions = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE active = 1').get();
  const starredSessions = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE starred = 1').get();
  
  // Messages by role
  const byRole = db.prepare(`
    SELECT role, COUNT(*) as count 
    FROM messages 
    GROUP BY role
  `).all();
  
  // Recent activity
  const recent = db.prepare(`
    SELECT DATE(updated_at) as date, COUNT(*) as count
    FROM sessions
    WHERE updated_at > datetime('now', '-7 days')
    GROUP BY DATE(updated_at)
    ORDER BY date DESC
  `).all();

  return {
    totalSessions: totalSessions.count,
    totalMessages: totalMessages.count,
    activeSessions: activeSessions.count,
    starredSessions: starredSessions.count,
    byRole,
    recentActivity: recent
  };
}

// Star a session
function starSession(id) {
  const stmt = db.prepare('UPDATE sessions SET starred = 1 WHERE id = ?');
  stmt.run(id);
  console.log(`Starred session #${id}`);
}

// Unstar a session
function unstarSession(id) {
  const stmt = db.prepare('UPDATE sessions SET starred = 0 WHERE id = ?');
  stmt.run(id);
  console.log(`Unstarred session #${id}`);
}

// Main CLI
function main() {
  initDB();

  const command = process.argv[2];
  const arg1 = process.argv[3];
  const args = process.argv.slice(4);

  try {
    switch (command) {
      case 'create': {
        const title = arg1 || 'Untitled Session';
        createSession(title);
        break;
      }

      case 'list': {
        const sessions = listSessions();
        console.log('\nSessions:\n');
        console.log('ID    Title              Messages  Updated');
        console.log('----  -----------------  --------  -------------------');
        sessions.forEach(s => {
          console.log(`${s.id.toString().padEnd(4)}  ${s.title.slice(0, 17).padEnd(17)}  ${s.message_count.toString().padEnd(8)}  ${s.updated_at}`);
        });
        break;
      }

      case 'resume': {
        const id = parseInt(arg1);
        if (isNaN(id)) {
          console.error('Usage: session-manager.js resume <session-id>');
          process.exit(1);
        }
        resumeSession(id);
        const session = getSession(id);
        console.log(JSON.stringify(session, null, 2));
        break;
      }

      case 'add': {
        const id = parseInt(arg1);
        const role = args[0];
        const content = args.slice(1).join(' ');
        
        if (isNaN(id) || !role || !content) {
          console.error('Usage: session-manager.js add <session-id> <role> <content>');
          process.exit(1);
        }
        
        addMessage(id, role, content);
        break;
      }

      case 'history': {
        const id = parseInt(arg1);
        if (isNaN(id)) {
          console.error('Usage: session-manager.js history <session-id>');
          process.exit(1);
        }
        
        const messages = getHistory(id);
        console.log(`\nSession #${id} History:\n`);
        messages.forEach(m => {
          console.log(`[${m.role}] ${m.content}`);
        });
        break;
      }

      case 'search': {
        const query = arg1;
        if (!query) {
          console.error('Usage: session-manager.js search <query>');
          process.exit(1);
        }
        
        const results = searchSessions(query);
        console.log('\nSearch Results:\n');
        results.forEach(r => {
          console.log(`#${r.id} - ${r.title}`);
          console.log(`  ${r.content.slice(0, 100)}...`);
          console.log('');
        });
        break;
      }

      case 'prune': {
        let olderThan = '30d';
        const olderIdx = args.indexOf('--older-than');
        if (olderIdx !== -1 && args[olderIdx + 1]) {
          olderThan = args[olderIdx + 1];
        }
        
        pruneSessions(olderThan);
        break;
      }

      case 'delete': {
        const id = parseInt(arg1);
        if (isNaN(id)) {
          console.error('Usage: session-manager.js delete <session-id>');
          process.exit(1);
        }
        
        deleteSession(id);
        break;
      }

      case 'star': {
        const id = parseInt(arg1);
        if (isNaN(id)) {
          console.error('Usage: session-manager.js star <session-id>');
          process.exit(1);
        }
        
        starSession(id);
        break;
      }

      case 'unstar': {
        const id = parseInt(arg1);
        if (isNaN(id)) {
          console.error('Usage: session-manager.js unstar <session-id>');
          process.exit(1);
        }
        
        unstarSession(id);
        break;
      }

      case 'stats': {
        const stats = getStats();
        console.log('\nSession Statistics:\n');
        console.log(`Total Sessions: ${stats.totalSessions}`);
        console.log(`Active Sessions: ${stats.activeSessions}`);
        console.log(`Starred Sessions: ${stats.starredSessions}`);
        console.log(`Total Messages: ${stats.totalMessages}`);
        console.log('\nMessages by Role:');
        stats.byRole.forEach(r => {
          console.log(`  ${r.role}: ${r.count}`);
        });
        console.log('\nRecent Activity:');
        stats.recentActivity.forEach(r => {
          console.log(`  ${r.date}: ${r.count} sessions`);
        });
        break;
      }

      default:
        console.log(`
Session Manager Skill - CLI

Commands:
  create [title]            Create new session
  list                      List all sessions
  resume <id>               Resume a session
  add <id> <role> <msg>     Add message to session
  history <id>             Get session history
  search <query>            Search sessions
  prune [--older-than N]   Prune old sessions
  delete <id>               Delete session
  star <id>                 Star a session
  unstar <id>               Unstar a session
  stats                     Show statistics

Examples:
  session-manager.js create "My Project"
  session-manager.js list
  session-manager.js add 1 user "Hello!"
  session-manager.js add 1 assistant "Hi there!"
  session-manager.js history 1
  session-manager.js search "typescript"
  session-manager.js prune --older-than 30d
  session-manager.js stats
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
