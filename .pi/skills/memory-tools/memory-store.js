#!/usr/bin/env node

/**
 * Memory Store - Store information in persistent memory
 * 
 * Usage: memory-store.js <key> <value> [--tags tag1,tag2] [--category category] [--ttl seconds]
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
 * Parse TTL (time to live) value
 */
function parseTTL(ttlStr) {
  if (!ttlStr) return null;
  
  const num = parseInt(ttlStr, 10);
  if (isNaN(num)) return null;
  
  // If it's already in seconds (small number), use as-is
  // Otherwise assume milliseconds
  return num < 10000000000 ? num * 1000 : num;
}

/**
 * Store a memory entry
 */
function store(key, value, options = {}) {
  const memory = loadMemory();
  
  const entry = {
    key,
    value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  if (options.tags) {
    entry.tags = options.tags.split(',').map(t => t.trim()).filter(t => t);
  }
  
  if (options.category) {
    entry.category = options.category;
  }
  
  if (options.ttl) {
    entry.expiresAt = new Date(Date.now() + options.ttl).toISOString();
  }
  
  memory.entries[key] = entry;
  
  // Save
  saveMemory(memory);
  
  return {
    success: true,
    key,
    message: `Stored: ${key}`
  };
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const result = {
    key: '',
    value: '',
    options: {}
  };
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if (arg === '--tags' && args[i + 1]) {
      result.options.tags = args[i + 1];
      i += 2;
    } else if (arg === '--category' && args[i + 1]) {
      result.options.category = args[i + 1];
      i += 2;
    } else if (arg === '--ttl' && args[i + 1]) {
      result.options.ttl = parseTTL(args[i + 1]);
      i += 2;
    } else if (!result.key) {
      result.key = arg;
      i++;
    } else if (!result.value) {
      result.value = arg;
      i++;
    } else {
      i++;
    }
  }
  
  return result;
}

// CLI handling
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Memory Store CLI');
  console.log('');
  console.log('Usage: memory-store.js <key> <value> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --tags <tags>       Comma-separated tags');
  console.log('  --category <cat>    Category');
  console.log('  --ttl <seconds>     Time to live');
  console.log('');
  console.log('Examples:');
  console.log('  memory-store.js user_pref "dark_mode" --category preferences');
  console.log('  memory-store.js api_key "secret123" --tags "api,production"');
  process.exit(1);
}

const parsed = parseArgs(args);

if (!parsed.key || !parsed.value) {
  console.error('Error: Both key and value are required');
  process.exit(1);
}

const result = store(parsed.key, parsed.value, parsed.options);
console.log(JSON.stringify(result, null, 2));
