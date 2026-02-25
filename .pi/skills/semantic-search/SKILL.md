---
name: semantic-search
description: "Search code and text files using semantic similarity and keyword matching. Use when: finding relevant code snippets, searching documentation, or locating files by content. NOT for: binary file search or regex pattern matching."
metadata: { "openclaw": { "emoji": "🔍", "requires": { "bins": ["node"] } } }
---

# Semantic Search Skill

Search through files and directories for content using keyword matching and basic semantic analysis.

## When to Use

✅ **USE this skill when:**

- Finding code that implements a feature
- Searching documentation for topics
- Locating files by their content
- Finding similar code patterns
- Researching codebase structure

## When NOT to Use

❌ **DON'T use this skill when:**

- Searching binary files → use file tools
- Exact regex patterns → use grep
- Searching very large repos (>100k files) → use indexed search

## Installation

```bash
cd /job
npm install natural compromise
```

## Features

- **Keyword Search:** Simple text matching across files
- **Stemming:** Matches word variations (run, running, ran)
- **TF-IDF Scoring:** Ranks results by relevance
- **File Filtering:** Filter by extension, path patterns
- **Context:** Shows surrounding lines for each match

## Usage

### Basic Search

```javascript
const { searchFiles } = require('./semantic-search');

const results = await searchFiles('.', {
  query: 'authentication middleware',
  extensions: ['.js', '.ts'],
  maxResults: 20
});

console.log(results);
```

### Advanced Search

```javascript
const results = await searchFiles('/path/to/code', {
  query: 'error handling database',
  excludeDirs: ['node_modules', 'dist', '.git'],
  extensions: ['.js', '.ts', '.py'],
  contextLines: 3,
  maxResults: 50,
  minScore: 0.3
});
```

### Node.js Implementation

```javascript
const fs = require('fs');
const path = require('path');
const natural = require('natural');

class SemanticSearcher {
  constructor(options = {}) {
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
    this.maxFileSize = options.maxFileSize || 1024 * 1024; // 1MB
    this.excludeDirs = options.excludeDirs || [
      'node_modules', 'dist', 'build', '.git', 'vendor',
      '__pycache__', '.next', '.nuxt'
    ];
  }

  tokenize(text) {
    return this.tokenizer.tokenize(text.toLowerCase())
      .map(token => this.stemmer.stem(token));
  }

  calculateTF(tokens) {
    const tf = {};
    tokens.forEach(token => {
      tf[token] = (tf[token] || 0) + 1;
    });
    const maxFreq = Math.max(...Object.values(tf));
    Object.keys(tf).forEach(key => {
      tf[key] /= maxFreq;
    });
    return tf;
  }

  scoreDocument(queryTokens, docTokens) {
    const querySet = new Set(queryTokens);
    let score = 0;
    docTokens.forEach(token => {
      if (querySet.has(token)) score++;
    });
    return score / Math.max(docTokens.length, 1);
  }

  async searchFiles(rootDir, query, options = {}) {
    const queryTokens = this.tokenize(query);
    const results = [];
    const files = await this.walkDirectory(rootDir, options);

    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        const tokens = this.tokenize(content);
        const score = this.scoreDocument(queryTokens, tokens);

        if (score > (options.minScore || 0.1)) {
          const lines = content.split('\n');
          const matchLines = this.findMatchingLines(lines, queryTokens, options.contextLines || 2);
          
          results.push({
            file: path.relative(rootDir, file),
            score: score.toFixed(3),
            matches: matchLines,
            totalLines: lines.length
          });
        }
      } catch (e) {
        // Skip unreadable files
      }
    }

    return results.sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
      .slice(0, options.maxResults || 20);
  }

  async walkDirectory(dir, options = {}) {
    const files = [];
    const extensions = options.extensions || null;
    
    async function walk(currentDir) {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!this.excludeDirs.includes(entry.name)) {
            await walk(path.join(currentDir, entry.name));
          }
        } else if (entry.isFile()) {
          if (!extensions || extensions.some(ext => entry.name.endsWith(ext))) {
            const filePath = path.join(currentDir, entry.name);
            const stats = await fs.promises.stat(filePath);
            if (stats.size <= this.maxFileSize) {
              files.push(filePath);
            }
          }
        }
      }
    }
    
    await walk.call(this, dir);
    return files;
  }

  findMatchingLines(lines, queryTokens, contextLines) {
    const matches = [];
    
    lines.forEach((line, index) => {
      const lineTokens = this.tokenize(line);
      const matchCount = lineTokens.filter(t => queryTokens.includes(t)).length;
      
      if (matchCount > 0) {
        const start = Math.max(0, index - contextLines);
        const end = Math.min(lines.length, index + contextLines + 1);
        
        matches.push({
          lineNumber: index + 1,
          content: line.trim(),
          context: lines.slice(start, end).join('\n'),
          matchScore: matchCount
        });
      }
    });
    
    return matches.slice(0, 10);
  }
}

// Usage
const searcher = new SemanticSearcher();
const results = await searcher.searchFiles('.', 'authentication', {
  extensions: ['.js', '.ts'],
  maxResults: 10
});

console.log(JSON.stringify(results, null, 2));
```

## Command Line Usage

```bash
# Search for authentication code
node index.js search "auth middleware" --ext .js,.ts --max 10

# Search with context
node index.js search "error handling" --context 5

# Search specific directory
node index.js search "database" --dir src/
```

## Output Format

```json
{
  "query": "authentication middleware",
  "totalMatches": 5,
  "results": [
    {
      "file": "src/middleware/auth.js",
      "score": "0.847",
      "matches": [
        {
          "lineNumber": 42,
          "content": "function authenticateUser(token) {",
          "context": "...",
          "matchScore": 3
        }
      ]
    }
  ]
}
```

## Quick Tips

- Use specific terms: "JWT validation" not just "auth"
- Include type hints: ".js" files often have different patterns
- Multiple words improve accuracy
- Use camelCase terms for code search

## Notes

- Searches text files only
- Case-insensitive matching
- Stemming improves recall
- Scores range from 0.0 to 1.0
