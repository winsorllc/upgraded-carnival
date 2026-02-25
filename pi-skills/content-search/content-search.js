#!/usr/bin/env node

/**
 * Content Search - Multi-backend search CLI
 * Based on zeroclaw's content_search tool architecture
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SEARCH_DIR = process.env.SEARCH_DIR || path.join(process.cwd(), '.search');
const INDEX_FILE = path.join(SEARCH_DIR, 'index.json');

// Ensure search directory exists
function ensureSearchDir() {
  if (!fs.existsSync(SEARCH_DIR)) {
    fs.mkdirSync(SEARCH_DIR, { recursive: true });
  }
}

// Load or create index
function loadIndex() {
  ensureSearchDir();
  if (fs.existsSync(INDEX_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    } catch {
      return { files: [], lastUpdated: null };
    }
  }
  return { files: [], lastUpdated: null };
}

// Save index
function saveIndex(index) {
  ensureSearchDir();
  index.lastUpdated = new Date().toISOString();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

// Search local files
function searchLocal(args) {
  const { 
    query, 
    path: searchPath = '.', 
    type = 'content', 
    extensions = [],
    maxResults = 20
  } = args;
  
  if (!query) {
    return { success: false, output: 'Query is required', error: 'Missing query' };
  }
  
  const results = [];
  const queryLower = query.toLowerCase();
  
  // Build find command
  let findCmd = `find ${searchPath} -type f`;
  if (extensions.length > 0) {
    const extPatterns = extensions.map(e => `-name "*.${e}"`).join(' -o ');
    findCmd += ` \\( ${extPatterns} \\)`;
  } else {
    // Default to common code files
    findCmd += ' \\( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.rs" -o -name "*.md" -o -name "*.json" \\)';
  }
  
  try {
    const files = execSync(findCmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
      .split('\n')
      .filter(f => f.trim());
    
    for (const file of files.slice(0, 500)) { // Limit files to search
      if (!fs.existsSync(file)) continue;
      
      try {
        const stat = fs.statSync(file);
        if (stat.isDirectory()) continue;
        
        if (type === 'filename') {
          if (file.toLowerCase().includes(queryLower)) {
            results.push({
              file,
              score: 1,
              matches: [query]
            });
          }
        } else {
          const content = fs.readFileSync(file, 'utf-8');
          const lines = content.split('\n');
          const matches = [];
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(queryLower)) {
              const lineStart = Math.max(0, i - 1);
              const lineEnd = Math.min(lines.length - 1, i + 1);
              matches.push({
                line: i + 1,
                content: lines[i].trim(),
                context: lines.slice(lineStart, lineEnd + 1).map((l, idx) => ({
                  line: lineStart + idx + 1,
                  text: l.trim()
                }))
              });
            }
          }
          
          if (matches.length > 0) {
            results.push({
              file,
              score: matches.length,
              matches: matches.slice(0, 3)
            });
          }
        }
      } catch (e) {
        // Skip files we can't read
      }
    }
  } catch (e) {
    return { success: false, output: 'Search failed: ' + e.message, error: e.message };
  }
  
  // Sort by score
  results.sort((a, b) => b.score - a.score);
  const topResults = results.slice(0, maxResults);
  
  if (topResults.length === 0) {
    return {
      success: true,
      output: `No results found for "${query}"`,
      error: null,
      results: []
    };
  }
  
  let output = `Found ${results.length} results for "${query}" (showing ${topResults.length}):\n\n`;
  
  for (const result of topResults) {
    output += `📄 ${result.file}\n`;
    if (result.matches && result.matches.length > 0) {
      for (const match of result.matches.slice(0, 2)) {
        if (typeof match === 'string') {
          output += `   Match: ${match.slice(0, 80)}\n`;
        } else if (match.content) {
          output += `   Line ${match.line}: ${match.content.slice(0, 80)}${match.content.length > 80 ? '...' : ''}\n`;
        }
      }
    }
    output += '\n';
  }
  
  return {
    success: true,
    output,
    error: null,
    results: topResults,
    total: results.length
  };
}

// Search GitHub
function searchGitHub(args) {
  const { query, repo, org, limit = 10 } = args;
  
  if (!query) {
    return { success: false, output: 'Query is required', error: 'Missing query' };
  }
  
  // Check for GitHub token
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return {
      success: false,
      output: 'GitHub token not found. Set GITHUB_TOKEN or GH_TOKEN environment variable.',
      error: 'No GitHub token',
      setup: 'Set GITHUB_TOKEN env var or add to .env'
    };
  }
  
  let searchQuery = query;
  if (repo) {
    searchQuery += ` repo:${repo}`;
  } else if (org) {
    searchQuery += ` org:${org}`;
  }
  
  try {
    const url = `https://api.github.com/search/code?q=${encodeURIComponent(searchQuery)}&per_page=${limit}`;
    const result = execSync(`curl -s -H "Authorization: token ${token}" -H "Accept: application/vnd.github.v3+json" "${url}"`, {
      encoding: 'utf-8'
    });
    
    const data = JSON.parse(result);
    
    if (data.items && data.items.length > 0) {
      let output = `Found ${data.total_count} results for "${query}":\n\n`;
      
      for (const item of data.items.slice(0, limit)) {
        output += `📄 ${item.full_name}\n`;
        output += `   ${item.html_url}\n`;
        if (item.description) {
          output += `   ${item.description.slice(0, 100)}\n`;
        }
        output += '\n';
      }
      
      return {
        success: true,
        output,
        error: null,
        results: data.items.slice(0, limit),
        total: data.total_count
      };
    } else {
      return {
        success: true,
        output: `No GitHub results found for "${query}"`,
        error: null,
        results: []
      };
    }
  } catch (e) {
    return {
      success: false,
      output: 'GitHub search failed: ' + e.message,
      error: e.message
    };
  }
}

// Search web
function searchWeb(args) {
  const { query, engine = 'ddg', limit = 10 } = args;
  
  if (!query) {
    return { success: false, output: 'Query is required', error: 'Missing query' };
  }
  
  try {
    // Try using ddgr (DuckDuckGo CLI) if available, otherwise curl
    let results = [];
    
    try {
      const output = execSync(`ddgr --json -n ${limit} "${query}"`, { encoding: 'utf-8' });
      results = output.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
    } catch {
      // Fallback to curl
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&b=${limit}`;
      const html = execSync(`curl -s "${url}"`, { encoding: 'utf-8' });
      
      // Simple regex parsing for DuckDuckGo HTML
      const resultRegex = /<a class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([^<]+)/g;
      let match;
      while ((match = resultRegex.exec(html)) !== null && results.length < limit) {
        results.push({
          title: match[2].replace(/<[^>]+>/g, ''),
          url: match[1],
          snippet: match[3].replace(/<[^>]+>/g, '')
        });
      }
    }
    
    if (results.length === 0) {
      return {
        success: true,
        output: `No web results found for "${query}"`,
        error: null,
        results: []
      };
    }
    
    let output = `Web results for "${query}":\n\n`;
    
    for (const result of results) {
      output += `🔗 ${result.title}\n`;
      output += `   ${result.url}\n`;
      if (result.snippet) {
        output += `   ${result.snippet.slice(0, 150)}...\n`;
      }
      output += '\n';
    }
    
    return {
      success: true,
      output,
      error: null,
      results
    };
  } catch (e) {
    return {
      success: false,
      output: 'Web search failed. Install ddgr or ensure curl is available.',
      error: e.message
    };
  }
}

// Index files for semantic search
function indexFiles(args) {
  const { path: indexPath = '.', extensions = [] } = args;
  
  const index = loadIndex();
  const files = [];
  
  // Find all files
  let findCmd = `find ${indexPath} -type f`;
  if (extensions.length > 0) {
    const extPatterns = extensions.map(e => `-name "*.${e}"`).join(' -o ');
    findCmd += ` \\( ${extPatterns} \\)`;
  } else {
    findCmd += ' \\( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.md" \\)';
  }
  
  try {
    const fileList = execSync(findCmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
      .split('\n')
      .filter(f => f.trim());
    
    for (const file of fileList) {
      if (!fs.existsSync(file)) continue;
      
      try {
        const stat = fs.statSync(file);
        if (stat.isDirectory()) continue;
        
        const content = fs.readFileSync(file, 'utf-8');
        
        // Extract simple keywords
        const words = new Set();
        const wordRegex = /\b[a-zA-Z]{3,}\b/g;
        let match;
        while ((match = wordRegex.exec(content)) !== null) {
          words.add(match[0].toLowerCase());
        }
        
        files.push({
          path: file,
          size: stat.size,
          modified: stat.mtime.toISOString(),
          keywords: Array.from(words).slice(0, 100)
        });
      } catch (e) {
        // Skip files we can't read
      }
    }
    
    index.files = files;
    saveIndex(index);
    
    return {
      success: true,
      output: `Indexed ${files.length} files from ${indexPath}`,
      error: null,
      indexed: files.length
    };
  } catch (e) {
    return {
      success: false,
      output: 'Indexing failed: ' + e.message,
      error: e.message
    };
  }
}

// CLI routing
const command = process.argv[2];
let args = {};

if (process.argv[3]) {
  try {
    args = JSON.parse(process.argv[3]);
  } catch {
    try {
      args = JSON.parse(fs.readFileSync(0, 'utf-8').trim());
    } catch {
      args = {};
    }
  }
}

let result;

switch (command) {
  case 'search':
  case 'local':
    result = searchLocal(args);
    break;
  case 'github':
    result = searchGitHub(args);
    break;
  case 'web':
    result = searchWeb(args);
    break;
  case 'index':
    result = indexFiles(args);
    break;
  default:
    result = {
      success: false,
      output: `Unknown command: ${command}. Available: search, github, web, index`,
      error: 'Unknown command'
    };
}

console.log(JSON.stringify(result, null, 2));
