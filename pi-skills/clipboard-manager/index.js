#!/usr/bin/env node

// Clipboard Manager - Read, write, and history management

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, basename } from 'path';
import { execSync, spawn } from 'child_process';
import { createHash } from 'crypto';

const CLIPBOARD_DIR = process.env.CLIPBOARD_DIR || './clipboard-history';
const CLIPBOARD_MAX_HISTORY = parseInt(process.env.CLIPBOARD_MAX_HISTORY || '100');

// Ensure directory exists
if (!existsSync(CLIPBOARD_DIR)) mkdirSync(CLIPBOARD_DIR, { recursive: true });

function getHistoryPath() {
  return join(CLIPBOARD_DIR, 'history.json');
}

function getConfigPath() {
  return join(CLIPBOARD_DIR, 'config.json');
}

function loadHistory() {
  const path = getHistoryPath();
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf-8'));
  }
  return { entries: [], pinned: [] };
}

function saveHistory(history) {
  writeFileSync(getHistoryPath(), JSON.stringify(history, null, 2));
}

function generateId() {
  return createHash('sha256')
    .update(Date.now().toString() + Math.random().toString())
    .digest('hex')
    .substring(0, 8);
}

function getClipboardContent() {
  try {
    // Try different clipboard commands based on platform
    const platform = process.platform;
    
    if (platform === 'darwin') {
      // macOS
      const result = execSync('pbpaste 2>/dev/null', { encoding: 'utf-8', timeout: 5000 });
      return { type: 'text', content: result };
    } else if (platform === 'linux') {
      // Linux - try xclip or xsel
      try {
        const result = execSync('xclip -selection clipboard -o 2>/dev/null', { encoding: 'utf-8', timeout: 5000 });
        return { type: 'text', content: result };
      } catch {
        try {
          const result = execSync('xsel --clipboard --output 2>/dev/null', { encoding: 'utf-8', timeout: 5000 });
          return { type: 'text', content: result };
        } catch {
          return { type: 'text', content: '' };
        }
      }
    } else {
      // Windows (WSL or native)
      try {
        const result = execSync('powershell -Command "Get-Clipboard" 2>/dev/null', { encoding: 'utf-8', timeout: 5000 });
        return { type: 'text', content: result };
      } catch {
        return { type: 'text', content: '' };
      }
    }
  } catch (err) {
    return { type: 'text', content: '', error: err.message };
  }
}

function setClipboardContent(content) {
  try {
    const platform = process.platform;
    
    if (platform === 'darwin') {
      execSync(`echo "${content.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" | pbcopy`, { timeout: 5000 });
    } else if (platform === 'linux') {
      try {
        execSync(`echo -n "${content.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" | xclip -selection clipboard`, { timeout: 5000 });
      } catch {
        execSync(`echo -n "${content.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" | xsel --clipboard --input`, { timeout: 5000 });
      }
    } else {
      execSync(`powershell -Command "Set-Clipboard -Value '${content.replace(/'/g, "''")}'"`, { timeout: 5000 });
    }
    return true;
  } catch (err) {
    return { error: err.message };
  }
}

function addToHistory(entry) {
  const history = loadHistory();
  
  // Check for duplicates (don't add if same as last entry)
  if (history.entries.length > 0) {
    const last = history.entries[0];
    if (last.content === entry.content && last.type === entry.type) {
      return last.id;
    }
  }
  
  const id = generateId();
  const newEntry = {
    id,
    ...entry,
    timestamp: new Date().toISOString(),
    pinned: false
  };
  
  // Add to beginning
  history.entries.unshift(newEntry);
  
  // Remove unpinned entries over limit
  const unpinnedCount = history.entries.filter(e => !e.pinned).length;
  if (unpinnedCount > CLIPBOARD_MAX_HISTORY) {
    const toRemove = history.entries.filter(e => !e.pinned).slice(CLIPBOARD_MAX_HISTORY);
    history.entries = history.entries.filter(e => e.pinned || !toRemove.includes(e));
  }
  
  saveHistory(history);
  return id;
}

// CLI Commands
const cmd = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  switch (cmd) {
    case 'read': {
      const content = getClipboardContent();
      console.log(content.content || '(empty)');
      break;
    }
      
    case 'write': {
      const content = args.join(' ').trim();
      if (!content) {
        console.error('Usage: clipboard write <content>');
        process.exit(1);
      }
      
      const result = setClipboardContent(content);
      if (result === true) {
        addToHistory({ type: 'text', content });
        console.log('Written to clipboard');
      } else {
        console.error('Failed:', result.error);
        process.exit(1);
      }
      break;
    }
      
    case 'history': {
      const history = loadHistory();
      let limit = 20;
      let type = null;
      let search = null;
      
      const limitIdx = args.indexOf('--limit');
      const typeIdx = args.indexOf('--type');
      const searchIdx = args.indexOf('--search');
      
      if (limitIdx >= 0 && limitIdx + 1 < args.length) limit = parseInt(args[limitIdx + 1]);
      if (typeIdx >= 0 && typeIdx + 1 < args.length) type = args[typeIdx + 1];
      if (searchIdx >= 0 && searchIdx + 1 < args.length) search = args[searchIdx + 1];
      
      let entries = history.entries;
      
      if (type) {
        entries = entries.filter(e => e.type === type);
      }
      
      if (search) {
        const q = search.toLowerCase();
        entries = entries.filter(e => 
          (e.content && e.content.toLowerCase().includes(q)) ||
          (e.path && e.path.toLowerCase().includes(q))
        );
      }
      
      entries = entries.slice(0, limit);
      
      if (entries.length === 0) {
        console.log('No clipboard history');
        break;
      }
      
      for (const entry of entries) {
        const pin = entry.pinned ? '📌 ' : '';
        const preview = entry.content 
          ? entry.content.substring(0, 80).replace(/\n/g, ' ') + (entry.content.length > 80 ? '...' : '')
          : entry.path;
        console.log(`${pin}[${entry.id}] ${entry.type} - ${entry.timestamp.split('T')[0]}: ${preview}`);
      }
      break;
    }
      
    case 'clear': {
      const all = args.includes('--all');
      const olderIdx = args.indexOf('--older-than');
      
      const history = loadHistory();
      
      if (all) {
        // Clear all unpinned
        history.entries = history.entries.filter(e => e.pinned);
        saveHistory(history);
        console.log('Cleared all unpinned entries');
      } else if (olderIdx >= 0 && olderIdx + 1 < args.length) {
        const days = parseInt(args[olderIdx + 1]);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        history.entries = history.entries.filter(e => 
          e.pinned || new Date(e.timestamp) > cutoff
        );
        saveHistory(history);
        console.log(`Cleared entries older than ${days} days`);
      } else {
        console.error('Usage: clipboard clear [--all] [--older-than <days>]');
        process.exit(1);
      }
      break;
    }
      
    case 'pin': {
      const id = args[0];
      if (!id) {
        console.error('Usage: clipboard pin <id>');
        process.exit(1);
      }
      
      const history = loadHistory();
      const entry = history.entries.find(e => e.id === id);
      
      if (!entry) {
        console.error('Entry not found:', id);
        process.exit(1);
      }
      
      entry.pinned = true;
      saveHistory(history);
      console.log('Pinned:', id);
      break;
    }
      
    case 'unpin': {
      const id = args[0];
      if (!id) {
        console.error('Usage: clipboard unpin <id>');
        process.exit(1);
      }
      
      const history = loadHistory();
      const entry = history.entries.find(e => e.id === id);
      
      if (!entry) {
        console.error('Entry not found:', id);
        process.exit(1);
      }
      
      entry.pinned = false;
      saveHistory(history);
      console.log('Unpinned:', id);
      break;
    }
      
    case 'copy': {
      const id = args[0];
      if (!id) {
        console.error('Usage: clipboard copy <id>');
        process.exit(1);
      }
      
      const history = loadHistory();
      const entry = history.entries.find(e => e.id === id);
      
      if (!entry) {
        console.error('Entry not found:', id);
        process.exit(1);
      }
      
      if (entry.type === 'text') {
        const result = setClipboardContent(entry.content);
        if (result === true) {
          // Move to top of history
          history.entries = history.entries.filter(e => e.id !== id);
          history.entries.unshift(entry);
          saveHistory(history);
          console.log('Copied to clipboard');
        } else {
          console.error('Failed:', result.error);
          process.exit(1);
        }
      } else {
        console.error('Can only copy text entries');
        process.exit(1);
      }
      break;
    }
      
    default:
      console.log(`Clipboard Manager

Usage: clipboard <command> [args...]

Commands:
  read
    Read current clipboard content
  write <content>
    Write content to clipboard
  history [--limit <n>] [--type <text|image|file>] [--search <query>]
    Show clipboard history
  clear [--all] [--older-than <days>]
    Clear clipboard history
  pin <id>
    Pin a clipboard entry
  unpin <id>
    Unpin a clipboard entry
  copy <id>
    Copy a historical entry back to clipboard

Environment Variables:
  CLIPBOARD_DIR: History directory (default: ./clipboard-history)
  CLIPBOARD_MAX_HISTORY: Max entries (default: 100)
`);
      process.exit(1);
  }
}

main().catch(console.error);
