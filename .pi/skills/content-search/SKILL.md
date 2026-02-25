---
name: content-search
description: "Search file contents using regex patterns with ripgrep or grep. Use when: finding code, text patterns, or content across files."
metadata: { "openclaw": { "emoji": "🔍", "requires": { "bins": ["rg", "grep"] } } }
---

# Content Search Skill

Search file contents using regular expressions with ripgrep (rg) or grep fallback. Optimized for searching code and text files.

## When to Use

✅ **USE this skill when:**
- Finding where a function is defined
- Searching for specific patterns in code
- Locating files containing specific text
- Analyzing codebase structure

❌ **DON'T use this skill when:**
- Binary file search (use file command)
- Simple filename matching (use find or glob)
- Regex in filenames only (use find -regex)

## Features

- Ripgrep (rg) with grep fallback
- Multiple output modes: content, files, count
- Glob-based file filtering
- Context lines before/after matches
- Case-sensitive/insensitive search
- Multiline pattern support (rg only)
- Respects .gitignore

## Usage

### Basic Search

```bash
node /job/.pi/skills/content-search/search.js --pattern "console.log"
```

### Search with File Filter

```bash
node /job/.pi/skills/content-search/search.js \
  --pattern "function.*init" \
  --include "*.js" \
  --include "*.ts"
```

### Files with Matches Only

```bash
node /job/.pi/skills/content-search/search.js \
  --pattern "TODO" \
  --output-mode files_with_matches
```

### Match Count Per File

```bash
node /job/.pi/skills/content-search/search.js \
  --pattern "error" \
  --output-mode count
```

### With Context

```bash
node /job/.pi/skills/content-search/search.js \
  --pattern "async function" \
  --context-before 2 \
  --context-after 2
```

### Case Insensitive

```bash
node /job/.pi/skills/content-search/search.js \
  --pattern "todo" \
  --case-insensitive
```

## CLI Options

```
--pattern <regex>        Pattern to search for (required)
--path <directory>       Directory to search (default: .)
--include <glob>         File glob filter (e.g., "*.rs")
--exclude <glob>         Exclude glob pattern
--output-mode <mode>     content|files_with_matches|count
--case-insensitive       Case-insensitive search
--context-before <n>     Lines before match
--context-after <n>      Lines after match
--multiline              Enable multiline (rg only)
--max-results <n>        Maximum results (default: 1000)
```

## Output Format

**Content mode:**
```json
{
  "matches": [
    {
      "file": "src/index.js",
      "line": 42,
      "content": "  console.log('Hello');",
      "before": [],
      "after": []
    }
  ],
  "totalMatches": 1
}
```

**Files mode:**
```json
{
  "files": ["src/index.js", "src/utils.js"],
  "totalFiles": 2
}
```

**Count mode:**
```json
{
  "counts": [
    {"file": "src/index.js", "count": 5},
    {"file": "src/utils.js", "count": 3}
  ],
  "totalMatches": 8
}
```

## Example Patterns

**Find all function definitions:**
```bash
node /job/.pi/skills/content-search/search.js \
  --pattern "fn\s+\w+\s*\(" \
  --include "*.rs"
```

**Find TODOs:**
```bash
node /job/.pi/skills/content-search/search.js \
  --pattern "TODO|FIXME|XXX" \
  --case-insensitive
```

**Find imports:**
```bash
node /job/.pi/skills/content-search/search.js \
  --pattern "^import.*from.*$" \
  --include "*.js" --include "*.ts"
```

**Find error handling:**
```bash
node /job/.pi/skills/content-search/search.js \
  --pattern "try\s*{|catch\s*\(|\.catch\(" \
  --include "*.js"
```

## Performance Tips

- Use specific `--include` patterns to reduce search scope
- Prefer ripgrep (rg) over grep - it's 10-100x faster
- Limit results with `--max-results`
- Use `--output-mode files_with_matches` for quick existence checks
- Exclude node_modules: `--exclude "node_modules/*"`
