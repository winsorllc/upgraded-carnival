---
name: text-tools
description: "Text processing utilities: word count, line count, character encoding, text transformations, grep-like operations. No API key required."
---

# Text Tools Skill

Text processing utilities for common operations.

## When to Use

✅ **USE this skill when:**

- "Count words in this text"
- "Convert text to uppercase/lowercase"
- "Remove duplicate lines"
- "Sort lines alphabetically"
- "Find and replace text"

## When NOT to Use

❌ **DON'T use this skill when:**

- Complex regex operations → use sed/awk directly
- File encoding conversion → use iconv
- Binary file processing → use file-specific tools

## Commands

### Statistics

```bash
{baseDir}/text.sh stats <file>
{baseDir}/text.sh stats --stdin < file.txt
echo "text" | {baseDir}/text.sh stats --stdin
```

### Transform Case

```bash
{baseDir}/text.sh upper <file>
{baseDir}/text.sh lower <file>
{baseDir}/text.sh title <file>
{baseDir}/text.sh sentence <file>
```

### Clean Text

```bash
{baseDir}/text.sh trim <file>
{baseDir}/text.sh dedup <file>
{baseDir}/text.sh strip-blank <file>
{baseDir}/text.sh normalize-spaces <file>
```

### Sort & Unique

```bash
{baseDir}/text.sh sort <file>
{baseDir}/text.sh sort --reverse <file>
{baseDir}/text.sh sort --numeric <file>
{baseDir}/text.sh unique <file>
{baseDir}/text.sh unique --count <file>
```

### Find & Replace

```bash
{baseDir}/text.sh replace <file> "old" "new"
{baseDir}/text.sh replace <file> --regex "pat.*tern" "replacement"
{baseDir}/text.sh replace <file> --ignore-case "OLD" "new"
```

### Encoding

```bash
{baseDir}/text.sh encode base64 <file>
{baseDir}/text.sh encode url <file>
{baseDir}/text.sh encode html <file>
{baseDir}/text.sh encode hex <file>
```

### Decode

```bash
{baseDir}/text.sh decode base64 <file>
{baseDir}/text.sh decode url <file>
{baseDir}/text.sh decode html <file>
{baseDir}/text.sh decode hex <file>
```

## Options

- `--stdin`: Read from stdin instead of file
- `--out <file>`: Write to file instead of stdout
- `--regex`: Use regex pattern for replace
- `--ignore-case`: Case-insensitive matching
- `--reverse`: Reverse sort order
- `--numeric`: Numeric sort
- `--count`: Show count with unique

## Examples

**Count words, lines, characters:**
```bash
{baseDir}/text.sh stats document.txt
# Output: Lines: 100, Words: 500, Chars: 3000
```

**Remove duplicate lines:**
```bash
{baseDir}/text.sh dedup data.txt
```

**Sort and count duplicates:**
```bash
{baseDir}/text.sh unique --count log.txt
# Output:  42 error
#          15 warning
#           5 info
```

**URL decode:**
```bash
{baseDir}/text.sh decode url --stdin <<< "hello%20world"
# Output: hello world
```

## Notes

- All commands can read from stdin with `--stdin`
- Original files are never modified (output to stdout)
- Use `--out` to save to a file