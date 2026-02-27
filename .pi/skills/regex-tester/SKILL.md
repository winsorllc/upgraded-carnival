---
name: regex-tester
description: Test and validate regular expressions with real-time matching, groups extraction, and replace functionality. Inspired by ZeroClaw's pattern matching and OpenClaw's validation tools.
---

# Regex Tester

Test regular expressions with syntax validation, match testing, group extraction, and replacement.

## Features

- **Validate**: Check regex syntax validity
- **Test**: Match patterns against text
- **Groups**: Extract capture groups
- **Replace**: Find and replace with regex
- **Explain**: Get human-readable pattern explanation
- **Flags**: Support for common regex flags (global, case-insensitive, multiline, dotall)

## Usage

```bash
# Test pattern matching
./scripts/regex.js --pattern "hello.*world" --text "hello there world"

# Extract groups
./scripts/regex.js --pattern "(\d{3})-(\d{3})-(\d{4})" --text "555-123-4567" --groups

# Replace text
./scripts/regex.js --pattern "\b(\w+)\b" --text "hello world" --replace "[$1]" --global

# Validate regex syntax (no text needed)
./scripts/regex.js --pattern "[a-z+" --validate

# Explain pattern
./scripts/regex.js --pattern "^(\d+)\.(\d+)\.(\d+)$" --explain

# With flags
./scripts/regex.js --pattern "HELLO" --text "hello" --flags "i"  # case-insensitive
```

## Flags

| Flag | Description |
|------|-------------|
| `g` | Global (find all matches) |
| `i` | Case-insensitive |
| `m` | Multiline (^ and $ match start/end of lines) |
| `s` | Dotall (dot matches newlines) |

## Examples

| Task | Command |
|------|---------|
| Email validation | `./scripts/regex.js --pattern "^[\w.-]+@[\w.-]+\.\w+$" --text "test@example.com"` |
| Phone extraction | `./scripts/regex.js --pattern "\d{3}-\d{3}-\d{4}" --text "Call 555-123-4567" --global` |
| URL matching | `./scripts/regex.js --pattern "https?://[^\s]+" --text "Visit https://example.com"` |
| Date parsing | `./scripts/regex.js --pattern "(\d{4})-(\d{2})-(\d{2})" --text "2024-03-15" --groups` |
| Code search | `./scripts/regex.js --pattern "function\s+(\w+)" --text "function hello() {}" --flags "g"` |

## Output Format

Valid match:
```json
{
  "valid": true,
  "matches": 2,
  "results": [
    { "match": "hello world", "index": 0, "groups": [] },
    { "match": "hello universe", "index": 12, "groups": [] }
  ]
}
```

No match:
```json
{
  "valid": true,
  "matches": 0,
  "message": "No matches found"
}
```

Invalid pattern:
```json
{
  "valid": false,
  "error": "Unterminated character class",
  "position": 5
}
```

## Pattern Reference

- `.` - Any character (except newline)
- `\d` - Digit (0-9)
- `\w` - Word character (letters, digits, underscore)
- `\s` - Whitespace
- `[]` - Character class
- `[^]` - Negated character class
- `*` - Zero or more
- `+` - One or more
- `?` - Zero or one
- `^` - Start of string
- `$` - End of string
- `()` - Capture group
