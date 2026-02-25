#!/usr/bin/env node
/**
 * Line Counter - Count lines of code by language
 */

const fs = require('fs');
const path = require('path');

const LANGUAGE_PATTERNS = {
  javascript: { extensions: ['.js', '.jsx', '.mjs'], single: '//', multi: ['/*', '*/'] },
  typescript: { extensions: ['.ts', '.tsx'], single: '//', multi: ['/*', '*/'] },
  python: { extensions: ['.py'], single: '#', multi: ['"""', '"""'] },
  java: { extensions: ['.java'], single: '//', multi: ['/*', '*/'] },
  c: { extensions: ['.c', '.h', '.cpp', '.hpp', '.cc'], single: '//', multi: ['/*', '*/'] },
  go: { extensions: ['.go'], single: '//', multi: ['/*', '*/'] },
  rust: { extensions: ['.rs'], single: '//', multi: ['/*', '*/'] },
  ruby: { extensions: ['.rb'], single: '#', multi: ['=begin', '=end'] },
  php: { extensions: ['.php'], single: ['//', '#'], multi: ['/*', '*/'] },
  shell: { extensions: ['.sh', '.bash', '.zsh'], single: '#', multi: null },
  perl: { extensions: ['.pl', '.pm'], single: '#', multi: null },
  r: { extensions: ['.r'], single: '#', multi: null },
  sql: { extensions: ['.sql'], single: '--', multi: ['/*', '*/'] },
  html: { extensions: ['.html', '.htm'], single: null, multi: ['<!--', '-->'] },
  css: { extensions: ['.css', '.scss', '.sass'], single: null, multi: ['/*', '*/'] },
  yaml: { extensions: ['.yml', '.yaml'], single: '#', multi: null },
  json: { extensions: ['.json'], single: null, multi: null },
  markdown: { extensions: ['.md', '.markdown'], single: null, multi: null },
  xml: { extensions: ['.xml', '.svg'], single: null, multi: ['<!--', '-->'] }
};

function getLanguageForFile(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (pattern.extensions.includes(ext)) return lang;
  }
  return 'other';
}

function detectLine(line, lang) {
  const trimmed = line.trim();
  if (trimmed === '') return 'blank';
  
  const pattern = LANGUAGE_PATTERNS[lang] || {};
  const singleComments = Array.isArray(pattern.single) ? pattern.single : [pattern.single];
  
  for (const marker of singleComments) {
    if (marker && trimmed.startsWith(marker)) return 'comment';
  }
  
  // Multi-line comments are handled at file level
  return 'code';
}

function countFile(filepath, language) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  const stats = {
    total: lines.length,
    code: 0,
    blank: 0,
    comment: 0
  };
  
  const lang = language || getLanguageForFile(filepath);
  const pattern = LANGUAGE_PATTERNS[lang] || {};
  const multiStart = pattern.multi ? pattern.multi[0] : null;
  const multiEnd = pattern.multi ? pattern.multi[1] : null;
  
  let inMultiComment = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed === '') {
      stats.blank++;
      continue;
    }
    
    if (multiStart && multiEnd) {
      if (inMultiComment) {
        stats.comment++;
        if (trimmed.includes(multiEnd)) {
          inMultiComment = false;
        }
        continue;
      }
      
      if (trimmed.includes(multiStart)) {
        if (trimmed.includes(multiEnd)) {
          stats.comment++;
        } else {
          stats.comment++;
          inMultiComment = true;
        }
        continue;
      }
    }
    
    const type = detectLine(line, lang);
    if (type === 'comment') {
      stats.comment++;
    } else {
      stats.code++;
    }
  }
  
  return stats;
}

function countDirectory(dir, excludes = []) {
  const results = {
    files: [],
    by_language: {},
    totals: { total: 0, code: 0, blank: 0, comment: 0 }
  };
  
  function shouldExclude(filepath) {
    const basename = path.basename(filepath);
    for (const exclude of excludes) {
      if (filepath.includes(exclude)) return true;
      if (basename.match(new RegExp(exclude))) return true;
    }
    return false;
  }
  
  function walk(currentPath) {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (shouldExclude(fullPath)) continue;
        
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          try {
            const lang = getLanguageForFile(fullPath);
            const stats = countFile(fullPath, lang);
            const fileInfo = {
              path: fullPath,
              language: lang,
              ...stats
            };
            
            results.files.push(fileInfo);
            
            if (!results.by_language[lang]) {
              results.by_language[lang] = { files: 0, total: 0, code: 0, blank: 0, comment: 0 };
            }
            
            const langStats = results.by_language[lang];
            langStats.files++;
            langStats.total += stats.total;
            langStats.code += stats.code;
            langStats.blank += stats.blank;
            langStats.comment += stats.comment;
            
            results.totals.total += stats.total;
            results.totals.code += stats.code;
            results.totals.blank += stats.blank;
            results.totals.comment += stats.comment;
            
          } catch (e) {
            // Skip unreadable files
          }
        }
      }
    } catch (e) {
      // Permission denied or other error
    }
  }
  
  walk(dir);
  return results;
}

function formatTable(stats) {
  const lines = [];
  lines.push('='.repeat(60));
  lines.push('Line Count Summary');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push('Total Statistics:');
  lines.push(`  Files:    ${stats.files.length}`);
  lines.push(`  Lines:    ${stats.totals.total.toLocaleString()}`);
  lines.push(`  Code:     ${stats.totals.code.toLocaleString()}`);
  lines.push(`  Blank:    ${stats.totals.blank.toLocaleString()}`);
  lines.push(`  Comments: ${stats.totals.comment.toLocaleString()}`);
  lines.push('');
  lines.push('By Language:');
  lines.push('-'.repeat(50));
  lines.push(`${'Language'.padEnd(12)} ${'Files'.padStart(6)} ${'Total'.padStart(8)} ${'Code'.padStart(8)} ${'Blank'.padStart(6)} ${'Comments'.padStart(6)}`);
  lines.push('-'.repeat(50));
  
  const sorted = Object.entries(stats.by_language).sort((a, b) => b[1].total - a[1].total);
  for (const [lang, s] of sorted) {
    lines.push(`${lang.padEnd(12)} ${String(s.files).padStart(6)} ${String(s.total).padStart(8)} ${String(s.code).padStart(8)} ${String(s.blank).padStart(6)} ${String(s.comment).padStart(6)}`);
  }
  lines.push('-'.repeat(50));
  
  return lines.join('\n');
}

function parseArgs(args) {
  const result = {
    command: null,
    target: null,
    excludes: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
    format: 'table',
    summary: false
  };
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if (!result.command) {
      result.command = arg;
    } else if (!result.target) {
      result.target = arg;
    } else if (arg === '--exclude' && args[i + 1]) {
      result.excludes.push(args[++i]);
    } else if (arg === '--format' && args[i + 1]) {
      result.format = args[++i];
    } else if (arg === '--summary') {
      result.summary = true;
    }
    i++;
  }
  
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.command || !args.target) {
    console.log('Line Counter - Count lines of code by language');
    console.log('');
    console.log('Usage: lines.js <command> <target> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  count <path>    Count lines in file or directory');
    console.log('');
    console.log('Options:');
    console.log('  --exclude <pattern>  Exclude pattern (can be used multiple times)');
    console.log('  --format <format>   Output format: json, table (default: table)');
    console.log('  --summary           Show summary only');
    console.log('');
    console.log('Examples:');
    console.log('  lines.js count src');
    console.log('  lines.js count . --exclude node_modules --exclude test');
    console.log('  lines.js count src --format json');
    process.exit(1);
  }
  
  const target = args.target;
  
  if (!fs.existsSync(target)) {
    console.log(JSON.stringify({ error: `Path not found: ${target}` }, null, 2));
    process.exit(1);
  }
  
  let result;
  
  try {
    const stats = fs.statSync(target);
    
    if (stats.isFile()) {
      const lang = getLanguageForFile(target);
      const counts = countFile(target, lang);
      result = {
        files: [{ path: target, language: lang, ...counts }],
        by_language: { [lang]: { files: 1, ...counts } },
        totals: counts
      };
    } else {
      result = countDirectory(target, args.excludes);
    }
    
    if (args.summary) {
      const summary = {
        files: result.files.length,
        ...result.totals
      };
      console.log(JSON.stringify(summary, null, args.format === 'json' ? 2 : 0));
    } else if (args.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatTable(result));
    }
    
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }, null, 2));
    process.exit(1);
  }
}

main();