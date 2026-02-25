---
name: html-entities
description: Encode and decode HTML entities. Use when working with HTML content that needs special character escaping or unescaping.
---

# HTML Entities

Encode and decode HTML special characters.

## Features

- **encode**: Convert special characters to HTML entities
- **decode**: Convert HTML entities back to characters
- **named entities**: &amp;, &lt;, &gt;, &quot;, etc.
- **numeric entities**: &#60;, &#x3C;, etc.

## Common Entities

| Character | Named | Decimal | Hex |
|-----------|-------|---------|-----|
| & | &amp; | &#38; | &#x26; |
| < | &lt; | &#60; | &#x3C; |
| > | &gt; | &#62; | &#x3E; |
| " | &quot; | &#34; | &#x22; |
| ' | &apos; | &#39; | &#x27; |

## Usage

```bash
# Encode text
./scripts/html.js encode "5 < 10 & 10 > 5"

# Decode text
./scripts/html.js decode "&lt;div&gt;Hello&lt;/div&gt;"

# Decode numeric
./scripts/html.js decode "&#60;tag&#62;"
```

## Options

- `--full`: Use full entity set (including extended characters)
- `--numeric`: Prefer numeric entities over named
- `--hex`: Use hexadecimal entities