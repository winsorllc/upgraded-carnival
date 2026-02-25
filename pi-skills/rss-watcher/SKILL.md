---
name: rss-watcher
description: Monitor RSS/Atom feeds for updates using curl and xmllint. Use when: user wants to track blog posts, news feeds, YouTube channels, podcasts, or any RSS/Atom source. No API key needed.
metadata:
  openclaw:
    emoji: "📰"
    requires:
      bins:
        - curl
        - xmllint
---

# RSS Watcher Skill

Track RSS and Atom feed updates using command-line tools.

## When to Use

✅ **USE this skill when:**

- Track blogs, news sites, YouTube channels
- Monitor podcast feeds
- Follow GitHub release feeds
- Watch any RSS/Atom endpoint

## Installation

No additional installation required - uses standard Unix tools:
- `curl` - HTTP requests
- `xmllint` - XML parsing (from libxml2)

## Commands

### Fetch Feed

```bash
# Basic feed fetch
curl -s "https://example.com/feed.xml"

# Fetch with headers (useful for debugging)
curl -sI "https://example.com/feed.xml"

# Save feed to file
curl -s "https://example.com/feed.xml" -o feed.xml
```

### Parse Feed Items

```bash
# Extract titles (RSS 2.0)
xmllint --xpath "//item/title/text()" feed.xml 2>/dev/null

# Extract titles (Atom)
xmllint --xpath "//entry/title/text()" feed.xml 2>/dev/null

# Extract links (RSS 2.0)
xmllint --xpath "//item/link/text()" feed.xml 2>/dev/null

# Extract links (Atom)
xmllint --xpath "//entry/link/@href" feed.xml 2>/dev/null

# Extract publication dates
xmllint --xpath "//item/pubDate/text()" feed.xml 2>/dev/null

# Extract first 5 titles
xmllint --xpath "//item[position() <= 5]/title/text()" feed.xml 2>/dev/null
```

### Common Feeds

```bash
# GitHub releases
curl -s "https://github.com/stephengpope/thepopebot/releases.atom"

# Hacker News
curl -s "https://news.ycombinator.com/rss"

# YouTube channel (as RSS)
curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxx"

# Reddit (via RSS)
curl -s "https://www.reddit.com/r/technology/.rss"
```

### Check for New Items

```bash
# Get latest item title
curl -s "https://example.com/feed.xml" | xmllint --xpath "//item[1]/title/text()" - 2>/dev/null

# Compare saved state
curl -s "https://example.com/feed.xml" -o /tmp/feed_new.xml
diff /tmp/feed_old.xml /tmp/feed_new.xml
mv /tmp/feed_new.xml /tmp/feed_old.xml
```

### Full Example: Monitor Feed

```bash
#!/bin/bash
FEED_URL="https://example.com/feed.xml"
STATE_FILE="/tmp/rss_state.txt"

# Fetch latest titles
TITLES=$(curl -s "$FEED_URL" | xmllint --xpath "//item/title/text()" - 2>/dev/null)

# Check against last seen
LAST_SEEN=$(cat "$STATE_FILE" 2>/dev/null)

if [ "$TITLES" != "$LAST_SEEN" ]; then
  echo "New items found:"
  echo "$TITLES"
  echo "$TITLES" > "$STATE_FILE"
else
  echo "No new items"
fi
```

## Notes

- Rate limit requests - add delays between fetches
- Some sites may block curl; try adding User-Agent header
- Not all feeds are well-formed; handle parse errors gracefully
- Use `xmllint --html` for HTML-parsed feeds
