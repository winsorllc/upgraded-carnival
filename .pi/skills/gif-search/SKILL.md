---
name: gif-search
description: Search for GIFs from GIPHY and Tenor APIs. Use when you need to find reaction GIFs, memes, or animated content for messages and communications.
---

# GIF Search

Search for GIFs from GIPHY and Tenor using their public APIs.

## Quick Start

```bash
/job/.pi/skills/gif-search/gif-search.js "cats"
```

## Usage

### Basic Search
```bash
/job/.pi/skills/gif-search/gif-search.js "<query>"
```

### Search with Limit
```bash
job/.pi/skills/gif-search/gif-search.js "<query>" <limit>
```
Default limit is 5.

### Get GIF URL Only
```bash
job/.pi/skills/gif-search/gif-search.js "<query>" 1 url
```

## Configuration

Requires one of these environment variables (check with llm-secrets skill):
- `GIPHY_API_KEY` - GIPHY API key
- `TENOR_API_KEY` - Tenor API key

If both are available, GIPHY is used by default.

## Output Format

Returns JSON array of GIF results:
```json
[
  {
    "id": "gif_id",
    "title": "Funny Cat GIF",
    "url": "https://media.giphy.com/media/xxx/giphy.gif",
    "preview_url": "https://media.giphy.com/media/xxx/200.gif",
    "width": 480,
    "height": 270
  }
]
```

## Examples

```bash
# Search for happy birthday GIFs
/job/.pi/skills/gif-search/gif-search.js "happy birthday"

# Get top 3 results
/job/.pi/skills/gif-search/gif-search.js "celebration" 3

# Get just the URL of the top result
/job/.pi/skills/gif-search/gif-search.js "thumbs up" 1 url
```

## When to Use

- User asks for a GIF, reaction image, or meme
- Need visual content for Discord/Slack messages
- Adding personality to chat responses
- Finding anniversary/birthday/celebration content
