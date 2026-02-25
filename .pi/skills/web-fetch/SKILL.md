---
name: web-fetch
description: "Fetch web pages and convert HTML to clean plain text. Use when: you need to read articles, documentation, or web content. NOT for: API calls (use http-request)."
metadata: { "openclaw": { "emoji": "🌐", "requires": { "bins": ["curl", "node"] } } }
---

# Web Fetch Skill

Fetch web pages and automatically convert HTML to clean, readable plain text. Unlike http-request which returns raw responses, this skill is optimized for reading human-readable web content.

## When to Use

✅ **USE this skill when:**
- Reading articles, blog posts, documentation
- Fetching content for summarization
- Extracting text from web pages
- Research and information gathering

❌ **DON'T use this skill when:**
- Calling REST APIs → use http-request
- Downloading files → use curl directly
- Scraping at scale → respect robots.txt and rate limits

## Features

- Automatic HTML to text conversion
- Redirect following (up to 10 hops)
- Content-type detection (HTML, JSON, plain text, markdown)
- Response size limiting
- Domain allowlist/blocklist support
- User-Agent rotation

## Usage

### Bash/Curl

```bash
curl -s "https://example.com/article.html" | \
  node /job/.pi/skills/web-fetch/fetch.js --text
```

### Node.js

```javascript
const { fetchWeb } = require('./fetch.js');

const content = await fetchWeb('https://example.com/article', {
  timeout: 10000,
  maxRedirects: 10,
  userAgent: 'Mozilla/5.0 (compatible; PopeBot/1.0)'
});

console.log(content.text);
console.log(content.title);
console.log(content.contentType);
```

### Python

```python
import subprocess
import json

def fetch_url(url):
    result = subprocess.run(
        ['node', '/job/.pi/skills/web-fetch/fetch.js', url],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)

content = fetch_url('https://example.com')
print(content['title'])
print(content['text'][:500])
```

## API

```javascript
async function fetchWeb(url, options = {})
```

**Options:**
- `timeout` - Request timeout in ms (default: 30000)
- `maxRedirects` - Max redirects to follow (default: 10)
- `userAgent` - Custom User-Agent string
- `allowedDomains` - Allowlist of domains
- `blockedDomains` - Blocklist of domains
- `maxContentSize` - Max response size in bytes (default: 1MB)

**Returns:**
```javascript
{
  url: "https://example.com/article",
  contentType: "text/html",
  title: "Article Title",
  text: "Clean plain text content...",
  html: "<html>...</html>",
  statusCode: 200,
  headers: {...},
  timestamp: "2026-02-25T13:30:00Z"
}
```

## Example Outputs

**Article:**
```
Title: Understanding AI Agents
Content:
AI agents are autonomous systems that can perceive their environment,
make decisions, and take actions to achieve goals. Modern AI agents
combine large language models with tools and memory systems...
```

**JSON API (passthrough):**
```
{
  "contentType": "application/json",
  "text": "{\"status\":\"ok\",\"data\":[...]}"
}
```

## Security

- Only http:// and https:// URLs allowed
- Private/internal IPs blocked
- Domain allowlist enforcement
- Response size limits prevent memory exhaustion
- Timeout protection against slow responses
