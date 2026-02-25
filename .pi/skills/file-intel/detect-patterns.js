#!/usr/bin/env node

/**
 * File Intelligence - Detect code patterns across a codebase
 * 
 * Usage: node detect-patterns.js <path> [--types "react-hooks,api-routes,components"]
 */

const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__', 'vendor', '.venv'];

const PATTERNS = {
  'react-hooks': {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    patterns: [
      /use[A-Z]\w+\s*\(/g,           // useX() pattern
      /export\s+const\s+use/g,       // export const use
      /export\s+function\s+use/g,     // export function use
    ],
    testPatterns: [
      /\.test\.\w+$/,
      /\.spec\.\w+$/,
      /\/__tests__\//,
      /\/test\//
    ]
  },
  
  'api-routes': {
    extensions: ['.js', '.ts'],
    patterns: [
      /router\.(get|post|put|delete|patch)\s*\(/g,  // Express router
      /app\.(get|post|put|delete|patch)\s*\(/g,     // Express app
      /@Get|@Post|@Put|@Delete|@Patch/g,              // Decorators
      /handler\s*\(/g,                               // Fastify
      /route\s*\(/g,                                 // Generic route
      /Route::/g,                                    // Laravel
    ],
    filePatterns: [
      /\/api\//,
      /\/routes\//,
      /\/handlers\//,
      /\[id\]/,
      /\[slug\]/
    ]
  },
  
  'components': {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
    patterns: [
      /class\s+\w+\s+extends\s+(React\.)?Component/g,
      /function\s+\w+\s*\([^)]*\)\s*\{[^}]*return/g,
      /const\s+\w+\s*=\s*\([^)]*\)\s*=>/g,
      /@Component/g,
      /<template>/g,
      /<script>/g,
    ],
    filePatterns: [
      /\/components\//,
      /\/ui\//,
      /\/views\//,
      /\/pages\//
    ]
  },
  
  'services': {
    extensions: ['.js', '.ts', '.py', '.go', '.java'],
    patterns: [
      /class\s+\w+Service/g,
      /class\s+\w+Client/g,
      /class\s+\w+API/g,
      /Service\s+class/g,
    ],
    filePatterns: [
      /\/services\//,
      /\/api\//,
      /\/clients\//
    ]
  },
  
  'models': {
    extensions: ['.js', '.ts', '.py', '.go', '.java', '.rb', '.cs'],
    patterns: [
      /class\s+\w+\s+(extends|implements)\s+\w+/g,
      /class\s+\w+\s*\{/g,
      /type\s+\w+\s*=\s*\{/g,
      /interface\s+\w+\s*\{/g,
      /@Entity/g,
      /@Table/g,
      /@Model/g,
      /schema\s*=/g,
      /Field\(/g,
    ],
    filePatterns: [
      /\/models\//,
      /\/schemas\//,
      /\/entities\//,
      /\/types\//
    ]
  },
  
  'utils': {
    extensions: ['.js', '.ts', '.py', '.go', '.rb'],
    patterns: [
      /function\s+\w+\s*\([^)]*\)\s*\{/g,
      /def\s+\w+\s*\([^)]*\):/g,
      /func\s+\w+\s*\([^)]*\)/g,
      /const\s+\w+\s*=/g,
    ],
    filePatterns: [
      /\/utils\//,
      /\/helpers\//,
      /\/lib\//
    ]
  },
  
  'types': {
    extensions: ['.ts', '.d.ts', '.py'],
    patterns: [
      /type\s+\w+\s*=/g,
      /interface\s+\w+/g,
      /@typedef/g,
      /class\s+\w+\s*:/g,
      /:\s*(string|number|boolean|any|void|never)\s*[;=)]/g,
    ],
    filePatterns: [
      /\/types\//,
      /\/interfaces\//,
      /\.d\.ts$/,
      /\/defs\//
    ]
  },
  
  'tests': {
    extensions: ['.js', '.ts', '.py', '.rb', '.go'],
    patterns: [
      /describe\s*\(/g,
      /it\s*\(/g,
      /test\s*\(/g,
      /assert/g,
      /expect\(/g,
      /def test_\w+/g,
      /func\s+Test\w+/g,
      /should\s+/g,
    ],
    testPatterns: [
      /\.test\.\w+$/,
      /\.spec\.\w+$/,
      /\/__tests__\//,
      /\/test\//,
      /\/tests\//
    ]
  },
  
  'configs': {
    extensions: ['.json', '.js', '.ts', '.yaml', '.yml', '.toml', '.ini', '.conf'],
    patterns: [
      /module\.exports/g,
      /export\s+default/g,
      /^\s*\{[\s\S]*\}\s*$/m,
    ],
    filePatterns: [
      /\/config\//,
      /config\.\w+$/,
      /\.config\.\w+$/,
      /\/settings\//
    ]
  }
};

function findFiles(dir, extensions) {
  const results = [];
  
  function walk(directory) {
    if (IGNORE_DIRS.includes(path.basename(directory))) return;
    
    try {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            results.push(fullPath);
          }
        }
      }
    } catch (err) {
      // Ignore permission errors
    }
  }
  
  walk(dir);
  return results;
}

function detectPatterns(targetDir, types = Object.keys(PATTERNS)) {
  const results = {};
  
  for (const type of types) {
    if (!PATTERNS[type]) {
      console.warn(`Unknown pattern type: ${type}`);
      continue;
    }
    
    const patternDef = PATTERNS[type];
    const files = findFiles(targetDir, patternDef.extensions);
    const matches = [];
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(targetDir, file);
        
        let matchCount = 0;
        let matchedPatterns = [];
        
        // Check file name patterns
        const fileNameMatch = patternDef.filePatterns?.some(p => p.test(relativePath));
        
        // Check content patterns
        for (const pattern of patternDef.patterns) {
          const matches = content.match(pattern);
          if (matches) {
            matchCount += matches.length;
            matchedPatterns.push({
              pattern: pattern.toString(),
              count: matches.length,
              samples: matches.slice(0, 3)
            });
          }
        }
        
        // Consider it a match if either file name or content matches
        if (fileNameMatch || matchCount > 0) {
          matches.push({
            file: relativePath,
            hasFilePattern: !!fileNameMatch,
            matchCount,
            matchedPatterns: matchedPatterns.slice(0, 5)
          });
        }
      } catch (err) {
        // Skip files we can't read
      }
    }
    
    results[type] = {
      totalMatches: matches.length,
      files: matches.slice(0, 50)  // Limit to top 50 files
    };
  }
  
  return results;
}

function detectFramework(dir) {
  const indicators = {
    'React': ['package.json', 'src/index.js', 'src/index.tsx'],
    'Next.js': ['package.json', 'next.config.js', 'next.config.mjs', 'app/'],
    'Vue': ['package.json', 'vue.config.js', 'src/main.ts', 'src/main.js'],
    'Svelte': ['package.json', 'svelte.config.js', 'rollup.config.js'],
    'Express': ['package.json', 'server.js', 'app.js', 'index.js'],
    'Fastify': ['package.json'],
    'Django': ['manage.py', 'settings.py'],
    'Flask': ['app.py', 'requirements.txt'],
    'Rails': ['Gemfile', 'config.ru'],
    'Laravel': ['artisan', 'composer.json'],
    'Go': ['go.mod'],
    'Rust': ['Cargo.toml'],
    'Python': ['pyproject.toml', 'requirements.txt', 'setup.py'],
    'Java': ['pom.xml', 'build.gradle'],
    '.NET': ['*.csproj', '*.sln'],
  };
  
  const found = [];
  try {
    const entries = fs.readdirSync(dir);
    
    for (const [framework, markers] of Object.entries(indicators)) {
      const matchCount = markers.filter(m => {
        if (m.includes('/')) {
          return fs.existsSync(path.join(dir, m));
        } else if (m.includes('*')) {
          const pattern = m.replace('*', '');
          return entries.some(e => e.startsWith(pattern));
        } else {
          return entries.includes(m);
        }
      }).length;
      
      if (matchCount > 0) {
        found.push({ framework, matchCount, total: markers.length });
      }
    }
  } catch (err) {
    // Ignore
  }
  
  found.sort((a, b) => b.matchCount - a.matchCount);
  return found;
}

function analyzeStructure(targetDir) {
  const structure = {
    root: targetDir,
    directories: {},
    files: 0,
    languages: {},
    frameworks: [],
    entryPoints: [],
    configFiles: []
  };
  
  const languageCounts = {};
  const dirCounts = {};
  const entryPoints = [];
  const configFiles = [];
  
  const EXT_LANG = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript (React)',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript (React)',
    '.py': 'Python',
    '.rb': 'Ruby',
    '.go': 'Go',
    '.rs': 'Rust',
    '.java': 'Java',
    '.c': 'C',
    '.cpp': 'C++',
    '.h': 'C/C++ Header',
    '.vue': 'Vue',
    '.svelte': 'Svelte',
    '.php': 'PHP',
    '.cs': 'C#',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.scala': 'Scala',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.toml': 'TOML',
    '.md': 'Markdown',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.html': 'HTML'
  };
  
  const ENTRY_PATTERNS = [
    'index.js',
    'index.ts',
    'main.js',
    'main.ts',
    'app.js',
    'app.ts',
    'server.js',
    'server.ts',
    'index.html',
    'main.py',
    'main.go',
    'main.rs',
    'src/index.js',
    'src/index.ts',
    'src/main.js',
    'src/app.js'
  ];
  
  const CONFIG_PATTERNS = [
    'package.json',
    'tsconfig.json',
    'jest.config.js',
    'vite.config.js',
    'webpack.config.js',
    'next.config.js',
    'tailwind.config.js',
    'docker-compose.yml',
    'Dockerfile',
    '.env.example',
    'Cargo.toml',
    'go.mod',
    'pyproject.toml',
    'requirements.txt',
    'Gemfile',
    'composer.json'
  ];
  
  function walk(directory, depth = 0) {
    if (IGNORE_DIRS.includes(path.basename(directory))) return;
    if (depth > 3) return;  // Limit depth
    
    try {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        const relativePath = path.relative(targetDir, fullPath);
        
        if (entry.isDirectory()) {
          const dirName = path.basename(fullPath);
          dirCounts[dirName] = (dirCounts[dirName] || 0) + 1;
          walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          structure.files++;
          
          const ext = path.extname(entry.name).toLowerCase();
          const lang = EXT_LANG[ext] || 'Other';
          languageCounts[lang] = (languageCounts[lang] || 0) + 1;
          
          // Check for config files
          if (CONFIG_PATTERNS.includes(entry.name) || relativePath.startsWith('config')) {
            configFiles.push(relativePath);
          }
          
          // Check for entry points
          if (ENTRY_PATTERNS.includes(entry.name) || 
              (relativePath.startsWith('src/') && (entry.name === 'index.js' || entry.name === 'index.ts'))) {
            entryPoints.push(relativePath);
          }
        }
      }
    } catch (err) {
      // Ignore permission errors
    }
  }
  
  walk(targetDir);
  
  structure.directories = Object.entries(dirCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
  
  structure.languages = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
  
  structure.frameworks = detectFramework(targetDir);
  structure.entryPoints = entryPoints;
  structure.configFiles = configFiles;
  
  return structure;
}

// Main execution
const args = process.argv.slice(2);
const targetPath = args[0];
const typesIndex = args.indexOf('--types');
const types = typesIndex >= 0 ? args[typesIndex + 1].split(',') : Object.keys(PATTERNS);

if (!targetPath) {
  console.error('Usage: node detect-patterns.js <path> [--types "react-hooks,api-routes,components"]');
  process.exit(1);
}

const absolutePath = path.resolve(targetPath);

if (!fs.existsSync(absolutePath)) {
  console.error(`Error: Path does not exist: ${absolutePath}`);
  process.exit(1);
}

const isDir = fs.statSync(absolutePath).isDirectory();
const targetDir = isDir ? absolutePath : path.dirname(absolutePath);

console.log('=== Structure Analysis ===');
const structure = analyzeStructure(targetDir);
console.log(JSON.stringify(structure, null, 2));

console.log('\n=== Pattern Detection ===');
const patterns = detectPatterns(targetDir, types);
console.log(JSON.stringify(patterns, null, 2));
