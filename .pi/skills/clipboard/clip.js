#!/usr/bin/env node
/**
 * Clipboard Skill - Copy/paste operations
 */

const fs = require('fs');
const path = require('path');

const CLIPBOARD_FILE = '/tmp/popebot-clipboard.json';
const MAX_HISTORY = 50;

function loadClipboard() {
  try {
    if (fs.existsSync(CLIPBOARD_FILE)) {
      return JSON.parse(fs.readFileSync(CLIPBOARD_FILE, 'utf8'));
    }
  } catch (e) {
    // Ignore
  }
  return { current: '', history: [] };
}

function saveClipboard(data) {
  // Trim history if needed
  if (data.history.length > MAX_HISTORY) {
    data.history = data.history.slice(-MAX_HISTORY);
  }
  fs.writeFileSync(CLIPBOARD_FILE, JSON.stringify(data, null, 2));
}

function addToHistory(data, content) {
  // Don't add duplicates at the top
  if (data.history.length === 0 || data.history[data.history.length - 1] !== content) {
    data.history.push(content);
    // Keep only last MAX_HISTORY
    if (data.history.length > MAX_HISTORY) {
      data.history = data.history.slice(-MAX_HISTORY);
    }
  }
}

function copy(content) {
  const data = loadClipboard();
  addToHistory(data, content);
  data.current = content;
  saveClipboard(data);
  return { copied: true, length: content.length };
}

function paste() {
  const data = loadClipboard();
  return { 
    content: data.current, 
    length: data.current.length,
    timestamp: data.timestamp 
  };
}

function show() {
  return paste();
}

function clear() {
  const data = loadClipboard();
  const previous = data.current;
  addToHistory(data, data.current);
  data.current = '';
  saveClipboard(data);
  return { cleared: true, previousLength: previous.length };
}

function append(content) {
  const data = loadClipboard();
  const newContent = data.current + content;
  addToHistory(data, newContent);
  data.current = newContent;
  saveClipboard(data);
  return { appended: true, newLength: data.current.length };
}

function prepend(content) {
  const data = loadClipboard();
  const newContent = content + data.current;
  addToHistory(data, newContent);
  data.current = newContent;
  saveClipboard(data);
  return { prepended: true, newLength: data.current.length };
}

function copyFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return copy(content);
}

function saveToFile(filePath) {
  const data = loadClipboard();
  fs.writeFileSync(filePath, data.current, 'utf8');
  return { saved: true, file: filePath, bytes: Buffer.byteLength(data.current, 'utf8') };
}

function getHistory(options = {}) {
  const data = loadClipboard();
  const { index, limit = 10 } = options;
  
  if (index !== undefined) {
    const idx = parseInt(index);
    if (idx >= 0 && idx < data.history.length) {
      const item = data.history[data.history.length - 1 - idx];
      return { index, item: item.slice(0, 100) };
    }
    throw new Error(`History index ${index} out of range (0-${data.history.length - 1})`);
  }
  
  return {
    current: data.current.slice(0, 100),
    totalItems: data.history.length,
    history: data.history.slice(-limit).map((item, i) => ({
      index: i,
      preview: item.slice(0, 50) + (item.length > 50 ? '...' : ''),
      length: item.length
    })).reverse()
  };
}

function setFromHistory(index) {
  const data = loadClipboard();
  const idx = parseInt(index);
  if (idx >= 0 && idx < data.history.length) {
    data.current = data.history[data.history.length - 1 - idx];
    saveClipboard(data);
    return { set: true, index, length: data.current.length };
  }
  throw new Error(`History index ${index} out of range`);
}

// CLI
const [,, command, ...args] = process.argv;

function main() {
  if (!command || command === '--help' || command === '-h') {
    console.log(`Usage: clip.js <command> [args] [options]

Commands:
  copy <text>              Copy text to clipboard
  copy-file <file>        Copy file contents to clipboard
  paste                    Paste clipboard contents
  show                     Show clipboard (same as paste)
  clear                    Clear clipboard
  append <text>            Append text to current clipboard
  prepend <text>           Prepend text to current clipboard
  save <file>              Save clipboard to file
  history                  Show clipboard history
  history-set <index>      Set clipboard from history

Options:
  --index <n>             For history commands
  --limit <n>              Limit history items shown (default: 10)

Examples:
  clip.js copy "Hello World"
  clip.js copy-file document.txt
  clip.js paste
  clip.js append " More text"
  clip.js save output.txt
  clip.js history --limit 5
  clip.js history-set 0`);
    return 0;
  }
  
  let result;
  
  try {
    switch (command) {
      case 'copy': {
        const content = args.join(' ');
        if (!content) {
          console.error('Usage: clip.js copy <text>');
          return 1;
        }
        result = copy(content);
        break;
      }
      
      case 'copy-file': {
        if (!args[0]) {
          console.error('Usage: clip.js copy-file <file>');
          return 1;
        }
        result = copyFile(args[0]);
        break;
      }
      
      case 'paste':
      case 'show': {
        result = paste();
        // Print content directly for paste
        if (result.content) {
          console.log(result.content);
          return 0;
        }
        break;
      }
      
      case 'clear': {
        result = clear();
        break;
      }
      
      case 'append': {
        const content = args.join(' ');
        if (!content) {
          console.error('Usage: clip.js append <text>');
          return 1;
        }
        result = append(content);
        break;
      }
      
      case 'prepend': {
        const content = args.join(' ');
        if (!content) {
          console.error('Usage: clip.js prepend <text>');
          return 1;
        }
        result = prepend(content);
        break;
      }
      
      case 'save': {
        if (!args[0]) {
          console.error('Usage: clip.js save <file>');
          return 1;
        }
        result = saveToFile(args[0]);
        break;
      }
      
      case 'history': {
        const idx = args.indexOf('--index');
        const lim = args.indexOf('--limit');
        result = getHistory({
          index: idx >= 0 ? args[idx + 1] : undefined,
          limit: lim >= 0 ? parseInt(args[lim + 1]) || 10 : 10
        });
        break;
      }
      
      case 'history-set': {
        if (!args[0]) {
          console.error('Usage: clip.js history-set <index>');
          return 1;
        }
        result = setFromHistory(args[0]);
        break;
      }
      
      default:
        console.error(`Unknown command: ${command}`);
        return 1;
    }
    
    console.log(JSON.stringify(result, null, 2));
    return 0;
    
  } catch (error) {
    console.error('Error:', error.message);
    return 1;
  }
}

try {
  const exitCode = main();
  process.exit(exitCode);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
