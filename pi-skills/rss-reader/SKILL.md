---
name: rss-reader
description: "Read and parse RSS/Atom feeds. Use when: user wants to subscribe to feeds, get latest articles, or monitor news sources."
---

# RSS Reader Skill

Read and parse RSS/Atom feeds.

## When to Use

- Get latest articles from a feed
- Subscribe to news sources
- Monitor blog updates
- Aggregate multiple feeds

## Feed Information

### Get Feed Details
```bash
# Get feed info
curl -s "https://example.com/feed.xml" | head -20

# Check if RSS or Atom
curl -s "https://example.com/feed.xml" | head -1
```

## Parse Feeds

### Using xmlstarlet
```bash
# Install if needed
# apt install xmlstarlet

# List all items
curl -s "feed.xml" | xmlstarlet sel -t -m "//item" -v "title" -n

# Get latest 5 titles
curl -s "feed.xml" | xmlstarlet sel -t -m "//item[position() <= 5]" -v "title" -n
```

### Using xmllint
```bash
# Parse with xmllint
curl -s "feed.xml" | xmllint --format - 2>/dev/null | head -50
```

### Using Python
```bash
# Simple feed parser
python3 -c "
import xml.etree.ElementTree as ET
import urllib.request

url = 'https://example.com/feed.xml'
data = urllib.request.urlopen(url).read()
root = ET# Find channel.fromstring(data)


for item in root.findall('.//item'):
    title = item.find('title')
    if title is not None:
        print(title.text)
"
```

### Using yq (if available)
```bash
# Convert RSS to YAML
curl -s "feed.xml" | yq -x '.rss.channel.item[]'
```

## Common Commands

### List Feed Items
```bash
# Get all item titles
curl -s "feed.xml" | grep -o '<title>[^<]*</title>' | sed 's/<title>//;s/<\/title>//'

# With descriptions
curl -s "feed.xml" | grep -o '<title>[^<]*</title>\|<description>[^<]*</description>'
```

### Get Latest N Items
```bash
# Latest 10 items with dates
curl -s "feed.xml" | grep -o '<item>.*</item>' | head -10 | \
  while read item; do
    echo "$item" | grep -o '<title>[^<]*</title>'
    echo "$item" | grep -o '<pubDate>[^<]*</pubDate>'
    echo "---"
  done
```

### Extract Links
```bash
# Get all article links
curl -s "feed.xml" | grep -o '<link>[^<]*</link>' | sed 's/<link>//;s/<\/link>//'
```

## Examples

### Hacker News RSS
```bash
curl -s "https://news.ycombinator.com/rss" | \
  grep -o '<title>[^<]*</title>' | sed 's/<title>//;s/<\/title>//' | head -20
```

### TechCrunch
```bash
curl -s "https://techcrunch.com/feed/" | \
  grep -o '<title>[^<]*</title>' | head -15
```

### GitHub Trending
```bash
# GitHub doesn't have RSS, but you can use GitHub's API
curl -s "https://api.github.com/repos?sort=updated&per_page=10" | \
  jq '.[].full_name'
```

## Feed URLs

Common RSS feed patterns:
- WordPress: `/feed/` or `/feed/rss/`
- Medium: `/{username}/feed`
- YouTube: `https://www.youtube.com/feeds/videos.xml?channel_id={id}`
- Twitter: Use Nitter or RSSHub

## Notes

- RSS feeds may have different element names (item vs entry)
- Atom feeds use `<entry>` instead of `<item>`
- Some feeds require user-agent headers
- Consider caching feeds to avoid excessive requests
