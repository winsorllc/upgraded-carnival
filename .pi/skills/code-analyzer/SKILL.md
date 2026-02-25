---
name: code-analyzer
description: "Analyze code for patterns, complexity, dependencies, and quality. Use when: code review, refactoring, understanding codebases."
metadata: { "openclaw": { "emoji": "📊", "requires": { "bins": ["node"], "skills": ["content-search"] } } }
---

# Code Analyzer Skill

Analyze code for patterns, complexity, dependencies, quality metrics, and potential issues. Provides structured insights for code review and refactoring.

## When to Use

✅ **USE this skill when:**
- Code review automation
- Identifying refactoring opportunities
- Understanding unfamiliar codebases
- Quality metrics reporting
- Dependency analysis

❌ **DON'T use this skill when:**
- Syntax errors only (use linting)
- Runtime behavior (use testing tools)
- Binary analysis

## Usage

### Basic Analysis

```javascript
const { analyzeCode } = require('/job/.pi/skills/code-analyzer/analyzer.js');

const result = await analyzeCode('src/index.js', {
  language: 'javascript'
});

console.log(result);
```

### Directory Analysis

```javascript
const result = await analyzeCode('src/', {
  analyzeAllFiles: true,
  pattern: '**/*.js',
  exclude: ['**/node_modules/**', '**/*.test.js']
});

console.log(result.summary);
```

### Complexity Analysis

```javascript
const result = await analyzeCode('src/', {
  complexityMetrics: true,
  maxCyclomaticComplexity: 10,
  maxFunctionLength: 50
});

console.log(result.complexity);
// {
//   averageComplexity: 5.2,
//   functions: [
//     { name: "processData", complexity: 12, file: "src/processor.js:42", issue: "High complexity" }
//   ]
// }
```

### Dependency Analysis

```javascript
const result = await analyzeCode('src/', {
  dependencyGraph: true,
  detectCircularDependencies: true
});

console.log(result.dependencies);
// {
//   graph: {
//     "src/index.js": ["src/utils.js", "src/config.js"],
//     "src/utils.js": []
//   },
//   circularDependencies: [],
//   mostDependedOn: ["src/utils.js", "src/config.js"]
// }
```

### Code Quality Report

```javascript
const { generateQualityReport } = require('/job/.pi/skills/code-analyzer/analyzer.js');

const report = await generateQualityReport('src/', {
  languages: ['javascript', 'typescript'],
  metrics: ['complexity', 'duplication', 'maintainability'],
  thresholds: {
    complexity: 10,
    duplication: 5,
    maintainability: 50
  }
});

console.log(report);
// {
//   overall: { score: 75, grade: "B" },
//   issues: [...],
//   recommendations: [...]
// }
```

## Output Structure

```javascript
{
  file: "src/processor.js",
  language: "javascript",
  loc: { total: 234, code: 189, comments: 35, blank: 10 },
  
  functions: [
    {
      name: "processData",
      line: 42,
      params: 5,
      length: 78,
      cyclomaticComplexity: 12,
      cognitiveComplexity: 15
    }
  ],
  
  classes: [
    {
      name: "DataProcessor",
      line: 10,
      methods: 8,
      properties: 5
    }
  ],
  
  imports: [
    { path: "./utils", names: ["helper1", "helper2"] },
    { path: "lodash", names: ["_"] }
  ],
  
  exports: [
    { name: "processData", type: "function" },
    { name: "DataProcessor", type: "class" }
  ],
  
  patterns: {
    asyncAwait: 5,
    promises: 2,
    callbacks: 1,
    decorators: 0
  },
  
  issues: [
    {
      line: 45,
      type: "complexity",
      severity: "warning",
      message: "Function has high cyclomatic complexity (12)"
    }
  ]
}
```

## Metrics

### Cyclomatic Complexity

Measures independent paths through code:
- 1-10: Low complexity ✓
- 11-20: Moderate
- 21-50: High
- 50+: Very high ⚠️

### Cognitive Complexity

Measures how hard code is to understand:
- 1-10: Easy to read ✓
- 11-20: Moderate effort
- 21-50: Difficult
- 50+: Very difficult ⚠️

### Maintainability Index

0-100 scale:
- 85-100: Highly maintainable ✓
- 65-84: Maintainable
- 50-64: Difficult
- 0-49: Very difficult ⚠️

## API

```javascript
analyzeCode(path, options = {})
```

**Options:**
- `language` - javascript|typescript|python|java|etc
- `analyzeAllFiles` - Boolean
- `pattern` - Glob pattern for files
- `exclude` - Exclude patterns
- `complexityMetrics` - Boolean
- `dependencyGraph` - Boolean
- `detectCircularDependencies` - Boolean
- `maxCyclomaticComplexity` - Number threshold
- `maxFunctionLength` - Number threshold
- `includeTests` - Boolean

**Returns:**
```javascript
// See Output Structure above
```

## Language Support

| Language | Extensions | Complexity | Dependencies | Quality |
|----------|-----------|------------|--------------|---------|
| JavaScript | .js, .mjs | ✅ | ✅ | ✅ |
| TypeScript | .ts, .tsx | ✅ | ✅ | ✅ |
| Python | .py | ✅ | ✅ | ✅ |
| Java | .java | ✅ | ✅ | ✅ |
| Go | .go | ✅ | ✅ | ✅ |
| Rust | .rs | ✅ | ✅ | ✅ |
| C/C++ | .c, .h, .cpp | ✅ | ✅ | ✅ |
| Ruby | .rb | ✅ | ✅ | ✅ |

## Pattern Detection

```javascript
const result = await analyzeCode('src/', {
  detectPatterns: [
    'singleton',
    'factory',
    'observer',
    'decorator',
    'strategy',
    'adapter'
  ]
});

console.log(result.detectedPatterns);
// [
//   { pattern: "observer", file: "src/events.js", confidence: 0.85 },
//   { pattern: "singleton", file: "src/config.js", confidence: 0.92 }
// ]
```

## Security Analysis

```javascript
const result = await analyzeCode('src/', {
  securityScan: true,
  detectVulnerabilities: [
    'sqlInjection',
    'xss',
    'pathTraversal',
    'commandInjection',
    'insecureRandomness'
  ]
});

console.log(result.securityIssues);
// [
//   {
//     type: "sqlInjection",
//     file: "src/db.js",
//     line: 42,
//     severity: "critical",
//     pattern: "query(`SELECT * FROM ${table}`)",
//     suggestion: "Use parameterized queries"
//   }
// ]
```

## Code Duplication

```javascript
const result = await analyzeCode('src/', {
  detectDuplication: true,
  minTokenMatch: 30
});

console.log(result.duplicates);
// [
//   {
//     locations: [
//       { file: "src/file1.js", lines: "10-25" },
//       { file: "src/file2.js", lines: "45-60" }
//     ],
//     tokens: 180,
//     similarity: 0.95
//   }
// ]
```

## Bash CLI

```bash
# Analyze single file
node /job/.pi/skills/code-analyzer/analyzer.js \
  --file src/index.js

# Analyze directory
node /job/.pi/skills/code-analyzer/analyzer.js \
  --dir src/ \
  --exclude "**/node_modules/**"

# Generate quality report
node /job/.pi/skills/code-analyzer/analyzer.js \
  --dir src/ \
  --quality-report \
  --output report.json

# Check for security issues
node /job/.pi/skills/code-analyzer/analyzer.js \
  --dir src/ \
  --security-scan
```

## CI/CD Integration

```javascript
// .github/workflows/code-quality.yml
// Run code analysis on PR
const { analyzeCode } = require('/job/.pi/skills/code-analyzer/analyzer.js');

const result = await analyzeCode('src/', { qualityMetrics: true });

if (result.overall.score < 70) {
  console.error('Code quality below threshold');
  process.exit(1);
}
```

## Integration with Other Skills

```javascript
// With content-search for finding patterns
const { contentSearch } = require('../content-search/search.js');
const { analyzeCode } = require('./code-analyzer/analyzer.js');

const matches = await contentSearch('TODO.*refactor', { include: '*.js' });
for (const match of matches) {
  const analysis = await analyzeCode(match.file);
  console.log(`Issues in ${match.file}:`, analysis.issues);
}

// With git-structured for changed files
const { git } = require('../git-structured/git.js');
const diff = await git('diff', { cached: true });

const changedFiles = diff.files.map(f => f.path);
for (const file of changedFiles) {
  const analysis = await analyzeCode(file);
  if (analysis.issues.length > 0) {
    console.log(`Review needed: ${file}`);
  }
}
```
