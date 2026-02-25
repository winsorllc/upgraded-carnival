#!/usr/bin/env node

/**
 * Memory Search - Search memory for entries
 * 
 * Usage: memory-search.js <query> [--limit <number>]
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
 * Search memory entries
 */
function search(query, options = {}) {
  const memory = loadMemory();
  const limit = options.limit || 10;
  const queryLower = query.toLowerCase();
  
  const results = [];
  
  for (const [key, entry] of Object.entries(memory.entries)) {
    // Skip expired entries
    if (isExpired(entry)) continue;
    
    // Search in key, value, tags, and category
    const matches = 
      key.toLowerCase().includes(queryLower) ||
      (entry.value && entry.value.toLowerCase().includes(queryLower)) ||
      (entry.tags && entry.tags.some(t => t.toLowerCase().includes(queryLower))) ||
      (entry.category && entry.category.toLowerCase().includes(queryLower));
    
    if (matches) {
      results.push({
        key,
        value: entry.value,
        tags: entry.tags || [],
        category: entry.category || null,
        relevance: calculateRelevance(key, entry, queryLower)
      });
    }
  }
  
  // Sort by relevance
  results.sort((a, b) => b.relevance - a.relevance);
  
  return {
    query,
    count: results.length,
    results: results.slice(0, limit)
  };
}

/**
 * Calculate relevance score
 */
function calculateRelevance(key, entry, query) {
  let score = 0;
  
  // Exact key match
  if (key.toLowerCase() === query) score += 100;
  // Key starts with query
  else if (key.toLowerCase().startsWith(query)) score += 50;
  // Key contains query
  else if (key.toLowerCase().includes(query)) score += 25;
  
  // Value exact match
  if (entry.value && entry.value.toLowerCase() === query) score += 80;
  // Value starts with
  else if (entry.value && entry.value.toLowerCase().startsWith(query)) score += 40;
  // Value contains
  else if (entry.value && entry.value.toLowerCase().includes(query)) score += 20;
  
  // Tag match
  if (entry.tags && entry.tags.some(t => t.toLowerCase() === query)) score += 60;
  
  return score;
}

// CLI handling
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Memory Search CLI');
  console.log('');
  console.log('Usage: memory-search.js <query> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --limit <number>  Maximum results (default: 10)');
  console.log('');
  console.log('Examples:');
  console.log('  memory-search.js api');
  console.log('  memory-search.js user --limit 5');
  process.exit(1);
}

const query = args[0];
const options = {
  limit: 10
};

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) {
    options.limit = parseInt(args[i + 1], 10);
    i++;
  }
}

const result = search(query, options);
console.log(JSON.stringify(result, null, 2));
