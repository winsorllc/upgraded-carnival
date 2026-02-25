#!/usr/bin/env node

/**
 * Code Search - Search indexed codebase for symbols, patterns, and text
 * Usage: node search.js <query> [project-path]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CACHE_DIR = '/tmp/code-indexer-cache';
const DEFAULT_PROJECT = process.cwd();

// Try to use ripgrep if available
function hasRipgrep() {
  try {
    execSync('rg --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Load index from cache
function loadIndex(projectPath) {
  const cachePath = path.join(CACHE_DIR, 'index.json');
  
  if (!fs.existsSync(cachePath)) {
    return null;
  }
  
  try {
    const index = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    
    // Check if index is for the same project
    if (index.project !== path.resolve(projectPath || DEFAULT_PROJECT)) {
      console.warn('Warning: Index is for a different project. Run index.js first.');
      return null;
    }
    
    return index;
  } catch {
    return null;
  }
}

// Search using the index
function searchIndex(query, index) {
  const results = [];
  const lowerQuery = query.toLowerCase();
  
  // Search indexed symbols
  for (const [symbol, locations] of Object.entries(index.symbols)) {
    if (symbol.toLowerCase().includes(lowerQuery)) {
      for (const loc of locations) {
        results.push({
          file: loc.file,
          line: loc.line,
          type: loc.type,
          match: symbol,
          context: 'Symbol definition'
        });
      }
    }
  }
  
  return results;
}

// Search using ripgrep (faster for large codebases)
function searchRipgrep(query, projectPath, options = {}) {
  const { limit = 50, caseSensitive = false } = options;
  
  try {
    const args = [
      '-n',
      '--line-number',
      '--color=never',
      caseSensitive ? '' : '-i',
      '-m', limit.toString(),
      query,
      projectPath
    ].filter(Boolean);
    
    const output = execSync(`rg ${args.join(' ')}`, { 
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });
    
    const results = [];
    const lines = output.split('\n').filter(Boolean);
    
    for (const line of lines) {
      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      if (match) {
        results.push({
          file: match[1],
          line: parseInt(match[2]),
          type: 'match',
          match: query,
          context: match[3].trim()
        });
      }
    }
    
    return results;
  } catch {
    return [];
  }
}

// Search using basic grep
function searchGrep(query, projectPath, options = {}) {
  const { limit = 50 } = options;
  
  try {
    // Use find and grep combination
    const findCmd = `find "${projectPath}" -type f \\( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.py" -o -name "*.java" -o -name "*.go" -o -name "*.rs" \\) -exec grep -n -i -m ${limit} "${query}" {} + 2>/dev/null`;
    
    const output = execSync(findCmd, { encoding: 'utf-8' });
    
    const results = [];
    const lines = output.split('\n').filter(Boolean);
    
    for (const line of lines) {
      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      if (match) {
        results.push({
          file: match[1],
          line: parseInt(match[2]),
          type: 'match',
          match: query,
          context: match[3].trim()
        });
      }
    }
    
    return results;
  } catch {
    return [];
  }
}

// Main search function
function search(query, projectPath = DEFAULT_PROJECT) {
  const startTime = Date.now();
  const absolutePath = path.resolve(projectPath);
  
  // Parse options from query (e.g., "query --limit 20")
  let limit = 50;
  let caseSensitive = false;
  
  const optMatch = query.match(/--(\w+)\s+(\S+)$/);
  if (optMatch) {
    if (optMatch[1] === 'limit') {
      limit = parseInt(optMatch[2]);
      query = query.replace(/--\w+\s+\S+$/, '').trim();
    } else if (optMatch[1] === 'case') {
      caseSensitive = optMatch[2] === 'sensitive';
      query = query.replace(/--\w+\s+\S+$/, '').trim();
    }
  }
  
  console.log(`Searching for: "${query}" in ${absolutePath}`);
  
  let results = [];
  
  // Try indexed search first
  const index = loadIndex(absolutePath);
  if (index) {
    results = searchIndex(query, index);
    console.log(`Found ${results.length} results in index`);
  }
  
  // If no index or need more results, use grep
  if (results.length < limit) {
    const remainingLimit = limit - results.length;
    
    if (hasRipgrep()) {
      const grepResults = searchRipgrep(query, absolutePath, { limit: remainingLimit, caseSensitive });
      results = [...results, ...grepResults];
    } else {
      const grepResults = searchGrep(query, absolutePath, { limit: remainingLimit });
      results = [...results, ...grepResults];
    }
  }
  
  // Deduplicate results
  const seen = new Set();
  results = results.filter(r => {
    const key = `${r.file}:${r.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // Sort by file and line
  results.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return a.line - b.line;
  });
  
  // Limit results
  results = results.slice(0, limit);
  
  const took = Date.now() - startTime;
  
  // Format output
  const output = {
    query,
    results: results.map(r => ({
      file: r.file.replace(absolutePath + '/', ''),
      line: r.line,
      type: r.type,
      context: r.context.substring(0, 100)
    })),
    total: results.length,
    took: `${took}ms`
  };
  
  console.log('\n' + '='.repeat(60));
  console.log(`Found ${results.length} results in ${took}ms`);
  console.log('='.repeat(60));
  
  for (const result of results.slice(0, 20)) {
    console.log(`\n${result.file}:${result.line} [${result.type}]`);
    console.log(`  ${result.context}`);
  }
  
  if (results.length > 20) {
    console.log(`\n... and ${results.length - 20} more results`);
  }
  
  return output;
}

// CLI
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node search.js <query> [project-path]');
  console.log('Examples:');
  console.log('  node search.js "functionName"');
  console.log('  node search.js "const x = 5" ./my-project');
  console.log('  node search.js "async"');
  process.exit(1);
}

// Handle options (--limit, --case)
let query = args[0];
let projectPath = args[1] || DEFAULT_PROJECT;

if (query.startsWith('--')) {
  // No query provided
  console.log('Usage: node search.js <query> [project-path]');
  process.exit(1);
}

search(query, projectPath);
