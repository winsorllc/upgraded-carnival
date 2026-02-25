---
name: code-format
description: "Format and validate code in various languages. Python, JavaScript, JSON, YAML, Markdown, and more. Uses standard formatters when available."
---

# Code Format Skill

Format and validate code in various languages.

## When to Use

✅ **USE this skill when:**

- "Format this Python code"
- "Validate this JSON"
- "Pretty print this JavaScript"
- "Format this Markdown"

## When NOT to Use

❌ **DON'T use this skill when:**

- Linting code → use linters directly
- Compiling code → use compilers
- Minifying code → use minifiers

## Supported Languages

| Language | Formatter | Notes |
|----------|-----------|-------|
| Python | black, autopep8 | Falls back to auto-format |
| JavaScript | prettier | If installed |
| TypeScript | prettier | If installed |
| JSON | python | Built-in |
| YAML | pyyaml | If installed |
| Markdown | prettier | If installed |
| HTML | prettier | If installed |
| CSS | prettier | If installed |
| SQL | sqlparse | If installed |
| Shell | shfmt | If installed |

## Commands

### Format Code

```bash
{baseDir}/format-code.sh <file>
{baseDir}/format-code.sh <file> --language python
{baseDir}/format-code.sh --stdin --language js < code.js
```

### Validate Syntax

```bash
{baseDir}/validate-code.sh <file>
{baseDir}/validate-code.sh <file> --language python
{baseDir}/validate-code.sh --stdin --language json < data.json
```

### List Languages

```bash
{baseDir}/format-code.sh --languages
```

## Options

- `--language <lang>`: Specify language (auto-detect from extension)
- `--stdin`: Read from stdin
- `--out <file>`: Write to file (default: stdout)
- `--check`: Check if formatting needed (don't modify)
- `--diff`: Show diff instead of formatted output
- `--indent <n>`: Indentation size (default: language-specific)

## Examples

**Format Python file:**
```bash
{baseDir}/format-code.py script.py
```

**Format JSON from stdin:**
```bash
cat data.json | {baseDir}/format-code.sh --stdin --language json
```

**Check if formatting needed:**
```bash
{baseDir}/format-code.sh script.py --check
# Exit 0 if formatted, 1 if needs formatting
```

**Format with custom indent:**
```bash
{baseDir}/format-code.sh config.json --indent 4
```

**Validate code:**
```bash
{baseDir}/validate-code.sh script.py
# Output: ✓ Valid Python syntax
```

## Notes

- Uses standard formatters when available
- Falls back to built-in formatters
- Does not modify files by default
- Use `--out` to save to same or different file