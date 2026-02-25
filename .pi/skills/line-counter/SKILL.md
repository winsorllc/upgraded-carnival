---
name: line-counter
description: Count lines of code by file type, detect blank lines, comments, and generate statistics for projects. Inspired by ZeroClaw's code analysis and OpenClaw's observability tools.
---

# Line Counter

Count lines of code with detailed breakdown by file type.

## Features

- **Count Lines**: Total, code, blank, and comment lines
- **By Language**: Detect based on file extension
- **Recursive**: Scan entire directories
- **Exclude**: Skip patterns like node_modules, .git
- **Summary**: Project-level statistics
- **Formats**: JSON, table, or simple output

## Usage

```bash
# Count single file
./scripts/lines.js count myfile.js

# Count directory
./scripts/lines.js count ./src

# With exclusions
./scripts/lines.js count . --exclude node_modules --exclude dist

# JSON output
./scripts/lines.js count . --format json

# Summary only
./scripts/lines.js count . --summary
```

## Examples

| Task | Command |
|------|---------|
| Single file | `./scripts/lines.js count script.js` |
| Directory | `./scripts/lines.js count ./src` |
| With excludes | `./scripts/lines.js count . --exclude "*.test.js"` |
| JSON output | `./scripts/lines.js count . --format json` |

## Supported Languages

| Extension | Language | Comment markers |
|-----------|----------|-----------------|
| .js/.ts | JavaScript/TypeScript | //, /* */ |
| .py | Python | #, """ |
| .java | Java | //, /* */ |
| .c/.cpp/.h | C/C++ | //, /* */ |
| .go | Go | //, /* */ |
| .rb | Ruby | #, =begin |
| .sh | Shell | # |
| .md | Markdown | N/A |

## Output Format

```json
{
  "total_files": 15,
  "total_lines": 1250,
  "code_lines": 980,
  "blank_lines": 150,
  "comment_lines": 120,
  "by_language": {
    "javascript": {
      "files": 8,
      "total": 850,
      "code": 680,
      "blank": 100,
      "comment": 70
    }
  }
}
```

## Notes

- Comment detection is basic (may miss some patterns)
- Binary files are skipped
- Symlinks are followed by default
- Hidden files (starting with .) are excluded unless specified
