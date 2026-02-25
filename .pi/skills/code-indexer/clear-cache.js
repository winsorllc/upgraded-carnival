#!/usr/bin/env node

/**
 * Clear Cache - Clear the code indexer cache
 * Usage: node clear-cache.js
 */

const fs = require('fs');
const path = require('path');

const CACHE_DIR = '/tmp/code-indexer-cache';

function clearCache() {
  if (!fs.existsSync(CACHE_DIR)) {
    console.log('Cache directory does not exist');
    return;
  }
  
  try {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
    console.log('Cache cleared successfully');
  } catch (err) {
    console.error('Error clearing cache:', err.message);
    process.exit(1);
  }
}

clearCache();
