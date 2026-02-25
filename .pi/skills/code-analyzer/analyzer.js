#!/usr/bin/env node
/**
 * Code Analyzer Skill - Static code analysis
 */

const fs = require('fs');
const path = require('path');

// Simple complexity calculation based on control flow keywords
const COMPLEXITY_KEYWORDS = [
  /\bif\s*\(/gi,
  /\bwhile\s*\(/gi,
  /\bfor\s*\(/gi,
  /\bswitch\s*\(/gi,
  /\bcase\s+/gi,
  /\bcatch\s*\(/gi,
  /\b\?\?./gi, // Ternary
  /\|\|/gi, // Logical OR
  /\u0026\u0026/gi, // Logical AND
];

function calculateComplexity(content) {
  let complexity = 1; // Base complexity
  COMPLEXITY_KEYWORDS.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) complexity += matches.length;
  });
  return complexity;
}

function countLines(content) {
  const lines = content.split('\n');
  let codeLines = 0;
  let commentLines = 0;
  let blankLines = 0;
  let inComment = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.length === 0) {
      blankLines++;
      continue;
    }
    
    // Handle block comments
    if (trimmed.startsWith('/*')) {
      inComment = !trimmed.includes('*/');
      commentLines++;
      continue;
    }
    
    if (inComment) {
      commentLines++;
      if (trimmed.includes('*/')) inComment = false;
      continue;
    }
    
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || 
        trimmed.startsWith('--') || trimmed.startsWith('*')) {
      commentLines++;
    } else {
      codeLines++;
    }
  }
  
  return { codeLines, commentLines, blankLines, totalLines: lines.length };
}

function findDuplicates(files) {
  const hashToFiles = new Map();
  const duplicates = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    // Check 5-line blocks
    for (let i = 0; i <= lines.length - 5; i++) {
      const block = lines.slice(i, i + 5).join('\n');
      const hash = Buffer.from(block).toString('base64');
      
      if (!hashToFiles.has(hash)) {
        hashToFiles.set(hash, []);
      }
      hashToFiles.get(hash).push({ file, start: i + 1 });
    }
  }
  
  for (const [hash, locations] of hashToFiles) {
    if (locations.length > 1) {
      duplicates.push({
        lines: 5,
        occurrences: locations.map(l => ({ ...l, text: Buffer.from(hash, 'base64').toString().split('\n')[0] + '...' }))
      });
    }
  }
  
  return duplicates;
}

function analyzeDependencies(projectPath) {
  const deps = {
    production: [],
    development: [],
    imports: []
  };
  
  // Check package.json
  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    deps.production = Object.keys(pkg.dependencies || {});
    deps.development = Object.keys(pkg.devDependencies || {});
  }
  
  // Check requirements.txt
  const reqPath = path.join(projectPath, 'requirements.txt');
  if (fs.existsSync(reqPath)) {
    const reqs = fs.readFileSync(reqPath, 'utf8')
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('#'))
      .map(l => l.split(/[=~<>]/)[0].trim());
    deps.production.push(...reqs);
  }
  
  // Check go.mod
  const goModPath = path.join(projectPath, 'go.mod');
  if (fs.existsSync(goModPath)) {
    const mod = fs.readFileSync(goModPath, 'utf8');
    const requireMatch = mod.match(/require\s*\(([^)]+)\)/s);
    if (requireMatch) {
      deps.production = requireMatch[1]
        .split('\n')
        .filter(l => l.trim() && !l.startsWith('//'))
        .map(l => l.trim().split(' ')[0]);
    }
  }
  
  return deps;
}

function findFiles(dir, extensions = ['.js', '.ts', '.py', '.go', '.jsx', '.tsx']) {
  const files = [];
  
  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
        walk(fullPath);
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  if (fs.statSync(dir).isDirectory()) {
    walk(dir);
  } else {
    files.push(dir);
  }
  
  return files;
}

async function analyzeComplexity(targetPath) {
  const files = findFiles(targetPath);
  const results = [];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const complexity = calculateComplexity(content);
    results.push({
      file: path.relative(targetPath, file),
      complexity,
      risk: complexity > 20 ? 'high' : complexity > 10 ? 'medium' : 'low'
    });
  }
  
  results.sort((a, b) => b.complexity - a.complexity);
  return results;
}

async function generateReport(targetPath) {
  const files = findFiles(targetPath);
  const fileAnalysis = [];
  let totalComplexity = 0;
  let summary = { totalFiles: 0, totalLines: 0, codeLines: 0, commentLines: 0, blankLines: 0 };
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = countLines(content);
    const complexity = calculateComplexity(content);
    
    summary.totalFiles++;
    summary.totalLines += lines.totalLines;
    summary.codeLines += lines.codeLines;
    summary.commentLines += lines.commentLines;
    summary.blankLines += lines.blankLines;
    totalComplexity += complexity;
    
    fileAnalysis.push({
      file: path.relative(targetPath, file),
      complexity,
      lines
    });
  }
  
  const duplicates = findDuplicates(files);
  const deps = analyzeDependencies(targetPath);
  
  const report = {
    summary: {
      ...summary,
      averageComplexity: summary.totalFiles > 0 ? (totalComplexity / summary.totalFiles).toFixed(2) : 0
    },
    complexity: {
      highRiskFiles: fileAnalysis.filter(f => f.complexity > 20),
      allFiles: fileAnalysis
    },
    duplicates,
    dependencies: deps
  };
  
  return report;
}

// CLI
const [,, command, targetPath, ...args] = process.argv;

async function main() {
  if (!command || command === '--help' || (command !== 'help' && !targetPath && command !== 'help')) {
    console.log(`Usage: analyzer.js <command> <path> [options]

Commands:
  complexity   Analyze code complexity
  duplicates   Find duplicate code blocks
  report       Generate full analysis report
  deps         Analyze dependencies
  file         Analyze single file
  help         Show this help

Options:
  --format     Output format: json (default), text
  --threshold  Complexity threshold for warnings (default: 20)

Examples:
  analyzer.js complexity ./src --format json
  analyzer.js report . --format json
  analyzer.js file ./main.js`);
    return 0;
  }
  
  if (command === 'help') {
    console.log('See above for usage.');
    return 0;
  }
  
  const format = args.includes('--format') 
    ? args[args.indexOf('--format') + 1] 
    : 'json';
  
  if (!fs.existsSync(targetPath)) {
    console.error(`Path not found: ${targetPath}`);
    return 1;
  }
  
  let result;
  
  switch (command) {
    case 'complexity':
      result = await analyzeComplexity(targetPath);
      break;
    case 'duplicates':
      result = findDuplicates(findFiles(targetPath));
      break;
    case 'deps':
      result = analyzeDependencies(targetPath);
      break;
    case 'report':
      result = await generateReport(targetPath);
      break;
    case 'file':
      const content = fs.readFileSync(targetPath, 'utf8');
      result = {
        file: path.basename(targetPath),
        complexity: calculateComplexity(content),
        lines: countLines(content)
      };
      break;
    default:
      console.error(`Unknown command: ${command}`);
      return 1;
  }
  
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result);
  }
  
  return 0;
}

main().then(code => process.exit(code)).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
