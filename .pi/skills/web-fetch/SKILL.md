---
name: web-fetch
description: Fetch web pages and convert HTML to readable plain text. Automatically handles HTML parsing, Markdown conversion, and content extraction.
---

# Web Fetch

Fetch web pages and convert HTML to clean, readable plain text. Ideal for extracting article content, documentation, or any web page content for LLM consumption.

## Setup

No additional setup required. Uses Node.js built-in modules.

## Usage

### Fetch a Web Page

```bash
{baseDir}/web-fetch.js https://example.com
```

### Fetch and Limit Response Size

```bash
{baseDir}/web-fetch.js https://example.com --max-size 50000
```

### Fetch as Markdown

```bash
{baseDir}/web-fetch.js https://example.com --markdown
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--max-size` | Maximum response size in bytes | 1048576 (1MB) |
| `--markdown` | Output as Markdown instead of plain text | false |
| `--timeout` | Request timeout in seconds | 30 |

## Features

- **HTML to Text**: Converts HTML to clean plain text
- **Markdown Support**: Optionally output as Markdown
- **Smart Parsing**: Handles malformed HTML gracefully
- **Size Limits**: Prevents downloading excessively large pages
- **Follows Redirects**: Automatically follows up to 10 redirects

## Response Format

```json
{
  "url": "https://example.com",
  "status": 200,
  "contentType": "text/html",
  "text": "Extracted plain text content...",
  "markdown": "# Example Domain\n\nThis domain is for use...",
  "title": "Example Domain"
}
```

## When to Use

- Extracting article content for summarization
- Fetching documentation pages
- Reading blog posts
- Scraping web content that requires JavaScript (use browser-tools for JS-heavy pages)
