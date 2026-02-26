#!/usr/bin/env node

/**
 * Analyze File - Analyze a single file for imports, exports, and structure
 * Usage: node analyze.js <file-path>
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_PROJECT = process.cwd();

// Import/export patterns for different languages
const IMPORT_PATTERNS = {
  javascript: [
    // ES6 imports
    /import\s+(?:(?:\{[^}]*\}|[\w*]+)\s+from\s+)?['"]([^'"]+)['"]/g,
    // Dynamic imports
    /import\s*\(['"]([^'"]+)['"]\)/g,
    // Require
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ],
  typescript: [
    /import\s+(?:(?:\{[^}]*\}|[\w*]+)\s+from\s+)?['"]([^'"]+)['"]/g,
    /import\s*\(['"]([^'"]+)['"]\)/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    // Type imports
    /import\s+type\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g,
    /import\s+type\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g
  ],
  python: [
    /^(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm
  ],
  java: [
    /import\s+([\w.]+);/g
  ],
  go: [
    /import\s+(?:\(\s*)?["']([^"']+)["']/g,
    /^\s*import\s+"([^"]+)"/gm
  ],
  rust: [
    /use\s+([\w:]+)/g
  ],
  c: [
    /#include\s*[<"]([^>"]+)[>"]/g
  ]
};

const EXPORT_PATTERNS = {
  javascript: [
    // Named exports
    /export\s+(?:const|let|var|function|class|async\s+function)\s+(\w+)/g,
    // Export from
    /export\s+\{[^}]+\}\s+from\s+['"]([^'"]+)['"]/g,
    // Default export
    /export\s+default\s+(?:const|let|var|function|class)?\s*(\w+)?/g,
    // Module.exports
    /module\.exports\s*=\s*(?:\{([^}]+)\}|(\w+))/g
  ],
  typescript: [
    /export\s+(?:const|let|var|function|class|async\s+function|type|interface)\s+(\w+)/g,
    /export\s+\{[^}]+\}\s+from\s+['"]([^'"]+)['"]/g,
    /export\s+default\s+(?:const|let|var|function|class|type|interface)?\s*(\w+)?/g,
    /module\.exports\s*=/g
  ],
  python: [
    /^__all__\s*=\s*\[([^\]]+)\]/gm,
    /^(\w+)\s*=/m
  ],
  java: [
    // Public methods and fields
    /(?:public|protected)\s+[\w<>[\]]+\s+(\w+)\s*\(/g,
    /public\s+static\s+void\s+main/g
  ],
  go: [
    /func\s+(?:(?:\([^)]+\)\s+)?(\w+)\s*\(|(\w+)\s*\()/g,
    /var\s+(\w+)/g,
    /const\s+(\w+)/g
  ],
  rust: [
    /pub\s+fn\s+(\w+)/g,
    /pub\s+struct\s+(\w+)/g,
    /pub\s+use\s+(\w+)/g,
    /pub\s+const\s+(\w+)/g
  ],
  c: [
    /#define\s+(\w+)/g,
    /(?:void|int|char|float|double|[\w*]+)\s+(\w+)\s*\([^)]*\)\s*\{/g
  ]
};

// Get language from file extension
function getLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const langMap = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.c': 'c',
    '.cpp': 'c',
    '.h': 'c',
    '.hpp': 'c'
  };
  return langMap[ext] || 'text';
}

// Extract imports from content
function extractImports(content, language) {
  const patterns = IMPORT_PATTERNS[language] || IMPORT_PATTERNS.javascript;
  const imports = [];
  
  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(content)) !== null) {
      // Handle different capture groups
      let module, names;
      
      if (language === 'python') {
        module = match[1] || match[2];
        names = null;
      } else if (language === 'typescript' && pattern.source.includes('type')) {
        // Type imports
        module = match[3] || match[2];
        names = match[1] ? match[1].split(',').map(n => n.trim()) : null;
      } else {
        module = match[1];
      }
      
      if (module) {
        // Determine import type
        let type = 'default';
        let name = null;
        
        if (names) {
          type = 'named';
          name = names;
        } else if (match[0].includes('{')) {
          type = 'named';
        } else if (match[0].includes('*')) {
          type = 'namespace';
        }
        
        imports.push({
          module,
          type,
          names: name,
          line: content.substring(0, match.index).split('\n').length
        });
      }
    }
  }
  
  return imports;
}

// Extract exports from content
function extractExports(content, language) {
  const patterns = EXPORT_PATTERNS[language] || EXPORT_PATTERNS.javascript;
  const exports = [];
  
  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(content)) !== null) {
      let name = match[1] || match[2];
      
      if (name || match[0].includes('default')) {
        // Determine export type
        let type = 'named';
        
        if (match[0].includes('default') || match[0].includes('module.exports')) {
          type = 'default';
        } else if (match[0].includes('class')) {
          type = 'class';
        } else if (match[0].includes('function') || match[0].includes('fn ')) {
          type = 'function';
        } else if (match[0].includes('interface') || match[0].includes('type ')) {
          type = 'type';
        } else if (match[0].includes('struct')) {
          type = 'struct';
        }
        
        exports.push({
          name: name || '(anonymous)',
          type,
          line: content.substring(0, match.index).split('\n').length
        });
      }
    }
  }
  
  return exports;
}

// Extract structure (functions, classes, etc.)
function extractStructure(content, language) {
  const structures = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Detect different code constructs
    if (language === 'javascript' || language === 'typescript') {
      if (/^\s*class\s+\w+/.test(line)) {
        structures.push({ type: 'class', name: line.match(/class\s+(\w+)/)?.[1], line: lineNum });
      } else if (/^\s*(?:function|const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(/.test(line)) {
        structures.push({ type: 'arrow-function', name: line.match(/(?:const|let|var)\s+(\w+)/)?.[1], line: lineNum });
      } else if (/^\s*function\s+\w+/.test(line)) {
        structures.push({ type: 'function', name: line.match(/function\s+(\w+)/)?.[1], line: lineNum });
      } else if (/^\s*(?:const|let|var)\s+\w+\s*=/.test(line) && !line.includes('=>')) {
        structures.push({ type: 'variable', name: line.match(/(?:const|let|var)\s+(\w+)/)?.[1], line: lineNum });
      } else if (/^\s*interface\s+\w+/.test(line)) {
        structures.push({ type: 'interface', name: line.match(/interface\s+(\w+)/)?.[1], line: lineNum });
      } else if (/^\s*type\s+\w+/.test(line)) {
        structures.push({ type: 'type', name: line.match(/type\s+(\w+)/)?.[1], line: lineNum });
      }
    } else if (language === 'python') {
      if (/^\s*class\s+\w+/.test(line)) {
        structures.push({ type: 'class', name: line.match(/class\s+(\w+)/)?.[1], line: lineNum });
      } else if (/^\s*def\s+\w+/.test(line)) {
        structures.push({ type: 'function', name: line.match(/def\s+(\w+)/)?.[1], line: lineNum });
      }
    } else if (language === 'go') {
      if (/^\s*func\s+\w+/.test(line)) {
        structures.push({ type: 'function', name: line.match(/func\s+(\w+)/)?.[1], line: lineNum });
      } else if (/^\s*type\s+\w+\s+struct/.test(line)) {
        structures.push({ type: 'struct', name: line.match(/type\s+(\w+)/)?.[1], line: lineNum });
      } else if (/^\s*type\s+\w+\s+interface/.test(line)) {
        structures.push({ type: 'interface', name: line.match(/type\s+(\w+)/)?.[1], line: lineNum });
      }
    } else if (language === 'rust') {
      if (/^\s*fn\s+\w+/.test(line)) {
        structures.push({ type: 'function', name: line.match(/fn\s+(\w+)/)?.[1], line: lineNum });
      } else if (/^\s*struct\s+\w+/.test(line)) {
        structures.push({ type: 'struct', name: line.match(/struct\s+(\w+)/)?.[1], line: lineNum });
      } else if (/^\s*impl\s+\w+/.test(line)) {
        structures.push({ type: 'impl', name: line.match(/impl\s+(?:<\w+>\s+)?(?:\w+\s+for\s+)?(\w+)/)?.[1], line: lineNum });
      } else if (/^\s*enum\s+\w+/.test(line)) {
        structures.push({ type: 'enum', name: line.match(/enum\s+(\w+)/)?.[1], line: lineNum });
      }
    }
  }
  
  return structures;
}

// Get file info
function getFileInfo(filePath) {
  const stats = fs.statSync(filePath);
  return {
    size: stats.size,
    modified: stats.mtime.toISOString(),
    created: stats.birthtime.toISOString()
  };
}

// Main analyze function
function analyzeFile(filePath) {
  const absolutePath = path.resolve(filePath);
  
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }
  
  const language = getLanguage(absolutePath);
  const content = fs.readFileSync(absolutePath, 'utf-8');
  const fileInfo = getFileInfo(absolutePath);
  
  console.log(`Analyzing: ${absolutePath}`);
  console.log(`Language: ${language}`);
  console.log(`Size: ${fileInfo.size} bytes`);
  console.log('');
  
  const imports = extractImports(content, language);
  const exports = extractExports(content, language);
  const structures = extractStructure(content, language);
  
  // Format imports
  console.log('='.repeat(60));
  console.log('IMPORTS');
  console.log('='.repeat(60));
  
  if (imports.length === 0) {
    console.log('(none)');
  } else {
    for (const imp of imports) {
      let impStr = `  Line ${imp.line}: `;
      
      if (imp.type === 'named' && imp.names) {
        impStr += `import { ${imp.names.join(', ')} } from '${imp.module}'`;
      } else if (imp.type === 'namespace') {
        impStr += `import * as ${imp.module}`;
      } else if (imp.type === 'default') {
        impStr += `import ${imp.module}`;
      } else {
        impStr += `${imp.module}`;
      }
      
      console.log(impStr);
    }
  }
  
  // Format exports
  console.log('\n' + '='.repeat(60));
  console.log('EXPORTS');
  console.log('='.repeat(60));
  
  if (exports.length === 0) {
    console.log('(none)');
  } else {
    for (const exp of exports) {
      console.log(`  Line ${exp.line}: ${exp.name} (${exp.type})`);
    }
  }
  
  // Format structure
  console.log('\n' + '='.repeat(60));
  console.log('STRUCTURE');
  console.log('='.repeat(60));
  
  if (structures.length === 0) {
    console.log('(none detected)');
  } else {
    for (const struct of structures) {
      console.log(`  Line ${struct.line}: ${struct.type} - ${struct.name}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Imports: ${imports.length}`);
  console.log(`  Exports: ${exports.length}`);
  console.log(`  Structures: ${structures.length}`);
  console.log(`  Lines: ${content.split('\n').length}`);
  console.log(`  Characters: ${content.length}`);
  
  return {
    file: absolutePath,
    language,
    info: fileInfo,
    imports,
    exports,
    structures,
    stats: {
      importCount: imports.length,
      exportCount: exports.length,
      structureCount: structures.length,
      lines: content.split('\n').length,
      characters: content.length
    }
  };
}

// CLI
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node analyze.js <file-path>');
  console.log('Examples:');
  console.log('  node analyze.js ./src/index.js');
  console.log('  node analyze.js /path/to/file.py');
  process.exit(1);
}

const filePath = args[0];
analyzeFile(filePath);
