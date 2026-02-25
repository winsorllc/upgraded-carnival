---
name: code-indexer
description: "Local code indexer and semantic search for codebases. Use when you need to: (1) find function/class definitions across a codebase, (2) search for code references and usages, (3) understand code structure and imports, (4) navigate large codebases efficiently. Provides IDE-like code navigation without external APIs."
---

# Code Indexer

Local code indexer and semantic search engine for codebases. Provides fast code search, definition finding, and codebase navigation using simple pattern matching and AST-like analysis.

## Setup

No additional installation required. Uses built-in Node.js modules and shell commands (grep, find, sed).

Optional: Install ripgrep for faster searches:
- macOS: `brew install ripgrep`
- Linux: `apt install ripgrep` or `dnf install ripgrep`

## Usage

### Index a codebase

```bash
node /job/.pi/skills/code-indexer/index.js "/path/to/project"
```

### Search for a symbol/function

```bash
node /job/.pi/skills/code-indexer/search.js "functionName"
```

### Find definitions

```bash
node /job/.pi/skills/code-indexer/find-def.js "ClassName" "/path/to/project"
```

### Find references/usages

```bash
node /job/.pi/skills/code-indexer/find-refs.js "functionName" "/path/to/project"
```

### Analyze file imports/exports

```bash
node /job/.pi/skills/code-indexer/analyze.js "/path/to/file.js"
```

### Get project structure

```bash
node /job/.pi/skills/code-indexer/structure.js "/path/to/project"
```

## Output Format

### Search Results
```json
{
  "query": "functionName",
  "results": [
    {
      "file": "/path/to/project/src/utils.js",
      "line": 42,
      "type": "function",
      "context": "function functionName(param) {",
      "match": "functionName"
    }
  ],
  "total": 5,
  "took": "120ms"
}
```

### Definition Results
```json
{
  "symbol": "MyClass",
  "definitions": [
    {
      "file": "/path/to/project/src/models.js",
      "line": 15,
      "type": "class",
      "signature": "class MyClass {"
    }
  ]
}
```

### Import Analysis
```json
{
  "file": "/path/to/project/src/index.js",
  "imports": [
    { "module": "./utils", "type": "named", "names": ["helper", "format"] },
    { "module": "lodash", "type": "default", "name": "_" }
  ],
  "exports": [
    { "name": "main", "type": "named" },
    { "name": "default", "type": "default" }
  ]
}
```

## Supported Languages

- **JavaScript/TypeScript**: Full support (ES6+ imports/exports, classes, functions)
- **Python**: Full support (imports, classes, functions)
- **Java**: Full support (imports, classes, methods)
- **Go**: Full support (imports, functions, methods)
- **Rust**: Full support (use, fn, struct, impl)
- **C/C++**: Basic support (#include, function declarations)
- **Other**: Basic pattern matching for any text-based file

## Common Workflows

### Understand a codebase
```
User: How is the auth system structured?
Agent: [Uses code-indexer to find auth-related files, classes, and functions]
```

### Find where a function is defined
```
User: Where is the calculateTotal function defined?
Agent: [Uses find-def.js to locate the definition]
```

### Find all usages
```
User: Where is this config variable used?
Agent: [Uses find-refs.js to find all references]
```

### Analyze a new file
```
User: What does this file do? src/api/users.js
Agent: [Uses analyze.js to get imports/exports and structure]
```

## Integration with Other Skills

- **With memory-agent**: Store findings about project architecture
- **With git-ops**: Use after checking out new branches to understand changes
- **With browser-tools**: Document code from web-based code viewers

## Configuration

The indexer respects `.gitignore` by default. Set environment variable `CODE_INDEXER_IGNORE_GIT=0` to disable.

Index caching: Results are cached in `/tmp/code-indexer-cache/` for faster repeated searches. Clear cache with `node /job/.pi/skills/code-indexer/clear-cache.js`.

## Limitations

- No semantic understanding (pattern matching only)
- Does not resolve dynamic imports or complex type inference
- Large codebases may take time to index initially
- Some language features may not be recognized

## Tips

1. **For faster searches**: Install ripgrep - the tool automatically uses it when available
2. **For type definitions**: Use `find-def.js` first, then `find-refs.js` to get full picture
3. **For large projects**: Use `--limit` flag to cap results: `search.js "query" --limit 20`
