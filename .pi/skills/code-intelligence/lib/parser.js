/**
 * Code Parser - Extracts symbols, imports, and structure from source files
 * Using regex-based parsing for portability (no native dependencies)
 */

const fs = require('fs');
const path = require('path');

// Language patterns for parsing
const PATTERNS = {
  javascript: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
    function: [
      /(?:async\s+)?function\s+(\w+)\s*\(/g,
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(\s*\)\s*=>/g,
      /(?:const|let|var)\s+(\w+)\s*=\s*function/g,
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
      /(\w+)\s*:\s*(?:async\s+)?\(\s*\)\s*=>/g,
      /(\w+)\s*:\s*function/g
    ],
    class: /class\s+(\w+)(?:\s+extends\s+(\w+))?/g,
    import: [
      /import\s+(?:{([^}]+)}\s+from)?\s*['"]([^'"]+)['"]/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g
    ],
    export: [
      /export\s+(?:default\s+)?(?:async\s+)?(?:function\s+)?(?:class\s+)?(\w+)/g,
      /module\.exports\s*=\s*(\w+)/g,
      /exports\.(\w+)\s*=/g
    ]
  },
  python: {
    extensions: ['.py'],
    function: /def\s+(\w+)\s*\(/g,
    class: /class\s+(\w+)(?:\(([^)]+)\))?/g,
    import: [
      /import\s+([\w.]+)/g,
      /from\s+([\w.]+)\s+import/g
    ],
    export: null
  },
  rust: {
    extensions: ['.rs'],
    function: [
      /(?:pub\s+)?fn\s+(\w+)\s*\(/g,
      /async\s+fn\s+(\w+)\s*\(/g
    ],
    class: /(?:pub\s+)?(?:struct|enum|trait)\s+(\w+)/g,
    import: /use\s+([\w:]+)/g,
    export: /(?:pub|pub\(crate\))\s+(?:fn|struct|enum|trait|mod|const|static)\s+(\w+)/g
  },
  go: {
    extensions: ['.go'],
    function: /(?:func\s+(?:\([^)]+\)\s+)?)(\w+)\s*\(/g,
    class: /type\s+(\w+)\s+(?:struct|interface)/g,
    import: /import\s+["']([^"']+)["']/g,
    export: /^func\s+(\w+)|^type\s+(\w+)/gm
  },
  java: {
    extensions: ['.java'],
    function: [
      /(?:public|private|protected)?\s*(?:static\s+)?(?:\w+)\s+(\w+)\s*\([^)]*\)\s*{/g,
      /(\w+)\s*\([^)]*\)\s*->/g
    ],
    class: /class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/g,
    import: /import\s+([\w.]+);/g,
    export: /(?:public\s+)?(?:class|interface|enum)\s+(\w+)/g
  }
};

/**
 * Detect language from file extension
 */
function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  for (const [lang, config] of Object.entries(PATTERNS)) {
    if (config.extensions.includes(ext)) {
      return lang;
    }
  }
  return null;
}

/**
 * Parse a source file and extract symbols
 */
function parseFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const language = detectLanguage(filePath);
  
  if (!language) {
    return null;
  }

  const config = PATTERNS[language];
  const symbols = {
    functions: [],
    classes: [],
    imports: [],
    exports: [],
    lineCount: lines.length,
    language
  };

  // Extract functions
  if (config.function) {
    const funcPatterns = Array.isArray(config.function) ? config.function : [config.function];
    for (const pattern of funcPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        symbols.functions.push({
          name: match[1],
          line,
          signature: extractSignature(lines[line - 1] || '')
        });
      }
    }
  }

  // Extract classes
  if (config.class) {
    let match;
    const classPattern = config.class;
    while ((match = classPattern.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      symbols.classes.push({
        name: match[1],
        line,
        extends: match[2] || null,
        implements: match[3] ? match[3].split(',').map(s => s.trim()) : []
      });
    }
  }

  // Extract imports
  if (config.import) {
    const importPatterns = Array.isArray(config.import) ? config.import : [config.import];
    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        symbols.imports.push({
          source: match[2] || match[1],
          line,
          type: match[2] ? 'es6' : 'require'
        });
      }
    }
  }

  // Extract exports
  if (config.export) {
    const exportPatterns = Array.isArray(config.export) ? config.export : [config.export];
    for (const pattern of exportPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        if (match[1]) {
          symbols.exports.push({
            name: match[1],
            line
          });
        }
      }
    }
  }

  return symbols;
}

/**
 * Extract function signature from a line
 */
function extractSignature(line) {
  const match = line.match(/(?:[\w$]+\s*[=:]\s*)?(?:function\s+)?[\w$]*\s*\([^)]*\)/);
  return match ? match[0].trim() : null;
}

/**
 * Find all source files in a directory
 */
function findSourceFiles(rootDir, ignorePatterns = ['node_modules', '.git', 'dist', 'build', '.code-intelligence']) {
  const files = [];
  
  function traverse(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!ignorePatterns.includes(entry.name)) {
          traverse(fullPath);
        }
      } else if (entry.isFile()) {
        if (detectLanguage(fullPath)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  traverse(rootDir);
  return files;
}

/**
 * Build dependency graph from imports
 */
function buildDependencyGraph(filePath, symbols, rootDir) {
  const graph = {
    file: filePath,
    imports: [],
    exports: symbols.exports.map(e => e.name),
    functions: symbols.functions.map(f => f.name),
    classes: symbols.classes.map(c => c.name)
  };

  const dir = path.dirname(filePath);
  
  for (const imp of symbols.imports) {
    let resolvedPath = null;
    
    // Try to resolve relative imports
    if (imp.source.startsWith('.')) {
      const withoutExt = path.join(dir, imp.source);
      const possiblePaths = [
        withoutExt,
        withoutExt + '.js',
        withoutExt + '.jsx',
        withoutExt + '.ts',
        withoutExt + '.tsx',
        path.join(withoutExt, 'index.js'),
        path.join(withoutExt, 'index.ts')
      ];
      
      for (const possible of possiblePaths) {
        if (fs.existsSync(possible)) {
          resolvedPath = possible;
          break;
        }
      }
    }
    
    graph.imports.push({
      source: imp.source,
      resolved: resolvedPath,
      line: imp.line
    });
  }
  
  return graph;
}

module.exports = {
  parseFile,
  findSourceFiles,
  buildDependencyGraph,
  detectLanguage,
  PATTERNS
};
