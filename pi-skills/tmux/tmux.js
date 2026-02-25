#!/usr/bin/env node

/**
 * tmux - Control tmux sessions
 * 
 * Usage: tmux.js <command> [args...]
 * 
 * Commands:
 *   list                        - List all sessions
 *   capture <session>           - Capture pane output
 *   send <session> <text>      - Send text to session
 *   new <session>              - Create new session
 *   kill <session>             - Kill a session
 *   rename <old> <new>         - Rename session
 *   windows <session>          - List windows in session
 *   panes <session>            - List panes in session
 */

const { execSync, spawnSync } = require('child_process');

function runTmux(args, options = {}) {
  try {
    const cmd = ['tmux', ...args].join(' ');
    if (options.verbose) console.log(`Running: ${cmd}`);
    const output = execSync(cmd, { 
      encoding: 'utf-8', 
      maxBuffer: 10 * 1024 * 1024,
      ...options 
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    };
  }
}

function capturePane(session, options = {}) {
  const args = ['capture-pane', '-t', session];
  
  if (options.scrollback) {
    args.push('-S', '-');
  }
  
  args.push('-p');
  
  return runTmux(args);
}

function sendKeys(session, text, options = {}) {
  const args = ['send-keys', '-t', session];
  
  if (text) {
    args.push(text);
  }
  
  if (options.key) {
    args.push(options.key);
  } else if (options.enter) {
    args.push('Enter');
  }
  
  return runTmux(args);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage:');
    console.error('  tmux.js list');
    console.error('  tmux.js capture <session> [--scrollback]');
    console.error('  tmux.js send <session> <text> [--enter] [--key <key>]');
    console.error('  tmux.js new <session>');
    console.error('  tmux.js kill <session>');
    console.error('  tmux.js rename <old> <new>');
    console.error('  tmux.js windows <session>');
    console.error('  tmux.js panes <session>');
    process.exit(1);
  }

  const command = args[0];
  let result;
  
  switch (command) {
    case 'list':
    case 'ls':
      result = runTmux(['list-sessions', '-F', '#{session_name}']);
      break;
      
    case 'capture':
      if (args.length < 2) {
        console.error('Error: capture requires <session>');
        process.exit(1);
      }
      const session = args[1];
      const scrollback = args.includes('--scrollback');
      result = capturePane(session, { scrollback });
      break;
      
    case 'send':
      if (args.length < 3) {
        console.error('Error: send requires <session> and <text>');
        process.exit(1);
      }
      const sendSession = args[1];
      const sendText = args[2];
      const enter = args.includes('--enter');
      const keyIndex = args.indexOf('--key');
      const key = keyIndex > -1 ? args[keyIndex + 1] : null;
      result = sendKeys(sendSession, sendText, { enter, key });
      break;
      
    case 'new':
      if (args.length < 2) {
        console.error('Error: new requires <session>');
        process.exit(1);
      }
      result = runTmux(['new-session', '-d', '-s', args[1]]);
      break;
      
    case 'kill':
      if (args.length < 2) {
        console.error('Error: kill requires <session>');
        process.exit(1);
      }
      result = runTmux(['kill-session', '-t', args[1]]);
      break;
      
    case 'rename':
      if (args.length < 3) {
        console.error('Error: rename requires <old> and <new>');
        process.exit(1);
      }
      result = runTmux(['rename-session', '-t', args[1], args[2]]);
      break;
      
    case 'windows':
      if (args.length < 2) {
        console.error('Error: windows requires <session>');
        process.exit(1);
      }
      result = runTmux(['list-windows', '-t', args[1], '-F', '#{window_index}: #{window_name}']);
      break;
      
    case 'panes':
      if (args.length < 2) {
        console.error('Error: panes requires <session>');
        process.exit(1);
      }
      result = runTmux(['list-panes', '-t', args[1], '-F', '#{pane_index}: #{pane_current_command}']);
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Available commands: list, capture, send, new, kill, rename, windows, panes');
      process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

// Only run main when executed directly
if (require.main === module) {
  main();
}

module.exports = { capturePane, sendKeys, runTmux };
