#!/usr/bin/env node
/**
 * Session Manager - Multi-session context management
 * Inspired by OpenClaw's session tools
 */

const fs = require('fs');
const path = require('path');

class SessionManager {
  constructor() {
    this.sessionsDir = path.join('/job', 'tmp', '.sessions');
    this.ensureSessionsDir();
    this.currentSessionFile = path.join(this.sessionsDir, '.current');
  }

  ensureSessionsDir() {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  getSessionPath(name) {
    const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '-');
    return path.join(this.sessionsDir, `${safeName}.json`);
  }

  getCurrentSession() {
    if (!fs.existsSync(this.currentSessionFile)) return null;
    return fs.readFileSync(this.currentSessionFile, 'utf8').trim();
  }

  setCurrentSession(name) {
    fs.writeFileSync(this.currentSessionFile, name);
  }

  listSessions() {
    const files = fs.readdirSync(this.sessionsDir)
      .filter(f => f.endsWith('.json') && f !== '.current');
    
    const current = this.getCurrentSession();
    const sessions = [];

    files.forEach(file => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(this.sessionsDir, file), 'utf8'));
        sessions.push({
          name: data.name,
          description: data.description,
          created: data.created,
          updated: data.updated,
          active: data.name === current,
          tasks: data.tasks?.length || 0,
        });
      } catch (e) {
        // Ignore invalid session files
      }
    });

    return sessions.sort((a, b) => new Date(b.updated) - new Date(a.updated));
  }

  createSession(name, description = '', metadata = {}) {
    const sessionPath = this.getSessionPath(name);
    
    if (fs.existsSync(sessionPath)) {
      throw new Error(`Session "${name}" already exists`);
    }

    const session = {
      name,
      description,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      metadata,
      tasks: [],
      notes: [],
      state: {},
    };

    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
    this.setCurrentSession(name);
    
    return session;
  }

  getSession(name) {
    const sessionPath = this.getSessionPath(name);
    
    if (!fs.existsSync(sessionPath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  }

  updateSession(name, updates) {
    const session = this.getSession(name);
    
    if (!session) {
      throw new Error(`Session "${name}" not found`);
    }

    Object.assign(session, updates);
    session.updated = new Date().toISOString();

    fs.writeFileSync(this.getSessionPath(name), JSON.stringify(session, null, 2));
    return session;
  }

  deleteSession(name) {
    const sessionPath = this.getSessionPath(name);
    
    if (!fs.existsSync(sessionPath)) {
      throw new Error(`Session "${name}" not found`);
    }

    fs.unlinkSync(sessionPath);
    
    const current = this.getCurrentSession();
    if (current === name) {
      fs.unlinkSync(this.currentSessionFile);
    }
  }

  addTask(sessionName, task) {
    const session = this.getSession(sessionName);
    
    if (!session) {
      throw new Error(`Session "${sessionName}" not found`);
    }

    session.tasks.push({
      id: Date.now().toString(),
      description: task,
      status: 'pending',
      created: new Date().toISOString(),
    });

    this.updateSession(sessionName, { tasks: session.tasks });
  }

  addNote(sessionName, note) {
    const session = this.getSession(sessionName);
    
    if (!session) {
      throw new Error(`Session "${sessionName}" not found`);
    }

    session.notes.push({
      content: note,
      timestamp: new Date().toISOString(),
    });

    this.updateSession(sessionName, { notes: session.notes });
  }

  listHistory(limit = 10) {
    const sessions = this.listSessions();
    return sessions.slice(0, limit);
  }

  formatTimeDiff(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  run() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    const colors = {
      reset: '\x1b[0m',
      cyan: '\x1b[36m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      gray: '\x1b[90m',
      bold: '\x1b[1m',
    };

    switch (command) {
      case 'list':
      case 'ls': {
        const sessions = this.listSessions();
        
        console.log(`\n${colors.cyan}Active Sessions:${colors.reset}\n`);
        
        if (sessions.length === 0) {
          console.log(`${colors.gray}No sessions found${colors.reset}`);
          break;
        }

        sessions.forEach(s => {
          const marker = s.active ? `${colors.green}●${colors.reset}` : `${colors.gray}○${colors.reset}`;
          const name = s.active ? `${colors.bold}${s.name}${colors.reset}` : s.name;
          const time = this.formatTimeDiff(s.updated);
          const tasks = s.tasks > 0 ? `${colors.yellow}(${s.tasks} tasks)${colors.reset}` : '';
          
          console.log(`${marker} ${name} ${colors.gray}${time}${colors.reset} ${tasks}`);
          if (s.description) {
            console.log(`  ${colors.gray}${s.description}${colors.reset}`);
          }
        });
        
        console.log(`\n${sessions.length} session(s) total`);
        break;
      }

      case 'create':
      case 'new': {
        const name = args[1];
        const description = args[2] || '';
        
        if (!name) {
          console.error('Usage: session.js create <name> [description]');
          process.exit(1);
        }

        try {
          const session = this.createSession(name, description);
          console.log(`${colors.green}✓ Created session "${session.name}"${colors.reset}`);
          console.log(`${colors.cyan}Switched to new session${colors.reset}`);
        } catch (e) {
          console.error(`${colors.yellow}Error: ${e.message}${colors.reset}`);
          process.exit(1);
        }
        break;
      }

      case 'switch':
      case 'use': {
        const name = args[1];
        
        if (!name) {
          console.error('Usage: session.js switch <name>');
          process.exit(1);
        }

        const session = this.getSession(name);
        if (!session) {
          console.error(`Session "${name}" not found`);
          process.exit(1);
        }

        this.setCurrentSession(name);
        console.log(`${colors.green}✓ Switched to session "${name}"${colors.reset}`);
        break;
      }

      case 'info': {
        const name = args[1] || this.getCurrentSession();
        
        if (!name) {
          console.error('No active session. Specify a session name or switch to one.');
          process.exit(1);
        }

        const session = this.getSession(name);
        if (!session) {
          console.error(`Session "${name}" not found`);
          process.exit(1);
        }

        console.log(`\n${colors.cyan}Session: ${colors.bold}${session.name}${colors.reset}`);
        console.log(`${colors.gray}${'─'.repeat(40)}${colors.reset}`);
        console.log(`Description: ${session.description || colors.gray + 'None' + colors.reset}`);
        console.log(`Created: ${session.created}`);
        console.log(`Updated: ${session.updated}`);
        console.log(`Tasks: ${session.tasks?.length || 0}`);
        console.log(`Notes: ${session.notes?.length || 0}`);
        
        if (session.tasks?.length > 0) {
          console.log(`\n${colors.cyan}Tasks:${colors.reset}`);
          session.tasks.forEach(t => {
            const status = t.status === 'done' ? `${colors.green}✓${colors.reset}` : `${colors.yellow}○${colors.reset}`;
            console.log(`  ${status} ${t.description}`);
          });
        }
        break;
      }

      case 'delete':
      case 'rm': {
        const name = args[1];
        
        if (!name) {
          console.error('Usage: session.js delete <name>');
          process.exit(1);
        }

        try {
          this.deleteSession(name);
          console.log(`${colors.green}✓ Deleted session "${name}"${colors.reset}`);
        } catch (e) {
          console.error(`${colors.yellow}Error: ${e.message}${colors.reset}`);
          process.exit(1);
        }
        break;
      }

      case 'task': {
        const subCmd = args[1];
        const sessionName = this.getCurrentSession();
        
        if (!sessionName) {
          console.error('No active session. Switch to a session first.');
          process.exit(1);
        }

        if (subCmd === 'add') {
          const description = args.slice(2).join(' ');
          if (!description) {
            console.error('Usage: session.js task add <description>');
            process.exit(1);
          }
          
          this.addTask(sessionName, description);
          console.log(`${colors.green}✓ Added task to "${sessionName}"${colors.reset}`);
        } else {
          // List tasks
          const session = this.getSession(sessionName);
          if (session.tasks?.length === 0) {
            console.log(`${colors.gray}No tasks in current session${colors.reset}`);
          } else {
            console.log(`\n${colors.cyan}Tasks for "${sessionName}":${colors.reset}`);
            session.tasks.forEach(t => {
              const status = t.status === 'done' ? `${colors.green}✓${colors.reset}` : `${colors.yellow}○${colors.reset}`;
              console.log(`  ${status} ${t.description}`);
            });
          }
        }
        break;
      }

      case 'note': {
        const content = args.slice(1).join(' ');
        const sessionName = this.getCurrentSession();
        
        if (!content) {
          console.error('Usage: session.js note <content>');
          process.exit(1);
        }

        this.addNote(sessionName, content);
        console.log(`${colors.green}✓ Added note to "${sessionName}"${colors.reset}`);
        break;
      }

      case 'history':
      case 'log': {
        const limit = parseInt(args[1]) || 10;
        const history = this.listHistory(limit);
        
        console.log(`\n${colors.cyan}Session Activity${colors.reset}\n`);
        
        history.forEach(s => {
          const active = s.active ? `${colors.green}[ACTIVE]${colors.reset}` : '';
          console.log(`${this.formatTimeDiff(s.updated)} ${s.name} ${active}`);
        });
        break;
      }

      case 'current': {
        const current = this.getCurrentSession();
        if (current) {
          console.log(current);
        } else {
          console.log('No active session');
        }
        break;
      }

      default: {
        console.log('Session Manager - Multi-session task coordination');
        console.log('');
        console.log('Commands:');
        console.log('  list, ls              List all sessions');
        console.log('  create <name>          Create new session');
        console.log('  switch <name>          Switch to session');
        console.log('  info [name]            Show session details');
        console.log('  delete <name>          Delete session');
        console.log('  task add <desc>        Add task to current session');
        console.log('  note <content>         Add note to current session');
        console.log('  history [limit]        Show recent activity');
        console.log('  current                Show active session');
        console.log('');
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  const manager = new SessionManager();
  manager.run();
}

module.exports = { SessionManager };
