#!/usr/bin/env node

/**
 * Find Definitions - Find where symbols are defined
 * Usage: node find-def.js <symbol-name> [project-path]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEFAULT_PROJECT = process.cwd();

// Simplified definition patterns
const DEFINITION_PATTERNS = [
  // function name(...) {
  /function\s+(\w+)\s*\(/g,
  // const/let/var name = function or arrow
  /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)\s*=>|function)/g,
  // class Name {
  /class\s+(\w+)(?:\s+extends|\s*\{)/g,
  // def name(
  /def\s+(\w+)\s*\(/g,
  // fn name(
  /fn\s+(\w+)\s*\(/g,
  // func name(
  /func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/g,
  // struct Name {
  /struct\s+(\w+)\s*(?:<[^>]+>)?\s*\{/g,
  // interface Name {
  /interface\s+(\w+)\s*\{/g,
  // type Name =
  /type\s+(\w+)\s*[=]/g,
  // enum Name {
  /enum\s+(\w+)\s*\{/g,
  // impl Name {
  /impl\s+(?:<[^>]+>\s+)?(?:\w+\s+for\s+)?(\w+)/g,
  // public void name(
  /(?:public|private|protected)\s+(?:static\s+)?(?:void|int|String|[\w<>]+)\s+(\w+)\s*\(/g
];

// Check if line contains definition of the symbol
function isDefinition(line, symbolName) {
  // Remove comments
  const cleanLine = line.replace(/\/\/.*$/, '').replace(/#.*$/, '');
  
  // Check if this is a definition line for the symbol
  const patterns = [
    new RegExp(`^\\s*function\\s+${symbolName}\\s*\\(`),
    new RegExp(`^\\s*(?:const|let|var)\\s+${symbolName}\\s*=`),
    new RegExp(`^\\s*class\\s+${symbolName}\\b`),
    new RegExp(`^\\s*def\\s+${symbolName}\\s*\\(`),
    new RegExp(`^\\s*fn\\s+${symbolName}\\s*\\(`),
    new RegExp(`^\\s*func\\s+${symbolName}\\s*\\(`),
    new RegExp(`^\\s*struct\\s+${symbolName}\\b`),
    new RegExp(`^\\s*interface\\s+${symbolName}\\b`),
    new RegExp(`^\\s*type\\s+${symbolName}\\s*=`),
    new RegExp(`^\\s*enum\\s+${symbolName}\\b`),
    new RegExp(`^\\s*impl\\s+${symbolName}\\b`),
    new RegExp(`(?:public|private|protected)\\s+(?:static\\s+)?(?:void|int|String|[\\w<>]+)\\s+${symbolName}\\s*\\(`)
  ];
  
  return patterns.some(p => p.test(cleanLine));
}

// Determine type from line content
function getDefinitionType(line) {
  const lowerLine = line.toLowerCase();
  
  if (lowerLine.includes('class ')) return 'class';
  if (lowerLine.includes('function ') || lowerLine.startsWith('function ')) return 'function';
  if (lowerLine.includes('def ') || lowerLine.startsWith('def ')) return 'function';
  if (lowerLine.includes('fn ') || lowerLine.startsWith('fn ')) return 'function';
  if (lowerLine.includes('func ') || lowerLine.startsWith('func ')) return 'function';
  if (lowerLine.includes('struct ')) return 'struct';
  if (lowerLine.includes('interface ')) return 'interface';
  if (lowerLine.includes('type ') && lowerLine.includes('=')) return 'type';
  if (lowerLine.includes('enum ')) return 'enum';
  if (lowerLine.includes('impl ')) return 'impl';
  if (lowerLine.includes('const ') || lowerLine.includes('let ') || lowerLine.includes('var ')) return 'variable';
  
  return 'definition';
}

// Find definition in a single file
function findDefinitionInFile(filePath, symbolName) {
  const results = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (isDefinition(line, symbolName)) {
        results.push({
          file: filePath,
          line: i + 1,
          type: getDefinitionType(line),
          signature: line.trim()
        });
      }
    }
  } catch (err) {
    // Skip files we can't read
  }
  
  return results;
}

// Search project for symbol definition
function findDefinition(symbolName, projectPath = DEFAULT_PROJECT) {
  const absolutePath = path.resolve(projectPath);
  
  console.log(`Searching for definition of: "${symbolName}" in ${absolutePath}`);
  
  // Find all code files using simple find
  const extensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.hpp'];
  
  let files = [];
  try {
    for (const ext of extensions) {
      try {
        const findCmd = `find "${absolutePath}" -type f -name "*${ext}" 2>/dev/null`;
        const output = execSync(findCmd, { encoding: 'utf-8' });
        files = [...files, ...output.split('\n').filter(Boolean)];
      } catch {
        // Extension not found, skip
      }
    }
  } catch (err) {
    console.error('Error finding files:', err.message);
    return { symbol: symbolName, definitions: [] };
  }
  
  console.log(`Searching through ${files.length} files...`);
  
  const results = [];
  for (const file of files) {
    const defs = findDefinitionInFile(file, symbolName);
    results.push(...defs);
  }
  
  // Deduplicate and format
  const seen = new Set();
  const uniqueDefs = results.filter(d => {
    const key = `${d.file}:${d.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // Sort by file path
  uniqueDefs.sort((a, b) => a.file.localeCompare(b.file));
  
  // Format output
  console.log('\n' + '='.repeat(60));
  console.log(`Found ${uniqueDefs.length} definition(s)`);
  console.log('='.repeat(60));
  
  for (const def of uniqueDefs) {
    const relPath = path.relative(absolutePath, def.file);
    console.log(`\n${relPath}:${def.line} [${def.type}]`);
    console.log(`  ${def.signature}`);
  }
  
  return {
    symbol: symbolName,
    definitions: uniqueDefs.map(d => ({
      file: path.relative(absolutePath, d.file),
      line: d.line,
      type: d.type,
      signature: d.signature
    }))
  };
}

// CLI
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node find-def.js <symbol-name> [project-path]');
  console.log('Examples:');
  console.log('  node find-def.js "MyClass"');
  console.log('  node find-def.js "myFunction" ./my-project');
  console.log('  node find-def.js "UserModel" /path/to/project');
  process.exit(1);
}

const symbolName = args[0];
const projectPath = args[1] || DEFAULT_PROJECT;

findDefinition(symbolName, projectPath);
