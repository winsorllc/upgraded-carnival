---
name: content-search
description: Search within file contents using grep-like functionality. Supports regex patterns, multiple file types, context lines, and parallel search.
---

# Content Search

Search within file contents using patterns.

## Features

- **pattern**: Search pattern (regex or literal)
- **files**: File patterns to search
- **case**: Case-sensitive or insensitive search
- **regex**: Regular expression support
- **context**: Show context lines before/after match
- **count**: Count matches only
- **recursive**: Recursive directory search

## Usage

```bash
# Simple search
./scripts/content-search.js "TODO" --files "*.js"

# Regex search
./scripts/content-search.js "function\s+\w+" --files "*.ts" --regex

# Case insensitive
./scripts/content-search.js "apikey" --files "*.env" --case-insensitive

# With context
./scripts/content-search.js "class" --files "*.py" --before 2 --after 2

# Count only
./scripts/content-search.js "console.log" --files "*.js" --count

# Multiple file types
./scripts/content-search.js "import" --files "*.js" --files "*.ts" --files "*.jsx"

# Search specific directory
./scripts/content-search.js "export" --files "src/**/*"
```

## Examples

| Task | Command |
|------|---------|
| Find TODOs | `content-search.js "TODO" --files "**/*"` |
| Find functions | `content-search.js "^function\s" --files "*.js" --regex` |
| Find API keys | `content-search.js "api[_-]?key" --files "*.env" --case-insensitive` |
| Find imports | `content-search.js "^import" --files "*.ts" --regex` |
| Security audit | `content-search.js "password" --files "*.config.*"` |

## Notes

- Binary files are skipped automatically
- Respects `.gitignore` patterns
- Large files (>10MB) skipped by default
- Supports UTF-8 encoded files