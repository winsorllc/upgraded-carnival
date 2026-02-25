#!/usr/bin/env node

/**
 * Memory Forget - Remove a memory entry
 * 
 * Usage: memory-forget.js <key>
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const MEMORY_FILE = path.join(os.homedir(), '.thepopebot', 'memory.json');

/**
 * Load memory from file
 */
function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (e) {
    // Ignore errors
  }
  return { entries: {} };
}

/**
 * Save memory to file
 */
function saveMemory(memory) {
  const dir = path.dirname(MEMORY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

/**
 * Forget a memory entry
 */
function forget(key) {
  const memory = loadMemory();
  
  if (!memory.entries[key]) {
    return {
      success: false,
      key,
      error: 'Key not found'
    };
  }
  
  delete memory.entries[key];
  saveMemory(memory);
  
  return {
    success: true,
    key,
    message: `Deleted: ${key}`
  };
}

// CLI handling
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Memory Forget CLI');
  console.log('');
  console.log('Usage: memory-forget.js <key>');
  console.log('');
  console.log('Examples:');
  console.log('  memory-forget.js user_pref');
  process.exit(1);
}

const key = args[0];
const result = forget(key);
console.log(JSON.stringify(result, null, 2));
