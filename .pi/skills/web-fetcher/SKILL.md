---
name: web-fetcher
description: Fetch and extract web page content. Downloads web pages, follows redirects, and extracts readable article content.
---

# Web Fetcher

Fetch web pages and extract readable content.

## Features

- **fetch**: Download web pages
- **extract**: Extract readable article content
- **headers**: Show HTTP headers
- **follow**: Follow redirects
- **timeout**: Configurable timeouts
- **output**: Save to file
- **user-agent**: Custom user agent

## Usage

```bash
# Fetch and display
./scripts/web-fetch.js --url https://example.com

# Extract readable content
./scripts/web-fetch.js --url https://example.com/blog/post --extract

# Show headers
./scripts/web-fetch.js --url https://example.com --headers

# Save to file
./scripts/web-fetch.js --url https://example.com/api --output data.json

# With custom timeout
./scripts/web-fetch.js --url https://example.com --timeout 30

# Fetch raw HTML
./scripts/web-fetch.js --url https://example.com --raw
```

## Examples

| Task | Command |
|------|---------|
| Simple fetch | `web-fetch.js --url https://api.example.com/data` |
| Extract article | `web-fetch.js --url https://blog.example.com --extract` |
| JSON API | `web-fetch.js --url https://api.example.com --headers --output response.json` |
| Raw HTML | `web-fetch.js --url https://example.com --raw` |
| With timeout | `web-fetch.js --url https://slow.example.com --timeout 60` |

## Notes

- Follows up to 5 redirects by default
- Extract mode uses Mozilla Readability-like heuristics
- Respects response encoding
- Handles gzip/deflate compression
- HTTP/HTTPS supported