---
name: feed-watcher
description: Monitor RSS/Atom feeds, blogs, and websites for new content. Automatically detect changes, summarize updates, and send notifications. Use when you need to track news sources, competitor blogs, GitHub releases, or any regularly-updated web content.
homepage: https://github.com/stephengpope/thepopebot
metadata:
  {
    "popebot":
      {
        "emoji": "📡",
        "requires": { "npm": ["node-fetch", "xml2js"] },
        "install":
          [
            {
              "id": "npm",
              "kind": "npm",
              "packages": ["node-fetch", "xml2js"],
              "label": "Install feed-watcher dependencies",
            },
          ],
      },
  }
---

# Feed Watcher Skill

## Overview

This skill enables autonomous monitoring of RSS/Atom feeds, blogs, and websites for new content. Perfect for:
- Tracking industry news and competitor updates
- Monitoring GitHub repository releases
- Watching blog posts from thought leaders
- Detecting changes to important web pages
- Automating content curation and summarization

## Installation

```bash
cd /job
npm install node-fetch xml2js
ln -s ../../pi-skills/feed-watcher .pi/skills/feed-watcher
```

## Configuration

Create a feeds configuration file at `/job/data/feeds.json`:

```json
{
  "feeds": [
    {
      "id": "techcrunch",
      "name": "TechCrunch",
      "url": "https://techcrunch.com/feed/",
      "type": "rss",
      "checkInterval": "hourly",
      "notifyNew": true,
      "categories": ["ai", "startups"]
    },
    {
      "id": "github-releases",
      "name": "GitHub Releases",
      "url": "https://github.com/stephengpope/thepopebot/releases.atom",
      "type": "atom",
      "checkInterval": "daily",
      "notifyNew": true
    }
  ],
  "storage": {
    "seenItemsPath": "/job/data/feed-states/",
    "maxItemsPerFeed": 100
  }
}
```

## Commands

### Check a single feed
```bash
node pi-skills/feed-watcher/check-feed.js --feed techcrunch
```

### Check all configured feeds
```bash
node pi-skills/feed-watcher/check-all-feeds.js
```

### Summarize new items
```bash
node pi-skills/feed-watcher/summarize.js --feed techcrunch --last 5
```

### List feed status
```bash
node pi-skills/feed-watcher/list-feeds.js
```

## API Functions

### `fetchFeed(url, type)`
Fetch and parse an RSS or Atom feed.

### `detectNewItems(feedId, items)`
Compare fetched items against stored state to detect new content.

### `summarizeItems(items, context)`
Use LLM to summarize new items with relevant context.

### `notifyUser(summary, items)`
Send notification via email or push notification.

## Best Practices

1. **Respect rate limits**: Use appropriate check intervals (hourly, daily, weekly)
2. **Filter noise**: Use category filters to only track relevant content
3. **Store state efficiently**: Only store item IDs and timestamps, not full content
4. **Summarize intelligently**: Use LLM to extract key insights, not just titles
5. **Batch notifications**: Collect multiple items before notifying to reduce noise

## Example Workflow

```javascript
// 1. Configure feeds in /job/data/feeds.json
// 2. Set up cron job in config/CRONS.json:
{
  "name": "Morning Feed Check",
  "schedule": "0 8 * * *",
  "type": "command",
  "command": "node pi-skills/feed-watcher/check-all-feeds.js",
  "enabled": true
}
// 3. Agent runs daily, detects new items, summarizes, and emails report
```

## Output Format

New items are stored as JSON:
```json
{
  "feedId": "techcrunch",
  "checkTime": "2026-02-25T13:54:52Z",
  "newItems": [
    {
      "id": "https://techcrunch.com/2026/02/25/ai-startup-raises-100m/",
      "title": "AI Startup Raises $100M Series B",
      "published": "2026-02-25T12:00:00Z",
      "summary": "San Francisco-based AI company secured...",
      "link": "https://techcrunch.com/2026/02/25/ai-startup-raises-100m/"
    }
  ],
  "summary": "1 new article found in AI/Startups categories..."
}
```
