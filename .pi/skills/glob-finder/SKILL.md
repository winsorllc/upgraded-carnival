---
name: glob-finder
description: Pattern-based file search using glob patterns. Supports recursive searching, exclude patterns, file type filtering, and detailed file information.
---

# Glob Finder

Search for files using glob patterns (wildcards like `*` and `**`).

## Features

- **patterns**: Standard glob patterns (*.js, **/*.md, src/**/*)
- **recursive**: Automatic recursive directory traversal
- **exclude**: Exclude patterns (--exclude node_modules)
- **types**: Filter by file type (--type f|d)
- **details**: Show size, modified time
- **limit**: Cap results

## Usage

```bash
# Simple pattern
./scripts/glob.js "*.js"

# Recursive pattern
./scripts/glob.js "**/*.md"

# Multiple patterns
./scripts/glob.js "*.js" "*.ts"

# With exclude
./scripts/glob.js "**/*" --exclude node_modules --exclude ".git"

# File type filter
./scripts/glob.js "**/*" --type f

# With details
./scripts/glob.js "*.txt" --details

# Limit results
./scripts/glob.js "**/*" --limit 100

# JSON output
./scripts/glob.js "*.json" --json
```

## Patterns

| Pattern | Matches |
|---------|---------|
| `*.js` | All .js files in current dir |
| `**/*.js` | All .js files recursively |
| `src/**/*.ts` | All .ts files under src/ |
| `*.{js,ts}` | All .js and .ts files |
| `test-*` | Files starting with "test-" |

## Examples

| Task | Command |
|------|---------|
| All JS files | `glob.js "**/*.js"` |
| Exclude tests | `glob.js "**/*.js" --exclude "*test*"` |
| Source files | `glob.js "src/**/*" --exclude node_modules` |
| Config files | `glob.js "*.{json,yml,yaml}"` |
| Large files | `glob.js "**/*" --details --min-size 1MB` |

## Notes

- `**` matches any number of directory levels
- `--exclude` can be used multiple times
- Case-sensitive by default
- Follows symlinks (use with caution)