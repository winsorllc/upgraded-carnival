#!/usr/bin/env node

/**
 * Diff Tool - Compare files and show differences
 * 
 * Usage: diff.js <file1> <file2> [options]
 */

const fs = require('fs');
const path = require('path');

/**
 * Read file content
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    throw new Error(`Cannot read file: ${filePath} - ${e.message}`);
  }
}

/**
 * Split content into lines
 */
function splitLines(content) {
  return content.split(/\r?\n/);
}

/**
 * Compute line-by-line diff
 */
function computeDiff(left, right) {
  const leftLines = splitLines(left);
  const rightLines = splitLines(right);
  
  const differences = [];
  
  // Simple line-by-line comparison
  const maxLen = Math.max(leftLines.length, rightLines.length);
  
  for (let i = 0; i < maxLen; i++) {
    const leftLine = leftLines[i];
    const rightLine = rightLines[i];
    
    if (leftLine === rightLine) {
      // Lines are equal
      differences.push({
        type: 'unchanged',
        line: i + 1,
        left: leftLine || '',
        right: rightLine || ''
      });
    } else if (leftLine === undefined) {
      // Added in right
      differences.push({
        type: 'added',
        line: i + 1,
        left: '',
        right: rightLine
      });
    } else if (rightLine === undefined) {
      // Removed from left
      differences.push({
        type: 'removed',
        line: i + 1,
        left: leftLine,
        right: ''
      });
    } else {
      // Modified
      differences.push({
        type: 'modified',
        line: i + 1,
        left: leftLine,
        right: rightLine
      });
    }
  }
  
  return differences;
}

/**
 * Generate unified diff format
 */
function generateUnifiedDiff(leftFile, rightFile, differences, context = 3) {
  let output = `--- ${leftFile}\n+++ ${rightFile}\n`;
  
  let i = 0;
  while (i < differences.length) {
    const diff = differences[i];
    
    if (diff.type === 'unchanged') {
      i++;
      continue;
    }
    
    // Found a change, output context
    const start = Math.max(0, i - context);
    const end = Math.min(differences.length, i + context);
    
    output += `@@ -${start + 1},${end - start} +${start + 1},${end - start} @@\n`;
    
    for (let j = start; j < end; j++) {
      const d = differences[j];
      if (d.type === 'unchanged') {
        output += ` ${d.left}\n`;
      } else if (d.type === 'removed') {
        output += `-${d.left}\n`;
      } else if (d.type === 'added') {
        output += `+${d.right}\n`;
      } else if (d.type === 'modified') {
        output += `-${d.left}\n+${d.right}\n`;
      }
    }
    
    i = end;
  }
  
  return output;
}

/**
 * Generate human-readable diff
 */
function generateReadableDiff(differences) {
  const changes = differences.filter(d => d.type !== 'unchanged');
  
  if (changes.length === 0) {
    return 'Files are identical';
  }
  
  let output = '';
  
  for (const diff of changes) {
    if (diff.type === 'modified') {
      output += `Line ${diff.line}:\n`;
      output += `  - ${diff.left}\n`;
      output += `  + ${diff.right}\n\n`;
    } else if (diff.type === 'added') {
      output += `Line ${diff.line}:\n`;
      output += `  + ${diff.right}\n\n`;
    } else if (diff.type === 'removed') {
      output += `Line ${diff.line}:\n`;
      output += `  - ${diff.left}\n\n`;
    }
  }
  
  const stats = {
    added: differences.filter(d => d.type === 'added').length,
    removed: differences.filter(d => d.type === 'removed').length,
    modified: differences.filter(d => d.type === 'modified').length
  };
  
  output += `---\n`;
  output += `${stats.added} added, ${stats.removed} removed, ${stats.modified} modified`;
  
  return output;
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const result = {
    left: '',
    right: '',
    options: {
      unified: 3,
      json: false,
      ignoreSpace: false,
      ignoreCase: false
    }
  };
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if (arg === '--unified' && args[i + 1]) {
      result.options.unified = parseInt(args[i + 1], 10);
      i += 2;
    } else if (arg === '--json') {
      result.options.json = true;
      i++;
    } else if (arg === '--ignore-space') {
      result.options.ignoreSpace = true;
      i++;
    } else if (arg === '--ignore-case') {
      result.options.ignoreCase = true;
      i++;
    } else if (!arg.startsWith('--')) {
      if (!result.left) {
        result.left = arg;
      } else {
        result.right = arg;
      }
      i++;
    } else {
      i++;
    }
  }
  
  return result;
}

// CLI handling
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Diff Tool CLI');
  console.log('');
  console.log('Usage: diff.js <file1> <file2> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --unified <n>    Lines of context (default: 3)');
  console.log('  --json           Output as JSON');
  console.log('  --ignore-space   Ignore whitespace differences');
  console.log('  --ignore-case    Ignore case differences');
  console.log('');
  console.log('Examples:');
  console.log('  diff.js file1.txt file2.txt');
  console.log('  diff.js file1.txt file2.txt --json');
  console.log('  diff.js old.js new.js --unified 5');
  process.exit(1);
}

const parsed = parseArgs(args);

if (!parsed.left || !parsed.right) {
  console.error('Error: Two file paths are required');
  process.exit(1);
}

try {
  // Read files
  let left = readFile(parsed.left);
  let right = readFile(parsed.right);
  
  // Apply options
  if (parsed.options.ignoreSpace) {
    left = left.replace(/\s+/g, ' ');
    right = right.replace(/\s+/g, ' ');
  }
  
  if (parsed.options.ignoreCase) {
    left = left.toLowerCase();
    right = right.toLowerCase();
  }
  
  // Compute diff
  const differences = computeDiff(left, right);
  
  // Generate output
  if (parsed.options.json) {
    const output = {
      left: parsed.left,
      right: parsed.right,
      identical: differences.every(d => d.type === 'unchanged'),
      differences: differences.filter(d => d.type !== 'unchanged')
    };
    console.log(JSON.stringify(output, null, 2));
  } else if (parsed.options.unified > 0) {
    console.log(generateUnifiedDiff(parsed.left, parsed.right, differences, parsed.options.unified));
  } else {
    console.log(generateReadableDiff(differences));
  }
  
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
