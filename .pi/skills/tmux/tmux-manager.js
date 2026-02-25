#!/usr/bin/env node
/**
 * Tmux Manager - Control tmux sessions programmatically
 * 
 * Commands:
 *   node tmux-manager.js list                    - List all sessions
 *   node tmux-manager.js create <name> [cmd]     - Create new session
 *   node tmux-manager.js capture <name> [lines]  - Capture output
 *   node tmux-manager.js send <name> <text>      - Send keys
 *   node tmux-manager.js exists <name>           - Check if session exists
 *   node tmux-manager.js kill <name>             - Kill session
 */

const { execSync } = require('child_process');

function run(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', ...options });
  } catch (err) {
    if (options.allowFail) return null;
    throw err;
  }
}

function exists(session) {
  return run(`tmux has-session -t ${session} 2>/dev/null`, { allowFail: true }) !== null;
}

function list() {
  const output = run('tmux list-sessions -F "#{session_name}|#{windows}|#{created}"', { allowFail: true });
  if (!output) return [];
  
  return output.trim().split('\n').map(line => {
    const [name, windows, created] = line.split('|');
    return { name, windows: parseInt(windows), created: new Date(created) };
  });
}

function create(session, command = null) {
  if (exists(session)) {
    console.log(`Session '${session}' already exists`);
    return false;
  }
  
  const cmd = command 
    ? `tmux new-session -d -s ${session} "${command}"`
    : `tmux new-session -d -s ${session}`;
  
  run(cmd);
  console.log(`Created session '${session}'${command ? ` with command: ${command}` : ''}`);
  return true;
}

function capture(session, lines = 50) {
  if (!exists(session)) {
    console.error(`Session '${session}' does not exist`);
    process.exit(1);
  }
  
  const output = run(`tmux capture-pane -t ${session} -p -S -${lines}`);
  return output;
}

function send(session, text, pressEnter = true) {
  if (!exists(session)) {
    console.error(`Session '${session}' does not exist`);
    process.exit(1);
  }
  
  const keys = pressEnter ? `${text} Enter` : text;
  run(`tmux send-keys -t ${session} ${keys}`);
  console.log(`Sent to '${session}': ${text}${pressEnter ? ' (with Enter)' : ''}`);
}

function kill(session) {
  if (!exists(session)) {
    console.log(`Session '${session}' does not exist`);
    return false;
  }
  
  run(`tmux kill-session -t ${session}`);
  console.log(`Killed session '${session}'`);
  return true;
}

// CLI interface
const [,, command, ...args] = process.argv;

switch (command) {
  case 'list':
    const sessions = list();
    if (sessions.length === 0) {
      console.log('No active tmux sessions');
    } else {
      console.log('Active tmux sessions:');
      sessions.forEach(s => console.log(`  - ${s.name} (${s.windows} windows, created ${s.created.toLocaleString()})`));
    }
    break;
    
  case 'create':
    if (!args[0]) {
      console.error('Usage: tmux-manager.js create <session-name> [command]');
      process.exit(1);
    }
    create(args[0], args.slice(1).join(' ') || null);
    break;
    
  case 'capture':
    if (!args[0]) {
      console.error('Usage: tmux-manager.js capture <session-name> [lines]');
      process.exit(1);
    }
    console.log(capture(args[0], parseInt(args[1]) || 50));
    break;
    
  case 'send':
    if (!args[0] || !args[1]) {
      console.error('Usage: tmux-manager.js send <session-name> <text>');
      process.exit(1);
    }
    send(args[0], args.slice(1).join(' '));
    break;
    
  case 'exists':
    if (!args[0]) {
      console.error('Usage: tmux-manager.js exists <session-name>');
      process.exit(1);
    }
    process.exit(exists(args[0]) ? 0 : 1);
    
  case 'kill':
    if (!args[0]) {
      console.error('Usage: tmux-manager.js kill <session-name>');
      process.exit(1);
    }
    kill(args[0]);
    break;
    
  default:
    console.log(`
Tmux Manager

Usage:
  node tmux-manager.js <command> [args]

Commands:
  list                    - List all sessions
  create <name> [cmd]     - Create new session (optionally run command)
  capture <name> [lines]  - Capture last N lines (default: 50)
  send <name> <text>      - Send keys to session
  exists <name>           - Check if session exists (exit 0 if yes)
  kill <name>             - Kill session
`);
}
