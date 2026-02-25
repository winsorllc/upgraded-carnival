---
name: web-fetch
description: "Fetch and parse web content. Extract readable content, download files, scrape structured data from URLs. No API key required for basic functionality."
---

# Web Fetch Skill

Fetch and parse web content from URLs.

## When to Use

✅ **USE this skill when:**

- "Fetch content from URL"
- "Download file from..."
- "Extract article text from..."
- "Get page title and description"
- "Scrape data from webpage"

## When NOT to Use

❌ **DON'T use this skill when:**

- Interactive browser actions → use browser-tools
- Authenticated sessions → use browser-tools with profile
- JavaScript-heavy SPAs → use browser-tools

## Commands

### Fetch Content

```bash
{baseDir}/fetch.sh "https://example.com"
{baseDir}/fetch.sh "https://example.com" --markdown
{baseDir}/fetch.sh "https://example.com" --json
```

### Extract Article

```bash
{baseDir}/extract.sh "https://example.com/article"
{baseDir}/extract.sh "https://example.com/article" --format markdown
```

### Download File

```bash
{baseDir}/download.sh "https://example.com/file.pdf" --out /tmp/file.pdf
{baseDir}/download.sh "https://example.com/archive.zip" --out /tmp/archive.zip
```

### Get Page Metadata

```bash
{baseDir}/metadata.sh "https://example.com"
{baseDir}/metadata.sh "https://example.com" --json
```

### Extract Links

```bash
{baseDir}/links.sh "https://example.com"
{baseDir}/links.sh "https://example.com" --filter "blog"
```

### Extract Images

```bash
{baseDir}/images.sh "https://example.com"
{baseDir}/images.sh "https://example.com" --download --out /tmp/images/
```

## Options

- `--markdown`: Output as markdown
- `--json`: Output as JSON
- `--text`: Plain text output
- `--timeout N`: Timeout in seconds (default: 30)
- `--user-agent`: Custom user agent
- `--out <path>`: Output file path

## Output Formats

### Plain Text
Extract visible text from HTML, cleaned of scripts and styles.

### Markdown
Convert HTML to markdown with proper formatting.

### JSON
Structured output with title, content, metadata.

## Examples

**Get article content:**
```bash
{baseDir}/extract.sh "https://example.com/blog/post" --markdown
```

**Download all PDFs from page:**
```bash
{baseDir}/links.sh "https://example.com" --filter ".pdf" | xargs -I {} download.sh "{}"
```

**Get page metadata:**
```bash
{baseDir}/metadata.sh "https://example.com" --json
# Output: {"title": "...", "description": "...", "og:image": "..."}
```

## Notes

- Respects robots.txt by default
- Rate limiting: 1 request per second by default
- Use `--user-agent` to set custom user agent
- For JavaScript-heavy pages, use browser-tools instead