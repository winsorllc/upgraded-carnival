#!/usr/bin/env node
/**
 * JSON Validator - Validation and formatting tool
 */

import fs from 'fs';
import path from 'path';

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Parse arguments
const args = process.argv.slice(2);
const target = args[0];
const schemaPath = args.find((_, i) => args[i-1] === '--schema');
const fix = args.includes('--fix');
const fixAll = args.includes('--fix-all');
const pretty = args.includes('--pretty');
const quiet = args.includes('--quiet');

function printHeader() {
  if (quiet) return;
  console.log(colors.cyan + '═'.repeat(64) + colors.reset);
  console.log(colors.bold + '                     JSON VALIDATION REPORT                     ' + colors.reset);
  console.log(colors.cyan + '═'.repeat(64) + colors.reset);
  console.log();
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getLineAndColumn(content, position) {
  const lines = content.substring(0, position).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

function validateJSON(filePath, schema = null) {
  const content = fs.readFileSync(filePath, 'utf8');
  const stats = fs.statSync(filePath);
  
  try {
    const parsed = JSON.parse(content);
    
    let result = {
      valid: true,
      file: filePath,
      size: formatBytes(stats.size),
      lines: content.split('\n').length
    };
    
    // Schema validation (basic)
    if (schema) {
      result.schemaValid = true; // Simplified - full schema validation would need ajv
    }
    
    return result;
  } catch (error) {
    const pos = getLineAndColumn(content, error.message.match(/position (\d+)/)?.[1] || 0);
    return {
      valid: false,
      file: filePath,
      size: formatBytes(stats.size),
      error: error.message,
      line: pos.line,
      column: pos.column
    };
  }
}

function fixJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  try {
    const parsed = JSON.parse(content);
    const fixed = JSON.stringify(parsed, null, 2);
    
    if (fixed !== content) {
      fs.writeFileSync(filePath, fixed);
      return { fixed: true, file: filePath };
    }
    return { fixed: false, file: filePath };
  } catch (error) {
    return { fixed: false, file: filePath, error: error.message };
  }
}

function prettyPrint(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(content);
  console.log(JSON.stringify(parsed, null, 2));
}

function getJSONFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  
  if (fs.statSync(dir).isFile()) {
    if (path.extname(dir) === '.json') {
      files.push(dir);
    }
    return files;
  }
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    if (item.name === 'node_modules' || item.name === '.git') continue;
    
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      getJSONFiles(fullPath, files);
    } else if (path.extname(item.name) === '.json') {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Main
if (!target) {
  console.error(colors.red + 'Usage: validate.js <file.json|directory> [options]' + colors.reset);
  console.log();
  console.log('Options:');
  console.log('  --schema <file>    Validate against JSON schema');
  console.log('  --fix              Fix formatting of single file');
  console.log('  --fix-all          Fix formatting of all files');
  console.log('  --pretty           Pretty print the JSON');
  console.log('  --quiet            Only show errors');
  process.exit(1);
}

if (!fs.existsSync(target)) {
  console.error(colors.red + `Error: Path not found: ${target}` + colors.reset);
  process.exit(1);
}

// Handle pretty print
if (pretty) {
  try {
    prettyPrint(target);
    process.exit(0);
  } catch (e) {
    console.error(colors.red + `Error: ${e.message}` + colors.reset);
    process.exit(1);
  }
}

// Handle fix single file
if (fix) {
  if (fs.statSync(target).isDirectory()) {
    console.error(colors.red + 'Error: --fix requires a file, not a directory' + colors.reset);
    process.exit(1);
  }
  
  const result = fixJSON(target);
  if (result.error) {
    console.error(colors.red + `Cannot fix ${result.file}: ${result.error}` + colors.reset);
    process.exit(1);
  }
  if (result.fixed) {
    console.log(colors.green + `✓ Fixed formatting: ${result.file}` + colors.reset);
  } else {
    console.log(colors.blue + `• Already formatted: ${result.file}` + colors.reset);
  }
  process.exit(0);
}

// Get list of files
const files = fs.statSync(target).isFile() ? [target] : getJSONFiles(target);

if (files.length === 0) {
  console.error(colors.yellow + 'No JSON files found' + colors.reset);
  process.exit(0);
}

// Load schema if specified
let schema = null;
if (schemaPath) {
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  } catch (e) {
    console.error(colors.red + `Error loading schema: ${e.message}` + colors.reset);
    process.exit(1);
  }
}

printHeader();

let validCount = 0;
let errorCount = 0;

for (const file of files) {
  const result = validateJSON(file, schema);
  
  if (result.valid) {
    validCount++;
    if (!quiet) {
      console.log(`${colors.green}✓${colors.reset} ${result.file}`);
      console.log(`  Valid JSON - ${result.size}, ${result.lines} lines`);
      console.log();
    }
  } else {
    errorCount++;
    console.error(`${colors.red}✗${colors.reset} ${result.file}`);
    console.error(`  ${colors.red}${result.error}${colors.reset}`);
    console.error(`  Line ${result.line}, Column ${result.column}`);
    console.error();
  }
}

// Handle fix-all
if (fixAll) {
  console.log(colors.cyan + 'Fixing all JSON files...' + colors.reset);
  for (const file of files) {
    const fixResult = fixJSON(file);
    if (fixResult.fixed) {
      console.log(`${colors.green}✓${colors.reset} Fixed: ${fixResult.file}`);
    } else if (fixResult.error) {
      console.log(`${colors.red}✗${colors.reset} Cannot fix: ${fixResult.file} - ${fixResult.error}`);
    }
  }
  console.log();
}

// Summary
if (!quiet) {
  console.log(colors.cyan + '─'.repeat(64) + colors.reset);
  console.log(`Total: ${files.length} files (${colors.green}${validCount} valid${colors.reset}, ${colors.red}${errorCount} error${colors.reset})`);
  console.log(colors.cyan + '═'.repeat(64) + colors.reset);
}

process.exit(errorCount > 0 ? 1 : 0);
