#!/usr/bin/env node

/**
 * Memory Recall - Retrieve information from persistent memory
 * 
 * Usage: memory-recall.js <key> [--json]
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
 * Check if entry has expired
 */
function isExpired(entry) {
  if (!entry.expiresAt) return false;
  return new Date(entry.expiresAt) < new Date();
}

/**
 * Recall a memory entry
 */
function recall(key, options = {}) {
  const memory = loadMemory();
  
  if (!memory.entries[key]) {
    return {
      success: false,
      key,
      error: 'Key not found'
    };
  }
  
  const entry = memory.entries[key];
  
  // Check expiration
  if (isExpired(entry)) {
    delete memory.entries[key];
    saveMemory(memory);
    return {
      success: false,
      key,
      error: 'Entry has expired'
    };
  }
  
  if (options.json) {
    return {
      success: true,
      key,
      entry
    };
  }
  
  return {
    success: true,
    key,
    value: entry.value,
    tags: entry.tags || [],
    category: entry.category || null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  };
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

// CLI handling
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Memory Recall CLI');
  console.log('');
  console.log('Usage: memory-recall.js <key> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --json    Output full entry as JSON');
  console.log('');
  console.log('Examples:');
  console.log('  memory-recall.js user_pref');
  console.log('  memory-recall.js api_key --json');
  process.exit(1);
}

const key = args[0];
const options = {
  json: args.includes('--json')
};

const result = recall(key, options);
console.log(JSON.stringify(result, null, 2));
