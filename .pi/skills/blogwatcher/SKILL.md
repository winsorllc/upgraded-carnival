---
name: blogwatcher
description: Monitor blogs and RSS/Atom feeds for updates using feedparser. Track new posts, send notifications, and maintain a database of seen entries.
metadata:
  {
    "thepopebot":
      {
        "emoji": "📰",
        "version": "1.0.0",
        "features": ["rss-monitoring", "atom-support", "update-detection", "notification-integration"]
      }
  }
---

# Blogwatcher — RSS/Atom Feed Monitor

Monitor RSS and Atom feeds for new content and get notified when updates are published.

## Overview

This skill provides:
- **RSS/Atom Parsing**: Support for both RSS 2.0 and Atom feeds
- **Update Detection**: Track seen entries and detect new posts
- **Content Filtering**: Filter by keywords, authors, or categories
- **Notification Integration**: Send updates via Telegram, Discord, Slack, or email
- **Persistent State**: Store seen entries to survive restarts
- **Scheduled Monitoring**: Check feeds on a cron schedule

## Installation

```bash
# Install required dependency
npm install feedparser
```

## Configuration

Create a feeds config file at `config/feeds.json`:

```json
{
  "feeds": [
    {
      "name": "Tech Crunch",
      "url": "https://techcrunch.com/feed/",
      "check_interval": "*/30 * * * *",
      "filters": {
        "keywords": ["AI", "startup", "funding"],
        "min_length": 100
      },
      "notifications": {
        "telegram": true,
        "discord": false
      }
    },
    {
      "name": "Hacker News",
      "url": "https://hnrss.org/frontpage",
      "check_interval": "*/15 * * * *",
      "filters": {
        "keywords": ["show hn", "launch"]
      }
    }
  ]
}
```

## API

### Monitor a Feed
```javascript
const { watchFeed } = require('./blogwatcher');

const updates = await watchFeed({
  url: 'https://example.com/feed.xml',
  name: 'Example Blog'
});

console.log(`Found ${updates.length} new posts`);
for (const post of updates) {
  console.log(`- ${post.title} (${post.link})`);
}
```

### Check All Configured Feeds
```javascript
const { checkAllFeeds } = require('./blogwatcher');

const results = await checkAllFeeds();
// Returns: { feeds: [...], total_updates: N }
```

### Get Feed History
```javascript
const { getFeedHistory } = require('./blogwatcher');

const history = getFeedHistory('tech-crunch');
console.log(`Seen ${history.length} posts from Tech Crunch`);
```

## Output Format

Each update includes:

```javascript
{
  feed_name: "Tech Crunch",
  title: "Startup Raises $10M Series A",
  link: "https://techcrunch.com/2026/...",
  published: "2026-02-25T10:00:00Z",
  author: "John Doe",
  summary: "A startup has raised...",
  categories: ["AI", "Funding"],
  content: "Full article content...",
  detected_at: "2026-02-25T13:00:00Z"
}
```

## Filtering

Filter updates by various criteria:

### Keyword Filter
```javascript
{
  "filters": {
    "keywords": ["AI", "machine learning"],
    "match_any": true  // Match any keyword (default: all)
  }
}
```

### Author Filter
```javascript
{
  "filters": {
    "authors": ["John Doe", "Jane Smith"]
  }
}
```

### Category Filter
```javascript
{
  "filters": {
    "categories": ["Technology", "Startups"]
  }
}
```

### Content Length Filter
```javascript
{
  "filters": {
    "min_length": 200,  // Minimum content length
    "max_length": 5000  // Maximum content length
  }
}
```

## Notifications

### Telegram
```javascript
const { sendTelegramNotification } = require('./blogwatcher');

await sendTelegramNotification({
  chat_id: process.env.TELEGRAM_CHAT_ID,
  updates: [...]
});
```

### Discord Webhook
```javascript
await sendDiscordNotification({
  webhook_url: 'https://discord.com/api/webhooks/...',
  updates: [...]
});
```

## CLI Usage

```bash
# Check all configured feeds
blogwatcher check

# Check a specific feed
blogwatcher check --url https://example.com/feed.xml

# Show feed history
blogwatcher history --feed "tech-crunch"

# Clear seen entries
blogwatcher clear --feed "tech-crunch"

# Test notification
blogwatcher test-notify --feed "tech-crunch"
```

## State Management

Seen entries are stored in `data/blogwatcher-seen.json`:

```json
{
  "tech-crunch": [
    "https://techcrunch.com/2026/02/25/post-1",
    "https://techcrunch.com/2026/02/24/post-2"
  ],
  "hacker-news": [...]
}
```

Maximum entries per feed: 1000 (configurable)

## Best Practices

1. **Respect Rate Limits**: Use appropriate `check_interval` (15-30 minutes typical)
2. **Filter Aggressively**: Only notify on truly relevant content
3. **Monitor Feed Health**: Check for feed errors and broken URLs
4. **Deduplicate**: Use link-based deduplication (not title-based)
5. **Archive Important Posts**: Save critical updates to permanent storage

## Example: Full Monitoring Setup

```javascript
const { watchFeed, sendTelegramNotification } = require('./blogwatcher');

async function monitorFeeds() {
  const feeds = [
    {
      name: 'AI Weekly',
      url: 'https://aiweekly.co/feed/',
      filters: { keywords: ['agent', 'LLM'] }
    },
    {
      name: 'Developer News',
      url: 'https://devnews.io/rss',
      filters: { keywords: ['JavaScript', 'TypeScript'] }
    }
  ];

  for (const feed of feeds) {
    try {
      const updates = await watchFeed(feed);
      
      if (updates.length > 0) {
        console.log(`[${feed.name}] Found ${updates.length} new posts`);
        
        // Send notification
        await sendTelegramNotification({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          message: `📰 ${feed.name} has ${updates.length} new posts:\n\n` +
            updates.slice(0, 5).map(u => `• ${u.title}\n${u.link}`).join('\n')
        });
      }
    } catch (error) {
      console.error(`[${feed.name}] Error: ${error.message}`);
    }
  }
}

// Run every 30 minutes
setInterval(monitorFeeds, 30 * 60 * 1000);
```

## Error Handling

The skill handles common feed errors:

- **HTTP 404**: Feed URL not found - mark as inactive
- **HTTP 429**: Rate limited - backoff and retry later
- **Invalid XML**: Feed format error - log and skip
- **Timeout**: Feed too slow - skip this check
