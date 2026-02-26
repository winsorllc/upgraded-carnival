#!/usr/bin/env node

/**
 * Find References - Find all usages/references of a symbol
 * Usage: node find-refs.js <symbol-name> [project-path]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEFAULT_PROJECT = process.cwd();

// Check for ripgrep
function hasRipgrep() {
  try {
    execSync('rg --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Find references using ripgrep
function findRefsRipgrep(symbolName, projectPath) {
  const args = [
    '-n',
    '--line-number',
    '--color=never',
    '-w', // Word boundary
    symbolName,
    projectPath
  ];
  
  try {
    const output = execSync(`rg ${args.join(' ')}`, { 
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024
    });
    
    const results = [];
    const lines = output.split('\n').filter(Boolean);
    
    for (const line of lines) {
      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      if (match) {
        const file = match[1];
        const lineNum = parseInt(match[2]);
        const context = match[3].trim();
        
        // Determine if it's a definition or reference
        const isDefinition = /^\s*(function|class|const|let|var|def|fn|struct|interface|type)\s+/.test(context) ||
                           context.startsWith(symbolName + '(') ||
                           context.startsWith('class ' + symbolName);
        
        results.push({
          file,
          line: lineNum,
          context: context.substring(0, 150),
          isDefinition
        });
      }
    }
    
    return results;
  } catch {
    return [];
  }
}

// Find references using basic grep
function findRefsGrep(symbolName, projectPath) {
  const extensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h'];
  
  try {
    const findCmd = `find "${projectPath}" -type f \\( ${extensions.map(e => `-name "*{}"`).join(' ').replace(/{}/g, e)} \\) -exec grep -n -w "${symbolName}" {} + 2>/dev/null`;
    
    const output = execSync(findCmd, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
    
    const results = [];
    const lines = output.split('\n').filter(Boolean);
    
    for (const line of lines) {
      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      if (match) {
        const file = match[1];
        const lineNum = parseInt(match[2]);
        const context = match[3].trim();
        
        const isDefinition = /^\s*(function|class|const|let|var|def|fn|struct|interface|type)\s+/.test(context);
        
        results.push({
          file,
          line: lineNum,
          context: context.substring(0, 150),
          isDefinition
        });
      }
    }
    
    return results;
  } catch {
    return [];
  }
}

// Main find references function
function findRefs(symbolName, projectPath = DEFAULT_PROJECT) {
  const absolutePath = path.resolve(projectPath);
  
  console.log(`Searching for references to: "${symbolName}" in ${absolutePath}`);
  
  let results;
  
  if (hasRipgrep()) {
    console.log('Using ripgrep for fast search...');
    results = findRefsRipgrep(symbolName, absolutePath);
  } else {
    console.log('Using grep for search...');
    results = findRefsGrep(symbolName, absolutePath);
  }
  
  // Separate definitions from references
  const definitions = results.filter(r => r.isDefinition);
  const references = results.filter(r => !r.isDefinition);
  
  // Deduplicate
  const seen = new Set();
  const uniqueDefs = definitions.filter(d => {
    const key = `${d.file}:${d.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  const seenRefs = new Set();
  const uniqueRefs = references.filter(r => {
    const key = `${r.file}:${r.line}`;
    if (seenRefs.has(key)) return false;
    seenRefs.add(key);
    return true;
  });
  
  // Sort
  uniqueRefs.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return a.line - b.line;
  });
  
  // Format output
  console.log('\n' + '='.repeat(60));
  console.log(`Found ${uniqueDefs.length} definition(s) and ${uniqueRefs.length} reference(s)`);
  console.log('='.repeat(60));
  
  if (uniqueDefs.length > 0) {
    console.log('\n--- DEFINITIONS ---');
    for (const def of uniqueDefs.slice(0, 10)) {
      const relPath = path.relative(absolutePath, def.file);
      console.log(`\n${relPath}:${def.line}`);
      console.log(`  ${def.context}`);
    }
  }
  
  if (uniqueRefs.length > 0) {
    console.log('\n--- REFERENCES ---');
    const files = {};
    
    for (const ref of uniqueRefs) {
      const relPath = path.relative(absolutePath, ref.file);
      if (!files[relPath]) {
        files[relPath] = [];
      }
      files[relPath].push(ref.line);
    }
    
    for (const [file, lines] of Object.entries(files)) {
      console.log(`\n${file}: ${lines.slice(0, 5).join(', ')}${lines.length > 5 ? '...' : ''}`);
    }
    
    if (uniqueRefs.length > 20) {
      console.log(`\n... and ${uniqueRefs.length - 20} more references`);
    }
  }
  
  return {
    symbol: symbolName,
    definitions: uniqueDefs.map(d => ({
      file: path.relative(absolutePath, d.file),
      line: d.line,
      context: d.context
    })),
    references: uniqueRefs.map(r => ({
      file: path.relative(absolutePath, r.file),
      line: r.line,
      context: r.context
    })),
    total: uniqueDefs.length + uniqueRefs.length
  };
}

// CLI
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node find-refs.js <symbol-name> [project-path]');
  console.log('Examples:');
  console.log('  node find-refs.js "myFunction"');
  console.log('  node find-refs.js "UserModel" ./my-project');
  console.log('  node find-refs.js "config" /path/to/project');
  process.exit(1);
}

const symbolName = args[0];
const projectPath = args[1] || DEFAULT_PROJECT;

findRefs(symbolName, projectPath);
