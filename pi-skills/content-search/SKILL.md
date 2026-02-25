---
name: content-search
description: "Search file contents with context extraction across directories. Use when: (1) finding code patterns, function definitions, or API calls across a codebase, (2) searching logs or documents for specific terms with surrounding context, (3) locating configuration values or strings in multiple files. NOT for: binary file searches, full-text database queries, or regex-heavy pattern matching (use shell grep for those)."
homepage: https://github.com/stephengpope/thepopebot
metadata: { "thepopebot": { "emoji": "🔍", "requires": { "bins": ["grep", "ripgrep"] } } }
---

# Content Search Skill

Search file contents with intelligent context extraction across directories.

## When to Use

✅ **USE this skill when:**

- Finding function/class definitions across a codebase
- Locating API endpoints, routes, or handlers
- Searching logs for specific errors or events with context
- Finding where a variable, constant, or string is used
- Searching documentation for specific topics
- Locating configuration values across multiple config files

## When NOT to Use

❌ **DON'T use this skill when:**

- Binary file searches → use `file` command or specialized tools
- Full-text database queries → use database-specific tools
- Simple grep with known file → use bash `grep` directly
- Regex-heavy patterns → use shell `grep -E` or `rg` directly
- Searching inside archives (zip, tar) → extract first

## Tool Actions

### `search_content`

Search files for a term or pattern with context.

**Parameters:**
- `query` (string, required): Search term or regex pattern
- `directory` (string, optional): Directory to search (default: current working directory)
- `filePattern` (string, optional): Glob pattern to filter files (e.g., `*.js`, `**/*.md`)
- `contextLines` (number, optional): Lines of context before/after match (default: 3, max: 10)
- `maxResults` (number, optional): Maximum results to return (default: 20, max: 100)
- `caseSensitive` (boolean, optional): Case-sensitive search (default: false)
- `includeHidden` (boolean, optional): Include hidden files/directories (default: false)

**Returns:**
- `matches`: Array of match objects with file path, line number, matched text, and context
- `summary`: Total matches found, files searched, search duration

### `find_symbol`

Find definitions of a symbol (function, class, variable) in code.

**Parameters:**
- `symbol` (string, required): Symbol name to find
- `directory` (string, optional): Directory to search (default: current working directory)
- `language` (string, optional): Programming language hint (e.g., `javascript`, `python`, `rust`)

**Returns:**
- `definitions`: Array of definition locations with file path and line number
- `references`: Array of reference locations (usages)

### `search_logs`

Search log files with time-based filtering and severity levels.

**Parameters:**
- `query` (string, required): Search term
- `logDir` (string, optional): Log directory (default: `./logs`)
- `level` (string, optional): Filter by log level (`error`, `warn`, `info`, `debug`)
- `since` (string, optional): ISO timestamp or relative (e.g., `1h`, `2d`, `1w`)
- `contextLines` (number, optional): Context lines (default: 5)

**Returns:**
- `entries`: Array of log entries with timestamps, levels, and context
- `summary`: Counts by level, time range covered

## Examples

### Basic Code Search

```bash
# Find all uses of "createJob" function
node content-search.js --query "createJob" --directory "/job" --filePattern "*.js"
```

### Search with Context

```bash
# Search for error patterns with 5 lines of context
node content-search.js --query "Error:" --directory "/job/logs" --contextLines 5 --maxResults 10
```

### Find Function Definitions

```bash
# Find function definitions
node content-search.js --action find_symbol --symbol "authenticateUser" --language javascript
```

### Search Recent Error Logs

```bash
# Find errors in the last 24 hours
node content-search.js --action search_logs --query "failed" --level error --since 24h
```

## Notes

- Uses `ripgrep` (rg) when available for fast searches, falls back to `grep`
- Respects `.gitignore` by default
- Skips binary files automatically
- Results are sorted by relevance (match count)
- Large files (>10MB) are skipped by default
