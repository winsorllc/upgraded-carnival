#!/usr/bin/env node

/**
 * Code Indexer - Index a codebase for fast searching
 * Usage: node index.js <project-path>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CACHE_DIR = '/tmp/code-indexer-cache';

// Language patterns for code detection
const LANGUAGE_EXTENSIONS = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala'
};

// Patterns for different code constructs
const PATTERNS = {
  // JavaScript/TypeScript
  javascript: {
    function: /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*\([^)]*\)\s*\{)/g,
    class: /class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?\s*\{/g,
    arrowFunction: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
    import: /import\s+(?:(?:\{[^}]*\}|[\w*]+)\s+from\s+)?['"]([^'"]+)['"]/g,
    export: /export\s+(?:default\s+)?(?:const|let|var|function|class|async\s+function)?\s*(\w+)?/g,
    method: /(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/g
  },
  // Python
  python: {
    function: /def\s+(\w+)\s*\([^)]*\):/g,
    class: /class\s+(\w+)(?:\([^)]*\))?:/g,
    import: /(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/g,
    method: /def\s+(\w+)\s*\(/g
  },
  // Java
  java: {
    function: /(?:public|private|protected|static)?\s*(?:void|int|String|boolean|[\w<>]+)\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+\w+)?\{/g,
    class: /(?:public\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?\s*\{/g,
    import: /import\s+([\w.]+);/g,
    method: /(?:public|private|protected)\s+[\w<>[\]]+\s+(\w+)\s*\(/g
  },
  // Go
  go: {
    function: /func\s+(?:\([^)]+\)\s+)?(\w+)\s*\([^)]*\)/g,
    struct: /type\s+(\w+)\s+struct\s*\{/g,
    interface: /type\s+(\w+)\s+interface\s*\{/g,
    import: /import\s+(?:\(\s*)?["']/g,
    method: /func\s+\((?:\w+\s+\*?\w+)\s+(\w+)\s*\(/g
  },
  // Rust
  rust: {
    function: /fn\s+(\w+)\s*\([^)]*\)/g,
    struct: /struct\s+(\w+)(?:\s*<[^>]+>)?\s*(?:\(|\{)/g,
    impl: /impl(?:\s+<\w+>)?\s+(?:\w+\s+for\s+)?(\w+)/g,
    use: /use\s+([\w:]+)/g,
    method: /fn\s+(\w+)\s*\(/g
  },
  // C/C++
  c: {
    function: /(?:void|int|char|float|double|[\w*]+)\s+(\w+)\s*\([^)]*\)\s*\{/g,
    struct: /struct\s+(\w+)\s*\{/g,
    include: /#include\s*[<"]([^>"]+)[>"]/g,
    define: /#define\s+(\w+)/g
  }
};

// Get language from file extension
function getLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return LANGUAGE_EXTENSIONS[ext] || 'text';
}

// Check if a file should be ignored
function shouldIgnore(filePath) {
  const ignorePatterns = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
    '.nyc_output',
    'vendor',
    '__pycache__',
    '.pytest_cache',
    'target',
    'bin',
    'obj',
    '.cache',
    '.parcel-cache',
    'yarn.lock',
    'package-lock.json',
    'pnpm-lock.yaml'
  ];
  
  const relativePath = filePath.replace(/^\/+/, '');
  return ignorePatterns.some(pattern => 
    relativePath.includes(pattern + '/') || relativePath.endsWith(pattern)
  );
}

// Get all code files in a directory
function getCodeFiles(dirPath, files = []) {
  if (!fs.existsSync(dirPath)) {
    console.error(`Directory not found: ${dirPath}`);
    return files;
  }
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      if (!shouldIgnore(fullPath)) {
        getCodeFiles(fullPath, files);
      }
    } else if (entry.isFile()) {
      const lang = getLanguage(fullPath);
      if (lang !== 'text') {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

// Index a single file
function indexFile(filePath) {
  const results = {
    file: filePath,
    language: getLanguage(filePath),
    symbols: [],
    imports: [],
    exports: []
  };
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lang = results.language;
    const patterns = PATTERNS[lang] || PATTERNS.javascript;
    
    // Find functions
    if (patterns.function) {
      let match;
      const regex = new RegExp(patterns.function.source, patterns.function.flags);
      while ((match = regex.exec(content)) !== null) {
        const name = match[1] || match[2] || match[3];
        if (name && !name.startsWith('.')) {
          results.symbols.push({
            name,
            type: 'function',
            line: content.substring(0, match.index).split('\n').length
          });
        }
      }
    }
    
    // Find classes/structs
    if (patterns.class) {
      let match;
      const regex = new RegExp(patterns.class.source, patterns.class.flags);
      while ((match = regex.exec(content)) !== null) {
        results.symbols.push({
          name: match[1],
          type: 'class',
          line: content.substring(0, match.index).split('\n').length
        });
      }
    }
    
    // Find imports
    if (patterns.import) {
      let match;
      const regex = new RegExp(patterns.import.source, patterns.import.flags);
      while ((match = regex.exec(content)) !== null) {
        const module = match[1] || match[2];
        if (module) {
          results.imports.push({
            module,
            line: content.substring(0, match.index).split('\n').length
          });
        }
      }
    }
    
    // Find exports
    if (patterns.export) {
      let match;
      const regex = new RegExp(patterns.export.source, patterns.export.flags);
      while ((match = regex.exec(content)) !== null) {
        if (match[1]) {
          results.exports.push({
            name: match[1],
            line: content.substring(0, match.index).split('\n').length
          });
        }
      }
    }
    
    // Language-specific handling
    if (lang === 'python') {
      // Find methods in classes
      const classMatch = /class\s+(\w+)[^:]*:/g.exec(content);
      if (classMatch) {
        let methodMatch;
        const methodRegex = /def\s+(\w+)\s*\(/g;
        while ((methodMatch = methodRegex.exec(content)) !== null) {
          if (!methodMatch[1].startsWith('_')) {
            results.symbols.push({
              name: methodMatch[1],
              type: 'method',
              line: content.substring(0, methodMatch.index).split('\n').length
            });
          }
        }
      }
    }
    
  } catch (err) {
    console.error(`Error indexing ${filePath}: ${err.message}`);
  }
  
  return results;
}

// Main index function
function indexProject(projectPath) {
  console.log(`Indexing project: ${projectPath}`);
  
  const absolutePath = path.resolve(projectPath);
  const files = getCodeFiles(absolutePath);
  
  console.log(`Found ${files.length} code files`);
  
  const index = {
    project: absolutePath,
    timestamp: new Date().toISOString(),
    files: [],
    symbols: {},
    imports: {}
  };
  
  for (const file of files) {
    process.stdout.write('.');
    const result = indexFile(file);
    index.files.push(result.file);
    
    for (const symbol of result.symbols) {
      if (!index.symbols[symbol.name]) {
        index.symbols[symbol.name] = [];
      } else if (!Array.isArray(index.symbols[symbol.name])) {
        // Convert existing symbol to array format
        index.symbols[symbol.name] = [index.symbols[symbol.name]];
      }
      index.symbols[symbol.name].push({
        file: result.file,
        type: symbol.type,
        line: symbol.line
      });
    }
    
    for (const imp of result.imports) {
      if (!index.imports[imp.module]) {
        index.imports[imp.module] = [];
      } else if (!Array.isArray(index.imports[imp.module])) {
        index.imports[imp.module] = [index.imports[imp.module]];
      }
      index.imports[imp.module].push({
        file: result.file,
        line: imp.line
      });
    }
  }
  
  console.log('\n');
  
  // Save index to cache
  const cachePath = path.join(CACHE_DIR, 'index.json');
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(index, null, 2));
  
  console.log(`Indexed ${Object.keys(index.symbols).length} unique symbols`);
  console.log(`Index saved to: ${cachePath}`);
  
  return index;
}

// CLI
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node index.js <project-path>');
  console.log('Example: node index.js /path/to/your/project');
  process.exit(1);
}

const projectPath = args[0];
const startTime = Date.now();
indexProject(projectPath);
console.log(`Indexing completed in ${Date.now() - startTime}ms`);
