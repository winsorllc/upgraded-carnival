---
name: base64-tool
description: Encode and decode Base64 data including files and strings. Use when converting binary data to text format or decoding Base64-encoded content.
---

# Base64 Tool

Encode and decode Base64 data for strings and files.

## Features

- **encode**: Convert text or files to Base64
- **decode**: Convert Base64 back to original format
- **file support**: Process binary files
- **url-safe**: Optional URL-safe Base64

## Usage

```bash
# Encode text
echo "hello" | ./scripts/base64.js encode
./scripts/base64.js encode --text "hello"

# Encode file
./scripts/base64.js encode --file ./image.png

# Decode
echo "aGVsbG8=" | ./scripts/base64.js decode
./scripts/base64.js decode --text "aGVsbG8="

# URL-safe mode
./scripts/base64.js encode --text "hello" --url-safe
```

## Examples

| Task | Command | Output |
|------|---------|--------|
| Encode string | `base64.js encode --text "hi"` | `aGk=` |
| Decode string | `base64.js decode --text "aGk="` | `hi` |
| Encode file | `base64.js encode --file doc.pdf` | Base64 string |
| Save decoded | `base64.js decode --text "..." --output out.bin` | File |

## Notes

- Handles binary files correctly
- URL-safe mode replaces +/ with -_
- Automatically handles padding