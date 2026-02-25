---
name: rss-monitor
description: Monitor RSS/Atom feeds and blogs for new content using feedparser.
metadata:
  { "openclaw": { "emoji": "📰", "requires": { "bins": ["node"] }, "install": [{ "id": "npm", "kind": "npm", "package": "feedparser", "label": "Install feedparser" }] } }
---

# RSS Monitor

Track RSS and Atom feeds for new content.

## Installation

```bash
npm install feedparser
```

## Quick Start

### Basic Feed Fetch
```javascript
const { fetchFeed } = require('./rss-monitor');

const items = await fetchFeed('https://example.com/feed.xml');
console.log(items); // Array of feed items
```

### Track Multiple Feeds
```javascript
const { trackFeeds } = require('./rss-monitor');

const feeds = [
  { url: 'https://blog1.com/rss', name: 'Blog 1' },
  { url: 'https://blog2.com/atom.xml', name: 'Blog 2' }
];

const results = await trackFeeds(feeds);
console.log(results);
```

### Check for New Items
```javascript
const { checkForNewItems } = require('./rss-monitor');

const lastCheck = new Date('2024-01-01T00:00:00Z');
const newItems = await checkForNewItems('https://example.com/feed.xml', lastCheck);
console.log(`Found ${newItems.length} new items`);
```

## Common Operations

### Fetch Latest Items
```javascript
const items = await fetchFeed('https://xkcd.com/atom.xml', { limit: 10 });
```

### Get Feed Metadata
```javascript
const feed = await fetchFeedMetadata('https://example.com/feed.xml');
console.log(feed.title, feed.link, feed.description);
```

### Parse Feed with Options
```javascript
const items = await fetchFeed('https://example.com/feed.xml', {
  limit: 20,
  includeContent: false,
  timeout: 5000
});
```

### Compare with Previous Check
```javascript
const newItems = await checkForNewItems(
  'https://example.com/feed.xml',
  lastCheckDate,
  { limit: 50 }
);
```

## Output Format

Each feed item contains:
- `title` - Item title
- `link` - Item URL
- `description` - Item summary/description
- `pubDate` - Publication date (ISO string)
- `author` - Author name (if available)
- `content` - Full content (if available and includeContent: true)
- `categories` - Tags/categories
- `enclosures` - Media attachments (images, audio, video)

## Examples

### RSS Feed Reader
```javascript
const rssMonitor = require('./rss-monitor');

async function readFeeds() {
  const feeds = [
    'https://xkcd.com/atom.xml',
    'https://blog.github.com/feed/',
    'https://news.ycombinator.com/rss'
  ];
  
  for (const feedUrl of feeds) {
    try {
      const items = await rssMonitor.fetchFeed(feedUrl, { limit: 5 });
      console.log(`\n📰 ${feedUrl}`);
      items.forEach(item => {
        console.log(`  • ${item.title}`);
        console.log(`    ${item.link}`);
      });
    } catch (err) {
      console.error(`Failed to fetch ${feedUrl}:`, err.message);
    }
  }
}
```

### Monitor for New Content
```javascript
const rssMonitor = require('./rss-monitor');
const fs = require('fs').promises;

const STATE_FILE = './last-check.json';

async function monitorFeeds() {
  // Load last check times
  let lastChecks = {};
  try {
    lastChecks = JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
  } catch (e) {
    // No state file yet
  }
  
  const feeds = [
    { url: 'https://xkcd.com/atom.xml', name: 'XKCD' },
    { url: 'https://blog.github.com/feed/', name: 'GitHub Blog' }
  ];
  
  for (const feed of feeds) {
    const lastCheck = lastChecks[feed.url] ? new Date(lastChecks[feed.url]) : null;
    const newItems = await rssMonitor.checkForNewItems(feed.url, lastCheck);
    
    if (newItems.length > 0) {
      console.log(`\n🆕 ${feed.name}: ${newItems.length} new items`);
      newItems.forEach(item => {
        console.log(`  • ${item.title}`);
      });
    }
    
    lastChecks[feed.url] = new Date().toISOString();
  }
  
  await fs.writeFile(STATE_FILE, JSON.stringify(lastChecks, null, 2));
}
```

## Notes

- Supports both RSS 2.0 and Atom 1.0 formats
- Automatically detects feed format
- Handles redirects and common feed variations
- Default timeout: 10 seconds
- Items sorted by publication date (newest first)
