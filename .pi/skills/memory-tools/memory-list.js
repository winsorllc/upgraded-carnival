#!/usr/bin/env node

/**
 * Memory List - List all memory keys
 * 
 * Usage: memory-list.js [--category <category>] [--tags <tags>]
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
 * List all memory entries
 */
function list(options = {}) {
  const memory = loadMemory();
  const entries = Object.entries(memory.entries);
  
  let results = entries
    .filter(([key, entry]) => !isExpired(entry))
    .map(([key, entry]) => ({
      key,
      value: entry.value,
      tags: entry.tags || [],
      category: entry.category || null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    }));
  
  // Filter by category
  if (options.category) {
    results = results.filter(e => e.category === options.category);
  }
  
  // Filter by tags
  if (options.tags) {
    const tagList = options.tags.split(',').map(t => t.trim());
    results = results.filter(e => 
      tagList.some(t => e.tags.includes(t))
    );
  }
  
  return {
    count: results.length,
    entries: results
  };
}

// CLI handling
const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--category' && args[i + 1]) {
    options.category = args[i + 1];
    i++;
  } else if (args[i] === '--tags' && args[i + 1]) {
    options.tags = args[i + 1];
    i++;
  }
}

const result = list(options);
console.log(JSON.stringify(result, null, 2));
