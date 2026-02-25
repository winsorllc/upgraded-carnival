#!/usr/bin/env node
/**
 * Content Search - Search within file contents
 */
const fs = require('fs');
const path = require('path');

function parseArgs(args) {
  const result = {
    pattern: null,
    files: [],
    caseSensitive: true,
    regex: false,
    before: 0,
    after: 0,
    count: false,
    maxSize: 10 * 1024 * 1024, // 10MB max
    excludeDirs: ['node_modules', '.git', 'dist', 'build', '.tmp', 'tmp']
  };
  
  for (let i = 0; i < args.length; i++) {
    if (i === 0 && !args[i].startsWith('--')) {
      result.pattern = args[i];
    } else if (args[i] === '--files') {
      result.files.push(args[++i]);
    } else if (args[i] === '--case-insensitive') {
      result.caseSensitive = false;
    } else if (args[i] === '--regex') {
      result.regex = true;
    } else if (args[i] === '--before') {
      result.before = parseInt(args[++i]);
    } else if (args[i] === '--after') {
      result.after = parseInt(args[++i]);
    } else if (args[i] === '--count') {
      result.count = true;
    } else if (args[i] === '--max-size') {
      result.maxSize = parseInt(args[++i]) * 1024 * 1024;
    }
  }
  return result;
}

function isBinary(buffer) {
  // Check if file is binary by looking for null bytes
  // and high percentage of non-printable chars
  const sample = buffer.slice(0, 8000);
  let nonPrintable = 0;
  
  for (let i = 0; i < sample.length; i++) {
    const byte = sample[i];
    // Null bytes or control chars (except tab, newline, carriage return)
    if (byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) {
      nonPrintable++;
    }
  }
  
  return (nonPrintable / sample.length) > 0.1;
}

function shouldExcludeDir(dirPath, excludeDirs) {
  const parts = dirPath.split(path.sep);
  return excludeDirs.some(exclude => 
    parts.some(part => part === exclude || part.startsWith(exclude + path.sep))
  );
}

function globToRegex(pattern) {
  let regex = '';
  let i = 0;
  
  while (i < pattern.length) {
    const c = pattern[i];
    
    if (c === '**') {
      regex += '.*';
      i++;
    } else if (c === '*') {
      regex += '[^/]*';
      i++;
    } else if (c === '?') {
      regex += '[^/]';
      i++;
    } else if (/[.+^${}()|[\]\\]/.test(c)) {
      regex += '\\' + c;
      i++;
    } else {
      regex += c.replace(/[.+^${}()|[\]\\]/g, '\\$\u0026');
      i++;
    }
  }
  
  return new RegExp(regex);
}

function matchesFilePattern(filePath, patterns) {
  if (patterns.length === 0) return true;
  
  const fileName = path.basename(filePath);
  
  for (const pattern of patterns) {
    const regex = globToRegex(pattern);
    if (regex.test(fileName) || regex.test(filePath)) {
      return true;
    }
  }
  return false;
}

function searchFile(filePath, regex, args) {
  try {
    const stats = fs.statSync(filePath);
    
    if (stats.size > args.maxSize) {
      return { skipped: true, reason: 'File too large' };
    }
    
    const buffer = fs.readFileSync(filePath);
    
    if (isBinary(buffer)) {
      return { skipped: true, reason: 'Binary file' };
    }
    
    const content = buffer.toString('utf8');
    const lines = content.split(/\r?\n/);
    const matches = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = regex.test(line);
      
      // Reset lastIndex for global regex
      if (args.regex && regex.global) {
        regex.lastIndex = 0;
      }
      
      if (match) {
        matches.push({
          line: i + 1,
          content: line,
          context: {
            before: lines.slice(Math.max(0, i - args.before), i),
            after: lines.slice(i + 1, Math.min(lines.length, i + 1 + args.after))
          }
        });
      }
    }
    
    return { matches, totalLines: lines.length };
  } catch (e) {
    return { error: e.message };
  }
}

function searchDirectory(dir, args, regex, results) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!shouldExcludeDir(fullPath, args.excludeDirs)) {
          searchDirectory(fullPath, args, regex, results);
        }
      } else if (entry.isFile()) {
        if (matchesFilePattern(fullPath, args.files)) {
          const searchResult = searchFile(fullPath, regex, args);
          if (searchResult.matches && searchResult.matches.length > 0) {
            results.push({
              file: fullPath,
              ...searchResult
            });
          } else if (!searchResult.skipped && !searchResult.error) {
            // Track files with no matches separately
          }
        }
      }
    }
  } catch (e) {
    // Permission denied or other error
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.pattern) {
    console.log('Content Search - Search within file contents');
    console.log('');
    console.log('Usage: content-search.js <pattern> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --files <pattern>      File pattern(s) to search (default: all files)');
    console.log('  --case-insensitive     Case-insensitive search');
    console.log('  --regex                Treat pattern as regular expression');
    console.log('  --before <n>           Show n lines before match');
    console.log('  --after <n>            Show n lines after match');
    console.log('  --count                Count matches only');
    console.log('  --max-size <MB>       Skip files larger than MB (default: 10)');
    console.log('');
    console.log('Examples:');
    console.log('  content-search.js "TODO" --files "*.js"');
    console.log('  content-search.js "function\\s+\\w+" --files "*.ts" --regex');
    console.log('  content-search.js "import" --files "*.js" --before 2 --after 2');
    process.exit(1);
  }
  
  // Create regex
  let regex;
  const flags = args.caseSensitive ? 'g' : 'gi';
  
  if (args.regex) {
    try {
      regex = new RegExp(args.pattern, flags);
    } catch (e) {
      console.error(`Invalid regex pattern: ${e.message}`);
      process.exit(1);
    }
  } else {
    const escaped = args.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$\u0026');
    regex = new RegExp(escaped, flags);
  }
  
  const results = [];
  searchDirectory(process.cwd(), args, regex, results);
  
  let totalMatches = 0;
  let totalFiles = 0;
  
  if (args.count) {
    for (const result of results) {
      if (result.matches) {
        totalMatches += result.matches.length;
        totalFiles++;
      }
    }
    console.log(`${totalMatches} matches across ${totalFiles} files`);
  } else {
    for (const result of results) {
      if (result.error) {
        console.log(`\n${result.file}:`);
        console.log(`  Error: ${result.error}`);
        continue;
      }
      
      if (result.skipped) {
        continue;
      }
      
      console.log(`\n${result.file}:`);
      
      for (const match of result.matches) {
        // Print context before
        for (const ctx of match.context.before) {
          console.log(`  ${match.line - match.context.before.length - 1 + match.context.before.indexOf(ctx) + 1}: ${ctx}`);
        }
        
        // Print match line
        console.log(`  \u001b[32m${match.line}: ${match.content}\u001b[0m`);
        
        // Print context after
        for (let i = 0; i < match.context.after.length; i++) {
          const ctx = match.context.after[i];
          console.log(`  ${match.line + i + 1}: ${ctx}`);
        }
        
        totalMatches++;
      }
      
      totalFiles++;
    }
    
    console.log(`\nFound ${totalMatches} matches in ${totalFiles} files`);
  }
}

main();