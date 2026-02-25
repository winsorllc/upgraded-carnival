#!/usr/bin/env node

/**
 * File Intelligence - Analyze dependencies for a file or directory
 * 
 * Usage: node analyze-dependencies.js <path> [--depth N]
 */

const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__'];
const EXTENSION_MAP = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.php': 'php',
  '.cs': 'csharp',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala'
};

function getLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_MAP[ext] || 'unknown';
}

function extractImports(content, language) {
  const imports = [];
  
  if (language === 'javascript' || language === 'typescript') {
    // ES6 imports
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push({ type: 'import', source: match[1] });
    }
    
    // Re-exports: export { X } from 'module'
    const reExportRegex = /export\s+\{[^}]*\}\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = reExportRegex.exec(content)) !== null) {
      imports.push({ type: 're-export', source: match[1] });
    }
    
    // Require statements
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push({ type: 'require', source: match[1] });
    }
    
    // Export patterns
    const exportRegex = /export\s+(?:default\s+)?(?:\{[^}]*\}|\w+)/g;
    let exportMatch;
    while ((exportMatch = exportRegex.exec(content)) !== null) {
      // Just note that exports exist
    }
  } else if (language === 'python') {
    // Python imports
    const importRegex = /(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const source = match[1] || match[2];
      imports.push({ type: 'import', source });
    }
  }
  
  return imports;
}

function resolveImportPath(importPath, fromFile, baseDir) {
  // Handle relative imports
  if (importPath.startsWith('.')) {
    const resolved = path.resolve(path.dirname(fromFile), importPath);
    
    // Try various extensions
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '/index.js', '/index.ts'];
    for (const ext of extensions) {
      if (ext.startsWith('/')) {
        const idxPath = resolved + ext;
        if (fs.existsSync(idxPath)) return idxPath;
      } else {
        const withExt = resolved + ext;
        if (fs.existsSync(withExt)) return withExt;
      }
    }
    return resolved;
  }
  
  // External module - return as-is
  return importPath;
}

function categorizeDependency(source, baseDir) {
  // Check if it's internal (relative path resolved)
  if (source.startsWith('.')) {
    return 'internal';
  }
  
  // Check if it's a scoped package or monorepo package
  if (source.startsWith('@')) {
    return 'internal'; // Could be monorepo
  }
  
  // External packages
  return 'external';
}

function walkDirectory(dir, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return [];
  
  const results = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
          results.push(...walkDirectory(fullPath, depth + 1, maxDepth));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (EXTENSION_MAP[ext]) {
          results.push(fullPath);
        }
      }
    }
  } catch (err) {
    // Ignore permission errors
  }
  
  return results;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const language = getLanguage(filePath);
  const imports = extractImports(content, language);
  
  const baseDir = path.dirname(filePath);
  const categorized = {
    internal: [],
    external: []
  };
  
  for (const imp of imports) {
    const category = categorizeDependency(imp.source, baseDir);
    const resolvedPath = resolveImportPath(imp.source, filePath, baseDir);
    
    categorized[category].push({
      ...imp,
      resolved: resolvedPath,
      raw: imp.source
    });
  }
  
  return {
    file: filePath,
    language,
    imports: categorized,
    totalImports: imports.length
  };
}

function analyzeDirectory(dirPath, depth = 1) {
  const files = walkDirectory(dirPath, 0, depth);
  const analysis = files.map(f => analyzeFile(f));
  
  // Aggregate statistics
  const stats = {
    totalFiles: files.length,
    byLanguage: {},
    internalDeps: new Set(),
    externalDeps: new Set()
  };
  
  for (const file of analysis) {
    // Count by language
    stats.byLanguage[file.language] = (stats.byLanguage[file.language] || 0) + 1;
    
    // Collect dependencies
    for (const dep of file.imports.internal) {
      stats.internalDeps.add(dep.raw);
    }
    for (const dep of file.imports.external) {
      stats.externalDeps.add(dep.raw);
    }
  }
  
  stats.internalDeps = Array.from(stats.internalDeps);
  stats.externalDeps = Array.from(stats.externalDeps);
  
  return {
    directory: dirPath,
    files: analysis,
    stats
  };
}

// Main execution
const args = process.argv.slice(2);
const targetPath = args[0];
const depthIndex = args.indexOf('--depth');
const depth = depthIndex >= 0 ? parseInt(args[depthIndex + 1], 10) : 1;

if (!targetPath) {
  console.error('Usage: node analyze-dependencies.js <path> [--depth N]');
  process.exit(1);
}

const absolutePath = path.resolve(targetPath);

if (!fs.existsSync(absolutePath)) {
  console.error(`Error: Path does not exist: ${absolutePath}`);
  process.exit(1);
}

let result;
if (fs.statSync(absolutePath).isDirectory()) {
  result = analyzeDirectory(absolutePath, depth);
} else {
  result = analyzeFile(absolutePath);
}

console.log(JSON.stringify(result, null, 2));
