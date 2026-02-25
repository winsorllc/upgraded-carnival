#!/usr/bin/env node

/**
 * Session Files Tracker
 * Tracks and summarizes file operations during the current session
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, relative, extname, dirname } from 'path';
import { createHash } from 'crypto';

// Determine the working directory and session ID
const JOB_ID = process.env.JOB_ID || 'interactive';
const SESSION_DIR = process.env.SESSION_DIR || '/job/logs';
const LOG_FILE = join(SESSION_DIR, JOB_ID, 'files.jsonl');

// Ensure the log directory exists
function ensureDir() {
  const dir = dirname(LOG_FILE);
  if (!existsSync(dir)) {
    const { mkdirSync } = require('fs');
    mkdirSync(dir, { recursive: true });
  }
}

// Track a file operation
function track(action, filePath, summary) {
  ensureDir();
  
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    path: resolve(filePath),
    summary,
    jobId: JOB_ID
  };
  
  writeFileSync(LOG_FILE, JSON.stringify(entry) + '\n', { flag: 'a' });
  
  const icons = { read: '📖', write: '📝', edit: '✏️' };
  console.log(`${icons[action] || '•'} ${action.toUpperCase()} ${filePath}`);
  console.log(`   → ${summary}`);
}

// List all tracked files
function list(filter, json, directory) {
  if (!existsSync(LOG_FILE)) {
    console.log('No files tracked yet.');
    return;
  }
  
  const content = readFileSync(LOG_FILE, 'utf-8');
  const entries = content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  
  // Filter by directory if specified
  let filtered = entries;
  if (directory) {
    const dir = resolve(directory);
    filtered = filtered.filter(e => e.path.startsWith(dir));
  }
  
  // Filter by action
  if (filter === 'changes') {
    filtered = filtered.filter(e => e.action === 'write' || e.action === 'edit');
  }
  
  if (json) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }
  
  if (filtered.length === 0) {
    console.log('No matching files found.');
    return;
  }
  
  console.log(`📄 Session Files - ${filtered.length} operations\n`);
  
  const icons = { read: '📖', write: '📝', edit: '✏️' };
  const now = new Date();
  
  for (const entry of filtered) {
    const time = new Date(entry.timestamp);
    const diff = Math.floor((now - time) / 1000);
    const ago = diff < 60 ? `${diff}s ago` : 
                diff < 3600 ? `${Math.floor(diff/60)}m ago` : 
                `${Math.floor(diff/3600)}h ago`;
    
    console.log(`${icons[entry.action] || '•'} ${entry.action.toUpperCase().padEnd(5)} ${entry.path} (${ago})`);
    console.log(`          ${entry.summary}\n`);
  }
}

// Get session summary
function summary() {
  if (!existsSync(LOG_FILE)) {
    console.log('No files tracked yet.');
    return;
  }
  
  const content = readFileSync(LOG_FILE, 'utf-8');
  const entries = content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  
  const counts = { read: 0, write: 0, edit: 0 };
  const dirs = {};
  const exts = {};
  
  for (const entry of entries) {
    counts[entry.action] = (counts[entry.action] || 0) + 1;
    
    const dir = dirname(entry.path);
    dirs[dir] = (dirs[dir] || 0) + 1;
    
    const ext = extname(entry.path) || '(no ext)';
    exts[ext] = (exts[ext] || 0) + 1;
  }
  
  console.log('📊 Session Summary');
  console.log('==================');
  console.log(`📖 Reads:     ${counts.read || 0}`);
  console.log(`✏️  Edits:     ${counts.edit || 0}`);
  console.log(`📝 Writes:    ${counts.write || 0}`);
  console.log('─────────────');
  console.log(`Total:       ${entries.length} operations\n`);
  
  // Most active directory
  const topDir = Object.entries(dirs).sort((a, b) => b[1] - a[1])[0];
  if (topDir) {
    console.log(`Most Active Directory:`);
    console.log(`  ${topDir[0]} (${topDir[1]} operations)\n`);
  }
  
  // File types
  if (Object.keys(exts).length > 0) {
    console.log('File Types:');
    for (const [ext, count] of Object.entries(exts).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      console.log(`  ${ext}:  ${count}`);
    }
  }
}

// Find operations on specific files
function find(pattern, path) {
  if (!existsSync(LOG_FILE)) {
    console.log('No files tracked yet.');
    return;
  }
  
  const content = readFileSync(LOG_FILE, 'utf-8');
  let entries = content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  
  if (path) {
    entries = entries.filter(e => e.path === resolve(path));
  }
  
  if (pattern) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    entries = entries.filter(e => regex.test(e.path));
  }
  
  if (entries.length === 0) {
    console.log('No matching operations found.');
    return;
  }
  
  console.log(`Found ${entries.length} matching operations:\n`);
  const icons = { read: '📖', write: '📝', edit: '✏️' };
  
  for (const entry of entries) {
    console.log(`${icons[entry.action]} ${entry.action.toUpperCase()} ${entry.path}`);
    console.log(`   ${entry.timestamp} - ${entry.summary}\n`);
  }
}

// Generate a report
function report(format, includeContent) {
  if (!existsSync(LOG_FILE)) {
    console.log('No files tracked yet.');
    return;
  }
  
  const content = readFileSync(LOG_FILE, 'utf-8');
  const entries = content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  
  if (format === 'json') {
    const report = {
      generated: new Date().toISOString(),
      sessionId: JOB_ID,
      totalOperations: entries.length,
      operations: entries
    };
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  
  // Group by action
  const reads = entries.filter(e => e.action === 'read');
  const writes = entries.filter(e => e.action === 'write');
  const edits = entries.filter(e => e.action === 'edit');
  
  let md = `# Session Report\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**Session ID:** ${JOB_ID}\n\n`;
  
  md += `## Summary\n\n`;
  md += `- **Total Operations:** ${entries.length}\n`;
  md += `- **Reads:** ${reads.length}\n`;
  md += `- **Writes:** ${writes.length}\n`;
  md += `- **Edits:** ${edits.length}\n\n`;
  
  function formatTable(items, title) {
    if (items.length === 0) return '';
    let t = `## ${title} (${items.length})\n\n`;
    t += `| Time | File | Summary |\n`;
    t += `|------|------|---------|\n`;
    for (const item of items) {
      const time = new Date(item.timestamp).toLocaleTimeString();
      const relPath = relative('/job', item.path);
      t += `| ${time} | ${relPath} | ${item.summary} |\n`;
    }
    return t + '\n';
  }
  
  md += formatTable(reads, 'Files Read');
  md += formatTable(writes, 'Files Written');
  md += formatTable(edits, 'Files Edited');
  
  console.log(md);
}

// Main CLI
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log(`
📁 Session Files Tracker

Usage:
  session-files track <action> <path> <summary>
  session-files list [--filter changes] [--json] [--directory <dir>]
  session-files summary
  session-files find [--pattern <regex>] [--path <file>]
  session-files report [--format json]

Examples:
  session-files track read /job/src/main.ts "Loaded main entry point"
  session-files track write /job/output.json "Generated results"
  session-files list --filter changes
  session-files summary
  session-files report

Environment:
  JOB_ID        - Session/job identifier (default: "interactive")
  SESSION_DIR   - Directory for log files (default: "/job/logs")
`);
  process.exit(0);
}

switch (command) {
  case 'track': {
    const action = args[1];
    const path = args[2];
    const summary = args.slice(3).join(' ') || 'No description';
    if (!action || !path) {
      console.error('Usage: session-files track <action> <path> <summary>');
      process.exit(1);
    }
    track(action, path, summary);
    break;
  }
  
  case 'list': {
    let filter, json = false, directory;
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--filter') filter = args[++i];
      else if (args[i] === '--json') json = true;
      else if (args[i] === '--directory') directory = args[++i];
    }
    list(filter, json, directory);
    break;
  }
  
  case 'summary':
    summary();
    break;
  
  case 'find': {
    let pattern, path;
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--pattern') pattern = args[++i];
      else if (args[i] === '--path') path = args[++i];
    }
    find(pattern, path);
    break;
  }
  
  case 'report': {
    let format, includeContent = false;
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--format') format = args[++i];
      else if (args[i] === '--include-content') includeContent = true;
    }
    report(format, includeContent);
    break;
  }
  
  default:
    console.error(`Unknown command: ${command}`);
    console.log('Run session-files without args for usage.');
    process.exit(1);
}
