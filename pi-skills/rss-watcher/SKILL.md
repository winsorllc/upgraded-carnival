---
name: rss-watcher
description: Monitor RSS/Atom feeds and blogs for new content. Use when: user wants to track updates from blogs, news sites, or any RSS/Atom feed. NOT for: real-time notifications (use webhooks), social media monitoring, or binary content feeds.
---

# RSS Watcher Skill

Track blogs and RSS/Atom feed updates for new articles.

## When to Use

✅ **USE this skill when:**

- "Check for updates on [blog RSS feed]"
- "Monitor this RSS feed for new posts"
- "What are the latest articles from [site]?"
- "Add [blog] to my feed list"

## When NOT to Use

❌ **DON'T use this skill when:**

- Real-time notifications → use webhooks
- Social media → use specialized tools
- Video/podcast feeds → use media-specific tools
- Large-scale feed aggregation → use dedicated RSS services

## Requirements

- `curl` - For fetching feeds
- `xmllint` - For parsing XML (optional, included in most systems)
- `jq` - For JSON processing (optional)

## Installation

```bash
# macOS
brew install curl jq

# Ubuntu/Debian
sudo apt-get install curl jq libxml2-utils
```

## Usage

### Fetch and Display a Feed

```bash
# Basic feed fetch
rss-fetch.sh "https://example.com/feed.xml"

# Show only titles
rss-fetch.sh "https://news.ycombinator.com/rss" --titles

# JSON output
rss-fetch.sh "https://example.com/feed.xml" --json
```

### Common Public Feeds

| Feed | URL |
|------|-----|
| Hacker News | `https://news.ycombinator.com/rss` |
| Reddit (r/technology) | `https://www.reddit.com/r/technology/.rss` |
| BBC World | `http://feeds.bbci.co.uk/news/world/rss.xml` |
| TechCrunch | `https://techcrunch.com/feed/` |
| Ars Technica | `https://feeds.arstechnica.com/arstechnica/index` |

### Parse RSS/Atom from URL

```bash
# Get recent articles
./rss-parse.sh "https://news.ycombinator.com/rss" --limit 10

# Get all items as JSON
./rss-parse.sh "https://example.com/feed.xml" --json
```

## Commands

### rss-fetch.sh

Fetch an RSS/Atom feed and display formatted output.

```bash
./rss-fetch.sh <feed_url> [options]

Options:
  --titles     Show only article titles
  --json       Output as JSON
  --limit N    Limit to N items (default: 10)
```

### rss-parse.sh

Parse and extract data from RSS/Atom feeds.

```bash
./rss-parse.sh <feed_url> [options]

Options:
  --json       Output as JSON
  --limit N    Limit to N items
  --title      Extract only titles
  --link       Extract only links
  --desc       Extract only descriptions
```

## Examples

### Hacker News Top Stories

```bash
curl -s "https://news.ycombinator.com/rss" | grep -o '<title>[^<]*</title>' | head -20
```

### Get Latest TechCrunch Posts

```bash
./rss-parse.sh "https://techcrunch.com/feed/" --limit 5
```

### Monitor Multiple Feeds

```bash
# Check multiple feeds in a loop
for feed in "https://news.ycombinator.com/rss" "https://techcrunch.com/feed/"; do
    echo "=== $feed ==="
    ./rss-parse.sh "$feed" --limit 3
done
```

## Output Formats

### Default (Human Readable)

```
=== Feed Title ===
1. Article Title
   Link: https://example.com/article
   Date: Mon, 01 Jan 2024 12:00:00 GMT
   
2. Another Article
   ...
```

### JSON Output

```json
{
  "title": "Feed Title",
  "items": [
    {
      "title": "Article Title",
      "link": "https://example.com/article",
      "date": "Mon, 01 Jan 2024 12:00:00 GMT",
      "description": "Article description..."
    }
  ]
}
```

## Notes

- Some feeds require User-Agent header to be set
- Rate limit requests to avoid being blocked
- Use `--json` for programmatic consumption
- Many sites block direct feed access; may need to use RSS bridge services
