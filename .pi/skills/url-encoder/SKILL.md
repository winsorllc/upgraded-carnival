---
name: url-encoder
description: Encode and decode URL components and query strings. Use when working with URLs that need escaping, building query parameters, or parsing URL components.
---

# URL Encoder

Encode and decode URL components and query strings.

## Features

- **encode**: Convert text to URL-safe format
- **decode**: Convert URL-encoded text back
- **parse**: Extract components from a full URL
- **build**: Construct URLs from parts

## Usage

```bash
# Encode a string
./scripts/url.js encode "hello world"

# Decode a URL
./scripts/url.js decode "hello%20world"

# Parse a full URL
./scripts/url.js parse "https://example.com/path?key=value#hash"

# Build query string
./scripts/url.js query --key value --foo bar
```

## Examples

| Task | Command | Output |
|------|---------|--------|
| Encode | `url.js encode "a+b=c"` | `a%2Bb%3Dc` |
| Decode | `url.js decode "%20"` | ` ` |
| Parse URL | `url.js parse "https://site.com/p?q=1"` | JSON components |
| Query string | `url.js query --a 1 --b 2` | `?a=1&b=2` |

## Notes

- Encodes special characters automatically
- Handles both & and = in query strings
- Supports full RFC 3986 encoding