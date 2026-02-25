---
name: blog-watcher
description: Monitor RSS/Atom feeds and blogs for new articles and updates. Use when you need to track industry blogs, news sites, competitor sites, or any website with an RSS/Atom feed. Automatically detects feed URLs and tracks new content.
---

# Blog Watcher

Monitor RSS and Atom feeds for new articles using the blogwatcher CLI tool.

## When to Use

- Track industry blogs for new posts
- Monitor competitor websites with RSS feeds
- Follow news sources
- Watch for updates on specific topics from multiple sources
- Set up ongoing surveillance of content sources

## Installation

Install blogwatcher CLI:

```bash
go install github.com/Hyaxia/blogwatcher/cmd/blogwatcher@latest
```

Or download from: https://github.com/Hyaxia/blogwatcher

## Quick Start

```bash
# Add a blog/feed to track
blogwatcher add "Tech News" https://example.com/feed.xml

# List all tracked blogs
blogwatcher blogs

# Scan all feeds for new articles
blogwatcher scan

# List new articles
blogwatcher articles

# Mark article as read
blogwatcher read <article-id>

# Mark all articles as read
blogwatcher read-all

# Remove a blog
blogwatcher remove "Tech News"
```

## Common Workflows

### Initial Setup
```bash
# Add multiple feeds to track
blogwatcher add "Hacker News" https://news.ycombinator.com/rss
blogwatcher add "TechCrunch" https://techcrunch.com/feed/
blogwatcher add "OpenAI Blog" https://openai.com/blog/rss.xml
```

### Daily Check
```bash
# Scan for new content
blogwatcher scan

# View new articles
blogwatcher articles

# Summarize or analyze specific articles
# (use browser-tools or summarize skill as needed)
```

### Cleanup
```bash
# After reviewing, mark all as read
blogwatcher read-all
```

## Feed Detection

If you don't know the feed URL, try common patterns:
- `/feed`
- `/rss`
- `/atom.xml`
- `/feed.xml`
- `/blog/rss`

Or use online feed discovery tools.

## Output Format

Example output when scanning:

```
$ blogwatcher scan
Scanning 2 blog(s)...

  Tech News
    Source: RSS | Found: 15 | New: 3
  Hacker News
    Source: RSS | Found: 30 | New: 5

Found 8 new article(s) total!
```

Example article listing:

```
$ blogwatcher articles
ID   | Blog        | Title                          | Date
-----|-------------|--------------------------------|------------
1    | Tech News   | New AI Model Released         | 2024-01-15
2    | Tech News   | Industry Analysis Q4          | 2024-01-14
3    | Hacker News | Show HN: New coding tool      | 2024-01-15
```

## Configuration

The blogwatcher stores data in:
- Linux/macOS: `~/.blogwatcher/`
- Windows: `%APPDATA%\blogwatcher\`

Database file: `blogwatcher.db` (SQLite)

## Limitations

- Only supports RSS and Atom feeds (not HTML scraping)
- Requires the target site to have a working feed
- Some sites may have feed limits or restrictions
