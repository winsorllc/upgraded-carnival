---
name: content-search
description: Search file contents by regex pattern within the workspace. Uses ripgrep (rg) when available, falling back to grep. Supports content output, file listing, and match counts.
metadata:
  {
    "requires": { "bins": ["rg"] }
  }
---

# Content Search

Search file contents by regex pattern within the workspace. Uses ripgrep (`rg`) for advanced features, falls back to `grep` if unavailable.

## Trigger

Use this skill when:
- User asks to search for text in files
- User wants to find where a function/variable is defined
- User needs to search across multiple files
- User wants to find all occurrences of a pattern

## Quick Start

```bash
# Basic search (content mode - shows matching lines)
content-search "function_name"

# Search in specific directory
content-search "pattern" --path ./src

# Find files with matches (no content)
content-search "pattern" --output-mode files_with_matches

# Count matches per file
content-search "pattern" --output-mode count

# Search in specific file types
content-search "pattern" --include "*.js"
content-search "pattern" --include "*.{ts,tsx,js,jsx}"
```

## Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--pattern` | positional | Regex pattern to search for | required |
| `--path` | `-p` | Directory to search in | current dir |
| `--output-mode` | `-o` | Output format: content, files_with_matches, count | content |
| `--include` | `-i` | File glob filter (e.g., '*.rs', '*.{ts,tsx}') | all |
| `--case-sensitive` | `-s` | Case-sensitive matching | true |
| `--context-before` | `-B` | Lines of context before match | 0 |
| `--context-after` | `-A` | Lines of context after match | 0 |
| `--context` | `-C` | Lines of context before and after | 0 |
| `--max-count` | `-m` | Maximum matches per file | unlimited |
| `--invert-match` | `-v` | Show lines that DON'T match | false |

## Output Modes

### content (default)
Shows matching lines with optional context:
```
src/main.rs:10: fn main() {
src/lib.rs:5: fn helper() {
```

### files_with_matches
Shows only file paths that contain matches:
```
src/main.rs
src/lib.rs
src/utils.rs
```

### count
Shows match counts per file:
```
src/main.rs:5
src/lib.rs:12
src/utils.rs:3
```

## Examples

### Find all TypeScript files with a specific import
```bash
content-search "from '@/components'" --include "*.ts" --include "*.tsx"
```

### Find function definitions with context
```bash
content-search "function.*hello" --include "*.js" -C 3
```

### Count all TODO comments
```bash
content-search "TODO" --output-mode count
```

### Find non-matching lines
```bash
content-search "old_function" --invert-match --include "*.py"
```

### Search in hidden files
```bash
content-search "pattern" --glob ".*"
```

## Tool Integration

This skill can be used as a tool in agent workflows:

```
content_search(pattern="export const", include="*.ts", output_mode="files_with_matches")
```

## Notes

- Uses `rg` (ripgrep) when available for best performance
- Falls back to `grep -rn -E` if rg not available
- Searches are confined to workspace directory by default
- Supports PCRE2 patterns if rg compiled with PCRE support
