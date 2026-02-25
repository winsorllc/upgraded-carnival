#!/usr/bin/env node

/**
 * Session File Tracker
 * 
 * Tracks all files read, written, or edited during the agent session.
 * Provides commands to list, view, and navigate to tracked files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '..');

// Storage file for session file tracking
const TRACKER_FILE = path.join(BASE_DIR, 'tmp', 'session-files.json');

// File operation types
const OPS = {
  READ: 'read',
  WRITE: 'write',
  EDIT: 'edit'
};

/**
 * Load tracked files from storage
 * Converts operations back to Set
 */
function loadTracker() {
  try {
    if (fs.existsSync(TRACKER_FILE)) {
      const data = fs.readFileSync(TRACKER_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Convert operations arrays/objects back to Sets
      for (const key in parsed.files) {
        const file = parsed.files[key];
        if (file.operations && typeof file.operations === 'object') {
          if (Array.isArray(file.operations)) {
            file.operations = new Set(file.operations);
          } else {
            // It's an object with keys as operations
            file.operations = new Set(Object.keys(file.operations));
          }
        }
      }
      
      return parsed;
    }
  } catch (e) {
    console.error('Error loading tracker:', e.message);
  }
  return { files: {} };
}

/**
 * Save tracked files to storage
 * Converts Sets to arrays for JSON serialization
 */
function saveTracker(tracker) {
  const dir = path.dirname(TRACKER_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Deep clone and convert Sets to arrays for proper JSON serialization
  const serializable = {
    files: {}
  };
  
  for (const key in tracker.files) {
    const file = tracker.files[key];
    serializable.files[key] = {
      ...file,
      operations: file.operations instanceof Set 
        ? Array.from(file.operations) 
        : file.operations
    };
  }
  
  fs.writeFileSync(TRACKER_FILE, JSON.stringify(serializable, null, 2));
}

/**
 * Track a file operation
 */
function trackOperation(filePath, operation) {
  const tracker = loadTracker();
  const absPath = path.resolve(filePath);
  
  if (!tracker.files[absPath]) {
    tracker.files[absPath] = {
      path: absPath,
      relativePath: path.relative(process.cwd(), absPath),
      operations: new Set(),
      count: 0,
      firstSeen: Date.now(),
      lastSeen: Date.now()
    };
  }
  
  tracker.files[absPath].operations.add(operation);
  tracker.files[absPath].count++;
  tracker.files[absPath].lastSeen = Date.now();
  
  saveTracker(tracker);
  
  return tracker.files[absPath];
}

/**
 * Get color for terminal output
 */
function colorize(text, color) {
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
  };
  return (colors[color] || '') + text + colors.reset;
}

/**
 * Format operations as badges
 */
function formatOperations(ops) {
  let result = '[';
  if (ops.has(OPS.READ)) result += colorize('R', 'green');
  if (ops.has(OPS.WRITE)) result += colorize('W', 'yellow');
  if (ops.has(OPS.EDIT)) result += colorize('E', 'magenta');
  result += ']';
  return result;
}

/**
 * Format timestamp
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/**
 * List all tracked files
 */
function listFiles(limit = 0) {
  const tracker = loadTracker();
  const files = Object.values(tracker.files);
  
  if (files.length === 0) {
    console.log(colorize('No files tracked yet in this session.', 'gray'));
    return;
  }
  
  // Sort by last seen (most recent first)
  files.sort((a, b) => b.lastSeen - a.lastSeen);
  
  const displayFiles = limit > 0 ? files.slice(0, limit) : files;
  
  console.log(colorize(`\n=== Session Files (${files.length} total) ===\n`, 'cyan'));
  
  for (const file of displayFiles) {
    const ops = formatOperations(file.operations);
    const time = formatTime(file.lastSeen);
    const count = colorize(`(${file.count} op${file.count > 1 ? 's' : ''})`, 'gray');
    const relPath = file.relativePath || file.path;
    
    console.log(`${ops} ${relPath}  ${count}  ${time}`);
  }
  
  console.log('');
}

/**
 * Show files with uncommitted changes
 */
function showChangedFiles() {
  const tracker = loadTracker();
  const files = Object.values(tracker.files);
  
  if (files.length === 0) {
    console.log(colorize('No files tracked yet.', 'gray'));
    return;
  }
  
  const changed = [];
  
  for (const file of files) {
    try {
      if (fs.existsSync(file.path)) {
        const status = execSync(`git status --porcelain "${file.path}" 2>/dev/null`, { 
          encoding: 'utf-8',
          cwd: process.cwd()
        });
        if (status.trim()) {
          changed.push({ file, status: status.trim() });
        }
      }
    } catch (e) {
      // Not in a git repo or other error
    }
  }
  
  if (changed.length === 0) {
    console.log(colorize('No uncommitted changes in tracked files.', 'green'));
    return;
  }
  
  console.log(colorize(`\n=== Changed Files (${changed.length}) ===\n`, 'cyan'));
  
  for (const { file, status } of changed) {
    const relPath = file.relativePath || file.path;
    console.log(`${status} ${relPath}`);
  }
  
  console.log('');
}

/**
 * Open a file in VS Code
 */
function openFile(filePath) {
  const tracker = loadTracker();
  const absPath = path.resolve(filePath);
  
  // Check if file is tracked
  if (!tracker.files[absPath]) {
    // Try to find by partial match
    const matches = Object.keys(tracker.files).filter(p => 
      p.includes(filePath) || path.basename(p).includes(filePath)
    );
    
    if (matches.length === 0) {
      console.log(colorize(`File not tracked: ${filePath}`, 'red'));
      console.log(colorize('Run "session-files.js list" to see tracked files.', 'gray'));
      return;
    }
    
    if (matches.length === 1) {
      console.log(colorize(`Opening (not in tracker, but found): ${matches[0]}`, 'yellow'));
      execSync(`code -g "${matches[0]}"`, { stdio: 'inherit' });
      return;
    }
    
    console.log(colorize(`Multiple matches for: ${filePath}`, 'yellow'));
    for (const m of matches) {
      console.log(`  - ${m}`);
    }
    return;
  }
  
  console.log(colorize(`Opening: ${absPath}`, 'cyan'));
  execSync(`code -g "${absPath}"`, { stdio: 'inherit' });
}

/**
 * Show git diff for a file
 */
function showDiff(filePath) {
  const tracker = loadTracker();
  const absPath = path.resolve(filePath);
  
  if (!tracker.files[absPath]) {
    console.log(colorize(`File not tracked: ${filePath}`, 'red'));
    return;
  }
  
  try {
    console.log(colorize(`\n=== Diff: ${path.basename(absPath)} ===\n`, 'cyan'));
    execSync(`git diff "${absPath}"`, { stdio: 'inherit', cwd: process.cwd() });
  } catch (e) {
    console.log(colorize('No changes or not in git repository', 'gray'));
  }
}

/**
 * Show session activity summary
 */
function showSummary() {
  const tracker = loadTracker();
  const files = Object.values(tracker.files);
  
  if (files.length === 0) {
    console.log(colorize('No activity in this session yet.', 'gray'));
    return;
  }
  
  // Calculate statistics
  let totalOps = 0;
  let readCount = 0;
  let writeCount = 0;
  let editCount = 0;
  
  for (const file of files) {
    totalOps += file.count;
    if (file.operations.has(OPS.READ)) readCount++;
    if (file.operations.has(OPS.WRITE)) writeCount++;
    if (file.operations.has(OPS.EDIT)) editCount++;
  }
  
  const startTime = new Date(Math.min(...files.map(f => f.firstSeen)));
  const endTime = new Date(Math.max(...files.map(f => f.lastSeen)));
  const duration = Math.round((endTime - startTime) / 60000); // minutes
  
  console.log(colorize('\n=== Session Activity Summary ===\n', 'cyan'));
  console.log(`  Total files:     ${colorize(files.length.toString(), 'bright')}`);
  console.log(`  Total operations: ${colorize(totalOps.toString(), 'bright')}`);
  console.log(`  Files read:      ${colorize(readCount.toString(), 'green')}`);
  console.log(`  Files written:  ${colorize(writeCount.toString(), 'yellow')}`);
  console.log(`  Files edited:    ${colorize(editCount.toString(), 'magenta')}`);
  console.log(`  Session duration: ${duration > 0 ? duration + ' min' : '< 1 min'}`);
  
  // Show most active files
  const mostActive = [...files].sort((a, b) => b.count - a.count).slice(0, 5);
  console.log(colorize('\n  Most active files:', 'gray'));
  for (const file of mostActive) {
    console.log(`    ${file.count} ops: ${path.basename(file.path)}`);
  }
  
  console.log('');
}

/**
 * Track a file operation from command line
 */
function cliTrack(filePath, operation) {
  const result = trackOperation(filePath, operation);
  console.log(colorize(`Tracked: ${operation.toUpperCase()}`, 'green'), result.relativePath || result.path);
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'list';

switch (command) {
  case 'track':
    if (args.length < 2) {
      console.error('Usage: session-files.js track <path> <read|write|edit>');
      process.exit(1);
    }
    cliTrack(args[1], args[2]);
    break;
    
  case 'list':
    const limit = args[1] ? parseInt(args[1], 10) : 0;
    listFiles(limit);
    break;
    
  case 'recent':
    const recentCount = args[1] ? parseInt(args[1], 10) : 10;
    listFiles(recentCount);
    break;
    
  case 'changed':
    showChangedFiles();
    break;
    
  case 'open':
    if (args.length < 2) {
      console.error('Usage: session-files.js open <path>');
      process.exit(1);
    }
    openFile(args[1]);
    break;
    
  case 'diff':
    if (args.length < 2) {
      console.error('Usage: session-files.js diff <path>');
      process.exit(1);
    }
    showDiff(args[1]);
    break;
    
  case 'summary':
    showSummary();
    break;
    
  default:
    console.log(`Session File Tracker

Usage: session-files.js <command> [args]

Commands:
  list [n]           List all tracked files (or top n most recent)
  recent [n]         Show n most recent files (default: 10)
  changed            Show files with uncommitted changes
  open <path>        Open file in VS Code
  diff <path>        Show git diff for a file
  summary            Show session activity summary
  track <path> <op>  Manually track a file operation

Operation types: read, write, edit

Examples:
  session-files.js list
  session-files.js recent 5
  session-files.js open src/index.ts
  session-files.js diff config.json
`);
}
