---
name: link-scraper
description: "Fetch, extract, and summarize content from URLs. Use when: (1) user shares a link and wants a summary, (2) you need to gather information from web pages, (3) researching topics that require reading articles or documentation, (4) extracting code snippets or technical content from websites."
---

# Link Scraper

Fetch and extract content from URLs with automatic summarization. This skill enables the agent to gather information from the web by scraping web pages, extracting main content, and providing concise summaries.

## When to Use

- User shares a URL and asks "what's this about?"
- Researching a topic that requires reading online articles
- Extracting documentation or technical content from websites
- Getting summaries of blog posts, news articles, or papers
- Extracting code snippets or examples from web sources
- Fetching content that the user wants analyzed or discussed

## Setup

No additional installation required. Uses built-in Node.js modules andcheerio for HTML parsing.

If cheerio is not available, falls back to basic regex-based extraction.

## Usage

### Extract a single URL

```bash
node /job/.pi/skills/link-scraper/scrape.js "https://example.com/article"
```

### Extract multiple URLs

```bash
node /job/.pi/skills/link-scraper/scrape.js "https://example.com/page1" "https://example.com/page2"
```

### Get just the title

```bash
node /job/.pi/skills/link-scraper/scrape.js --title "https://example.com"
```

### Get full content (no summary)

```bash
node /job/.pi/skills/link-scraper/scrape.js --full "https://example.com"
```

### Extract specific elements (CSS selector)

```bash
node /job/.pi/skills/link-scraper/scrape.js --selector "article" "https://example.com/blog"
```

## Output Format

The scraper returns JSON with the following structure:

```json
{
  "url": "https://example.com/article",
  "title": "Article Title",
  "description": "Brief description of the page...",
  "content": "Main content extracted from the page...",
  "wordCount": 500,
  "links": ["https://example.com/related1", "https://example.com/related2"],
  "images": ["https://example.com/image1.jpg"],
  "siteName": "Example Site"
}
```

When summarized:

```json
{
  "url": "https://example.com/article",
  "title": "Article Title",
  "summary": "A concise 2-3 sentence summary of the article...",
  "keyPoints": [
    "First key point from the article",
    "Second key point",
    "Third key point"
  ],
  "wordCount": 500,
  "readTime": "2 min"
}
```

## Common Workflows

### Quick URL Summary
```
User: Check out https://github.com/openclaw/openclaw for me
Agent: [Uses link-scraper to fetch and summarize]
```

### Research Task
```
User: Find information about AI agents
Agent: [Uses link-scraper to fetch relevant articles, documentation, etc.]
```

### Code Example Extraction
```
User: How do I use the GitHub API? https://docs.github.com/en/rest
Agent: [Uses link-scraper with --selector to extract code examples]
```

## Integration with Other Skills

- **With memory-agent**: Store researched information for future reference
- **With browser-tools**: Use for JavaScript-rendered pages that need a browser
- **With voice-output**: Announce summaries aloud

## Limitations

- Cannot fetch password-protected pages
- Some sites block scrapers (may need browser-tools as fallback)
- Large pages may be truncated for token limits
- JavaScript-rendered content may not be available (use browser-tools)

## Tips

1. **For articles**: The scraper automatically extracts main article content
2. **For documentation**: Use --selector "pre code" to get code blocks
3. **For lists**: Use --selector "ul li" to extract list items
4. **For speed**: Add --no-summary for quick title/description only
