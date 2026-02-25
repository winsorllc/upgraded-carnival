#!/usr/bin/env node
/**
 * Glob Finder - Pattern-based file search
 */
const fs = require('fs');
const path = require('path');

function parseArgs(args) {
  const result = {
    patterns: [],
    excludes: [],
    type: null, // 'f' for files, 'd' for directories
    details: false,
    limit: null,
    minSize: null,
    format: 'text'
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--exclude') {
      result.excludes.push(args[++i]);
    } else if (args[i] === '--type') {
      result.type = args[++i];
    } else if (args[i] === '--details') {
      result.details = true;
    } else if (args[i] === '--limit') {
      result.limit = parseInt(args[++i]);
    } else if (args[i] === '--min-size') {
      const size = args[++i];
      if (size.endsWith('MB')) result.minSize = parseInt(size) * 1024 * 1024;
      else if (size.endsWith('KB')) result.minSize = parseInt(size) * 1024;
      else if (size.endsWith('GB')) result.minSize = parseInt(size) * 1024 * 1024 * 1024;
      else result.minSize = parseInt(size);
    } else if (args[i] === '--json') {
      result.format = 'json';
    } else if (!args[i].startsWith('--')) {
      result.patterns.push(args[i]);
    }
  }
  return result;
}

function globToRegex(pattern) {
  let regex = '';
  let i = 0;
  
  while (i < pattern.length) {
    const c = pattern[i];
    
    if (c === '**') {
      // Handle **
      if (pattern[i + 1] === '/') {
        regex += '(?:.*/)?';
        i += 2;
      } else {
        regex += '.*';
        i++;
      }
    } else if (c === '*') {
      regex += '[^/]*';
      i++;
    } else if (c === '?') {
      regex += '[^/]';
      i++;
    } else if (c === '[' && pattern[i + 1] === '!') {
      // Negated character class [!<chars>]
      const endIdx = pattern.indexOf(']', i);
      if (endIdx !== -1) {
        regex += `[^${pattern.slice(i + 2, endIdx)}]`;
        i = endIdx + 1;
      } else {
        regex += '\\[';
        i++;
      }
    } else if (c === '[') {
      // Character class [<chars>]
      const endIdx = pattern.indexOf(']', i);
      if (endIdx !== -1) {
        regex += `[${pattern.slice(i + 1, endIdx)}]`;
        i = endIdx + 1;
      } else {
        regex += '\\[';
        i++;
      }
    } else if (c === '{') {
      // Brace expansion {a,b,c}
      const endIdx = pattern.indexOf('}', i);
      if (endIdx !== -1) {
        const options = pattern.slice(i + 1, endIdx).split(',');
        regex += `(?:${options.map(escapeRegex).join('|')})`;
        i = endIdx + 1;
      } else {
        regex += '\\{';
        i++;
      }
    } else if (/[.+^${}()|\\]/.test(c)) {
      regex += '\\' + c;
      i++;
    } else {
      regex += escapeRegex(c);
      i++;
    }
  }
  
  return new RegExp('^' + regex + '$');
}

function escapeRegex(str) {
  return str.replace(/[.+^${}()|[\]\\]/g, '\\$\u0026');
}

function shouldExclude(filePath, excludes) {
  const fileName = path.basename(filePath);
  const parts = filePath.split(path.sep);
  
  for (const exclude of excludes) {
    const excludeRegex = globToRegex(exclude);
    if (excludeRegex.test(fileName)) return true;
    if (excludeRegex.test(filePath)) return true;
    // Check if any part of the path matches
    for (const part of parts) {
      if (excludeRegex.test(part)) return true;
    }
  }
  return false;
}

function matchesPattern(filePath, pattern) {
  const fileName = path.basename(filePath);
  const regex = globToRegex(pattern);
  
  // Try matching just the filename first
  if (regex.test(fileName)) return true;
  
  // Try matching the full path
  return regex.test(filePath);
}

function searchDirectory(dir, patterns, excludes, type, results, limit) {
  if (limit && results.length >= limit) return;
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(process.cwd(), fullPath);
      
      // Check excludes
      if (shouldExclude(fullPath, excludes) || shouldExclude(relativePath, excludes)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        // Check if directory matches
        if (!type || type === 'd') {
          for (const pattern of patterns) {
            if (matchesPattern(fullPath, pattern) || matchesPattern(relativePath, pattern)) {
              results.push(fullPath);
              break;
            }
          }
        }
        
        // Recurse into subdirectories
        searchDirectory(fullPath, patterns, excludes, type, results, limit);
      } else if (entry.isFile()) {
        // Check if file matches
        if (!type || type === 'f') {
          for (const pattern of patterns) {
            if (matchesPattern(fullPath, pattern) || matchesPattern(relativePath, pattern)) {
              results.push(fullPath);
              break;
            }
          }
        }
      }
      
      if (limit && results.length >= limit) return;
    }
  } catch (e) {
    // Permission denied or other error - skip this directory
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (args.patterns.length === 0) {
    console.log('Glob Finder - Pattern-based file search');
    console.log('');
    console.log('Usage: glob.js <pattern> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --exclude <pattern>  Exclude pattern (can use multiple)');
    console.log('  --type f|d          Filter by type (file or directory)');
    console.log('  --details           Show size and modification time');
    console.log('  --limit <n>         Limit results to n items');
    console.log('  --min-size <size>  Minimum file size (e.g., 1MB)');
    console.log('  --json              Output as JSON');
    console.log('');
    console.log('Examples:');
    console.log('  glob.js "*.js"');
    console.log('  glob.js "**/*.md" --exclude node_modules');
    process.exit(1);
  }
  
  const results = [];
  searchDirectory(process.cwd(), args.patterns, args.excludes, args.type, results, args.limit);
  
  if (args.minSize) {
    results.forEach((file, index) => {
      try {
        const stats = fs.statSync(file);
        if (stats.size < args.minSize) {
          results.splice(index, 1);
        }
      } catch (e) {
        results.splice(index, 1);
      }
    });
  }
  
  if (args.details) {
    const detailedResults = results.map(file => {
      try {
        const stats = fs.statSync(file);
        return {
          path: file,
          size: stats.size,
          sizeHuman: formatBytes(stats.size),
          modified: stats.mtime.toISOString(),
          isDirectory: stats.isDirectory()
        };
      } catch (e) {
        return { path: file, error: e.message };
      }
    });
    
    if (args.format === 'json') {
      console.log(JSON.stringify(detailedResults, null, 2));
    } else {
      detailedResults.forEach(item => {
        if (item.error) {
          console.log(`${item.path} [error: ${item.error}]`);
        } else {
          const type = item.isDirectory ? 'DIR' : 'FILE';
          console.log(`${type.padEnd(5)} ${item.sizeHuman.padStart(8)} ${item.modified.substring(0, 19)} ${item.path}`);
        }
      });
    }
  } else {
    if (args.format === 'json') {
      console.log(JSON.stringify(results, null, 2));
    } else {
      results.forEach(file => console.log(file));
    }
  }
  
  console.log(`\nFound ${results.length} items`);
}

main();