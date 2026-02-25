---
name: base64-tools
description: "Base64 encoding and decoding for files and strings. URL-safe variant supported. No API key required."
---

# Base64 Tools Skill

Encode and decode data using Base64 encoding.

## When to Use

✅ **USE this skill when:**

- "Encode this to base64"
- "Decode this base64"
- "Convert file to base64"
- "Decode base64 to file"
- "URL-safe base64 encoding"

## When NOT to Use

❌ **DON'T use this skill when:**

- Cryptographic operations → use encryption tools
- Hash/generate signature → use hash-tools
- Compress data → use compression tools

## Commands

### Encode String

```bash
{baseDir}/base64.sh encode "Hello World"
{baseDir}/base64.sh encode "Hello World" --url-safe
{baseDir}/base64.sh encode --string "Hello World"
```

### Decode String

```bash
{baseDir}/base64.sh decode "SGVsbG8gV29ybGQ="
{baseDir}/base64.sh decode "SGVsbG8gV29ybGQ" --url-safe
{baseDir}/base64.sh decode --string "SGVsbG8gV29ybGQ="
```

### Encode File

```bash
{baseDir}/base64.sh encode --file image.png
{baseDir}/base64.sh encode --file document.pdf --output encoded.txt
```

### Decode to File

```bash
{baseDir}/base64.sh decode --string "SGVsbG8gV29ybGQ=" --output output.txt
{baseDir}/base64.sh decode --file encoded.txt --output original.png
```

### From Stdin

```bash
echo "Hello World" | {baseDir}/base64.sh encode
cat file.txt | {baseDir}/base64.sh encode --output encoded.txt
```

### Check if Valid Base64

```bash
{baseDir}/base64.sh validate "SGVsbG8gV29ybGQ="
{baseDir}/base64.sh validate "not-valid-base64!"
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url-safe` | Use URL-safe variant (-_ instead of +/) | false |
| `--file FILE` | Read from/write to file | stdin/stdout |
| `--string STR` | Direct string input | None |
| `--output FILE` | Output to file | stdout |
| `--wrap COLS` | Wrap encoded output at N columns | 76 |
| `--no-wrap` | Don't wrap encoded output | false |
| `--ignore-garbage` | Ignore non-base64 characters | false |
| `--validate` | Just validate, don't decode | false |
| `--json` | Output as JSON | false |

## URL-Safe Base64

Standard Base64 uses `+` and `/` which aren't URL-safe. The URL-safe variant replaces:
- `+` → `-`
- `/` → `_`
- Removes padding `=`

```bash
# Standard: SGVsbG8gV29ybGQ/==
# URL-safe: SGVsbG8gV29ybGQ_
{baseDir}/base64.sh encode "Hello?" --url-safe
```

## Examples

**Encode a string:**
```bash
{baseDir}/base64.sh encode "Hello World"
# SGVsbG8gV29ybGQ=
```

**Decode a string:**
```bash
{baseDir}/base64.sh decode "SGVsbG8gV29ybGQ="
# Hello World
```

**Encode a file:**
```bash
{baseDir}/base64.sh encode --file image.png
# iVBORw0KGgoAAAANSUhEUgAA...
```

**Decode to file:**
```bash
{baseDir}/base64.sh decode --file encoded.txt --output image.png
```

**URL-safe encoding:**
```bash
{baseDir}/base64.sh encode "user@example.com" --url-safe
# dXNlckBleGFtcGxlLmNvbQ
```

**Validate base64:**
```bash
{baseDir}/base64.sh validate "SGVsbG8gV29ybGQ="
# Valid base64
```

**JSON output:**
```bash
{baseDir}/base64.sh encode "Hello" --json
# {"input": "Hello", "encoded": "SGVsbG8="}
```

**Encode from stdin:**
```bash
echo "secret data" | {baseDir}/base64.sh encode
# c2VjcmV0IGRhdGE=
```

## Use Cases

**Embed images in HTML/CSS:**
```bash
ENCODED=$({baseDir}/base64.sh encode --file logo.png --no-wrap)
echo "background: url('data:image/png;base64,$ENCODED');"
```

**Store binary in JSON:**
```bash
# Encode binary file to base64, store in JSON field
{baseDir}/base64.sh encode --file binary.dat --json
```

**API authentication:**
```bash
# Create Basic Auth header
CREDS="user:pass"
ENCODED=$({baseDir}/base64.sh encode "$CREDS")
echo "Authorization: Basic $ENCODED"
```

**Data URLs:**
```bash
# Create data URL for image
{baseDir}/base64.sh encode --file icon.svg --output - | \
  sed 's/^/data:image\/svg+xml;base64,/'
```

## Exit Codes

- 0: Success
- 1: Invalid base64 input (decode mode)
- 2: File not found
- 3: Permission denied

## Notes

- Uses built-in `base64` command (available on most systems)
- Wraps at 76 columns by default (MIME standard)
- Use `--no-wrap` for single-line output
- Binary files are handled correctly
- URL-safe encoding follows RFC 4648