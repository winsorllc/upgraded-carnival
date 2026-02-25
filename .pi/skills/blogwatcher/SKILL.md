---
name: blogwatcher
description: "Monitor blogs and RSS/Atom feeds for updates using the blogwatcher CLI."
homepage: https://github.com/Hyaxia/blogwatcher
metadata:
  {
    "thepopebot":
      {
        "emoji": "📰",
        "requires": { "bins": ["blogwatcher"] },
      },
  }
---

# Blog Watcher

Monitor blogs and RSS/Atom feeds for updates.

## Setup

**Installation:**
```bash
go install github.com/Hyaxia/blogwatcher/cmd/blogwatcher@latest
```

## Usage

### Add and Manage Feeds

```bash
# Add a blog/feed
blogwatcher add "My Blog" https://example.com/feed

# List tracked blogs
blogwatcher blogs

# Remove a blog
blogwatcher remove "My Blog"
```

### Check for Updates

```bash
# Scan all feeds for new articles
blogwatcher scan

# List new articles
blogwatcher articles

# Mark article as read
blogwatcher read <article-id>

# Mark all as read
blogwatcher read-all
```

### Options

- Use `blogwatcher <command> --help` for all available flags
- Config is stored in `~/.config/blogwatcher/`

## Example

```bash
blogwatcher add "Tech News" https://techcrunch.com/feed/
blogwatcher scan
blogwatcher articles
```

## Notes

- Supports RSS and Atom feeds
- Stores feed history locally
- Can be used in cron jobs for automated monitoring
