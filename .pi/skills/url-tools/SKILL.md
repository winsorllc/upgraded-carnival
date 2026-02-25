---
name: url-tools
description: "URL shortening and expansion tools. Create short URLs, expand shortened URLs to see destination, validate URLs. No API key required for basic functionality."
---

# URL Tools Skill

Shorten and expand URLs using various services.

## When to Use

✅ **USE this skill when:**

- "Shorten this URL"
- "Expand this short link"
- "What does this short URL redirect to?"
- "Create a short link for..."

## When NOT to Use

❌ **DON'T use this skill when:**

- Downloading files from URLs → use curl/wget
- Parsing URL components → use programming tools
- Web scraping → use browser-tools

## Commands

### Shorten URL

```bash
{baseDir}/shorten.sh "https://example.com/very/long/url/here"
{baseDir}/shorten.sh "https://example.com" --service=isgd
```

### Expand URL

```bash
{baseDir}/expand.sh "https://is.gd/abc123"
{baseDir}/expand.sh "https://bit.ly/example"
```

### Validate URL

```bash
{baseDir}/validate.sh "https://example.com"
{baseDir}/validate.sh "not-a-url"
```

### Parse URL

```bash
{baseDir}/parse.sh "https://user:pass@example.com:8080/path?q=1#frag"
```

## URL Shortening Services

| Service | Notes |
|---------|-------|
| is.gd | Free, no API key |
| v.gd | Free, customizable slug |
| tinyurl | Free |
| cleanuri | Free |

## Output Format

### Shorten
```
Original: https://example.com/very/long/url
Short: https://is.gd/abc123
```

### Expand
```
Short URL: https://is.gd/abc123
Destination: https://example.com/very/long/url
Status: 301 Redirect
```

### Parse
```
Scheme: https
Host: example.com
Port: 8080
Path: /path
Query: q=1
Fragment: frag
User: user
Password: pass
```

## Notes

- is.gd and v.gd are free services with no API key required
- Some services may have rate limits
- URL expansion follows redirects to find final destination
- For custom URL shortening with analytics, use paid services