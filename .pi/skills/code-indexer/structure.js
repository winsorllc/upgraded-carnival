#!/usr/bin/env node

/**
 * Project Structure - Show project structure and file organization
 * Usage: node structure.js <project-path> [depth]
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_PROJECT = process.cwd();
const MAX_DEPTH = 5;

// Extensions to display
const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.java', '.go', '.rs', '.rb', '.php',
  '.c', '.cpp', '.h', '.hpp', '.hxx', '.cs',
  '.swift', '.kt', '.scala', '.vue', '.svelte'
]);

// Directories to ignore
const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next',
  '__pycache__', '.pytest_cache', 'target', 'bin',
  'obj', '.cache', '.parcel-cache', '.nuxt', '.output',
  'vendor', 'packages', '.venv', 'env', '.env',
  'coverage', '.nyc_output', '.tox', 'gradle', '.gradle'
]);

// Count lines of code in a file
function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

// Get file type category
function getFileCategory(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
    return 'JS/TS';
  } else if (['.py'].includes(ext)) {
    return 'Python';
  } else if (['.go', '.rs'].includes(ext)) {
    return 'Systems';
  } else if (['.java', '.kt', '.scala', '.swift'].includes(ext)) {
    return 'JVM/Mobile';
  } else if (['.c', '.cpp', '.h', '.hpp'].includes(ext)) {
    return 'C/C++';
  } else if (['.rb', '.php'].includes(ext)) {
    return 'Scripting';
  } else if (['.vue', '.svelte'].includes(ext)) {
    return 'UI';
  } else if (['.json', '.yaml', '.yml', '.toml'].includes(ext)) {
    return 'Config';
  } else if (['.md', '.txt', '.rst'].includes(ext)) {
    return 'Docs';
  }
  
  return 'Other';
}

// Analyze directory structure
function analyzeDir(dirPath, currentDepth = 0, stats = { files: 0, dirs: 0, lines: 0, types: {} }) {
  if (currentDepth > MAX_DEPTH) {
    return null;
  }
  
  const items = [];
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    // Sort: directories first, then files, alphabetically
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });
    
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.env') {
        continue;
      }
      
      if (IGNORE_DIRS.has(entry.name)) {
        continue;
      }
      
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        stats.dirs++;
        const subResult = analyzeDir(fullPath, currentDepth + 1, stats);
        
        if (subResult) {
          items.push({
            type: 'directory',
            name: entry.name,
            children: subResult
          });
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        
        if (CODE_EXTENSIONS.has(ext) || entry.name === 'Dockerfile' || entry.name.endsWith('file')) {
          stats.files++;
          const lines = countLines(fullPath);
          stats.lines += lines;
          
          const category = getFileCategory(entry.name);
          stats.types[category] = (stats.types[category] || 0) + 1;
          
          items.push({
            type: 'file',
            name: entry.name,
            lines,
            category
          });
        }
      }
    }
  } catch (err) {
    // Skip directories we can't read
  }
  
  return items.length > 0 ? items : null;
}

// Format output
function formatOutput(items, prefix = '', isLast = true) {
  let output = '';
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isLastItem = i === items.length - 1;
    const connector = isLastItem ? '└── ' : '├── ';
    const newPrefix = isLast ? '    ' : '│   ';
    
    if (item.type === 'directory') {
      output += `${prefix}${connector}📁 ${item.name}/\n`;
      output += formatOutput(item.children, prefix + newPrefix, isLastItem);
    } else {
      const size = item.lines > 0 ? ` (${item.lines} lines)` : '';
      output += `${prefix}${connector}📄 ${item.name}${size}\n`;
    }
  }
  
  return output;
}

// Print tree structure
function printTree(items, prefix = '', isLast = true, options = {}) {
  const { showLines = true, showCategories = false } = options;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isLastItem = i === items.length - 1;
    const connector = isLastItem ? '└── ' : '├── ';
    const newPrefix = isLast ? '    ' : '│   ';
    
    if (item.type === 'directory') {
      console.log(`${prefix}${connector}📁 ${item.name}/`);
      printTree(item.children, prefix + newPrefix, isLastItem, options);
    } else {
      let line = `${prefix}${connector}📄 ${item.name}`;
      if (showLines && item.lines) {
        line += ` (${item.lines})`;
      }
      if (showCategories) {
        line += ` [${item.category}]`;
      }
      console.log(line);
    }
  }
}

// Main structure function
function showStructure(projectPath = DEFAULT_PROJECT, maxDepth = MAX_DEPTH) {
  const absolutePath = path.resolve(projectPath);
  
  if (!fs.existsSync(absolutePath)) {
    console.error(`Directory not found: ${absolutePath}`);
    process.exit(1);
  }
  
  console.log(`Project: ${absolutePath}\n`);
  
  const stats = { files: 0, dirs: 0, lines: 0, types: {} };
  const structure = analyzeDir(absolutePath, 0, stats);
  
  if (!structure) {
    console.log('No code files found');
    return;
  }
  
  console.log('='.repeat(60));
  printTree(structure, '', true, { showLines: true, showCategories: false });
  console.log('='.repeat(60));
  
  console.log('\n📊 Statistics:');
  console.log(`  Files: ${stats.files}`);
  console.log(`  Directories: ${stats.dirs}`);
  console.log(`  Lines of code: ${stats.lines}`);
  
  console.log('\n📁 File Types:');
  for (const [type, count] of Object.entries(stats.types)) {
    console.log(`  ${type}: ${count}`);
  }
  
  return {
    project: absolutePath,
    stats,
    types: stats.types,
    structure
  };
}

// CLI
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node structure.js <project-path> [depth]');
  console.log('Examples:');
  console.log('  node structure.js ./my-project');
  console.log('  node structure.js /path/to/project 3');
  process.exit(1);
}

const projectPath = args[0];
const depth = args[1] ? parseInt(args[1]) : MAX_DEPTH;

showStructure(projectPath, depth);
