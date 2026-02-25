#!/usr/bin/env node

/**
 * File Intelligence - Find files related to a given file
 * 
 * Usage: node find-related.js <path> [--limit N]
 */

const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__'];
const CODE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.vue', '.svelte', '.php', '.cs', '.swift', '.kt', '.scala'];

function getModuleName(filePath) {
  const basename = path.basename(filePath, path.extname(filePath));
  // Handle index files
  if (basename === 'index') {
    return path.basename(path.dirname(filePath));
  }
  return basename;
}

function getModulePrefix(filePath) {
  const dir = path.dirname(filePath);
  const parts = dir.split(path.sep);
  // Get the last 2 directory names as prefix
  return parts.slice(-2).join('/');
}

function extractImportsAndExports(content) {
  const imports = new Set();
  const exports = new Set();
  
  // ES6 imports
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }
  
  // Require statements
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }
  
  // Named exports
  const exportNamedRegex = /export\s+\{([^}]+)\}/g;
  while ((match = exportNamedRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(s => s.trim());
    names.forEach(n => exports.add(n));
  }
  
  // Default export
  const exportDefaultRegex = /export\s+default\s+(\w+)/g;
  while ((match = exportDefaultRegex.exec(content)) !== null) {
    exports.add(match[1]);
  }
  
  return { imports: Array.from(imports), exports: Array.from(exports) };
}

function calculateSimilarityScore(file1, file2, analysisCache) {
  let score = 0;
  
  // Get module names
  const name1 = getModuleName(file1);
  const name2 = getModuleName(file2);
  
  // Check if names are similar (contain common substrings)
  if (name1 !== name2) {
    // Same exact name
    if (name1 === name2) score += 50;
    // Common substring
    if (name1.includes(name2) || name2.includes(name1)) score += 30;
    // Levenshtein-like (simple check)
    const longer = name1.length > name2.length ? name1 : name2;
    const shorter = name1.length > name2.length ? name2 : name1;
    if (longer.startsWith(shorter.substring(0, Math.floor(shorter.length / 2)))) score += 20;
  } else {
    score += 50;
  }
  
  // Check module prefix similarity
  const prefix1 = getModulePrefix(file1);
  const prefix2 = getModulePrefix(file2);
  if (prefix1 === prefix2) score += 40;
  else if (prefix1.includes(prefix2) || prefix2.includes(prefix1)) score += 20;
  
  // Check for shared imports/exports
  const analysis1 = analysisCache[file1];
  const analysis2 = analysisCache[file2];
  
  if (analysis1 && analysis2) {
    // Direct import relationship - check each import
    for (const imp of analysis1.imports) {
      if (imp.startsWith('.')) {
        const resolved = path.resolve(path.dirname(file1), imp);
        if (resolved === file2 || resolved + path.extname(file2) === file2) {
          score += 100; // file1 imports file2
        }
      }
    }
    
    for (const imp of analysis2.imports) {
      if (imp.startsWith('.')) {
        const resolved = path.resolve(path.dirname(file2), imp);
        if (resolved === file1 || resolved + path.extname(file1) === file1) {
          score += 100; // file2 imports file1
        }
      }
    }
    
    // Shared exports
    const sharedExports = analysis1.exports.filter(e => analysis2.exports.includes(e));
    score += sharedExports.length * 10;
    
    // Shared imports
    const sharedImports = analysis1.imports.filter(i => analysis2.imports.includes(i));
    score += sharedImports.length * 5;
  }
  
  // Same directory bonus
  if (path.dirname(file1) === path.dirname(file2)) {
    score += 30;
  }
  
  return score;
}

function findRelatedFiles(targetFile, limit = 20) {
  if (!fs.existsSync(targetFile)) {
    console.error(`Error: File does not exist: ${targetFile}`);
    process.exit(1);
  }
  
  const targetDir = path.dirname(targetFile);
  const rootDir = findProjectRoot(targetDir);
  
  // Find all code files in project
  const allFiles = [];
  function walk(dir) {
    if (dir.includes('node_modules') || dir.includes('.git')) return;
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
          walk(fullPath);
        } else if (entry.isFile() && CODE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
          allFiles.push(fullPath);
        }
      }
    } catch (err) {
      // Ignore permission errors
    }
  }
  
  walk(rootDir);
  
  // Analyze target file
  const targetContent = fs.readFileSync(targetFile, 'utf-8');
  const targetAnalysis = extractImportsAndExports(targetContent);
  
  // Cache all file analyses
  const analysisCache = {};
  analysisCache[targetFile] = targetAnalysis;
  
  // Calculate scores for all other files
  const scores = [];
  for (const file of allFiles) {
    if (file === targetFile) continue;
    
    const content = fs.readFileSync(file, 'utf-8');
    const analysis = extractImportsAndExports(content);
    analysisCache[file] = analysis;
    
    const score = calculateSimilarityScore(targetFile, file, analysisCache);
    
    if (score > 0) {
      scores.push({
        file,
        score,
        reason: getScoreReason(targetFile, file, targetAnalysis, analysisCache[file])
      });
    }
  }
  
  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  
  return {
    target: targetFile,
    root: rootDir,
    related: scores.slice(0, limit).map(s => ({
      file: path.relative(rootDir, s.file),
      score: s.score,
      reason: s.reason
    }))
  };
}

function getScoreReason(file1, file2, analysis1, analysis2) {
  const reasons = [];
  
  const name1 = getModuleName(file1);
  const name2 = getModuleName(file2);
  
  if (name1 === name2) reasons.push('Same module name');
  else if (name1.includes(name2) || name2.includes(name1)) reasons.push('Similar name');
  
  if (path.dirname(file1) === path.dirname(file2)) reasons.push('Same directory');
  
  // Check for direct import
  for (const imp of analysis1.imports) {
    if (imp.startsWith('.')) {
      const resolved = path.resolve(path.dirname(file1), imp);
      if (resolved === file2 || resolved + path.extname(file2) === file2) {
        reasons.push('Directly imports');
        break;
      }
    }
  }
  
  // Check for export overlap
  const sharedExports = analysis1.exports.filter(e => analysis2.exports.includes(e));
  if (sharedExports.length > 0) {
    reasons.push(`Shares exports: ${sharedExports.slice(0, 3).join(', ')}`);
  }
  
  return reasons.join('; ') || 'Pattern match';
}

function findProjectRoot(startDir) {
  let current = startDir;
  while (current !== path.dirname(current)) {
    // Check for common project markers
    const markers = ['package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml', 'pom.xml', '*.csproj'];
    try {
      const entries = fs.readdirSync(current);
      for (const marker of markers) {
        if (marker.includes('*')) {
          const pattern = marker.replace('*', '');
          if (entries.some(e => e.startsWith(pattern))) return current;
        } else if (entries.includes(marker)) {
          return current;
        }
      }
    } catch (err) {
      // Ignore
    }
    current = path.dirname(current);
  }
  return startDir;
}

// Main execution
const args = process.argv.slice(2);
const targetPath = args[0];
const limitIndex = args.indexOf('--limit');
const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1], 10) : 20;

if (!targetPath) {
  console.error('Usage: node find-related.js <path> [--limit N]');
  process.exit(1);
}

const absolutePath = path.resolve(targetPath);
const result = findRelatedFiles(absolutePath, limit);
console.log(JSON.stringify(result, null, 2));
