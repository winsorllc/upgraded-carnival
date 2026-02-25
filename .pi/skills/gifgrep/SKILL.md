---
name: gifgrep
description: Search GIF providers (GIPHY, Tenor), download results, and extract stills or contact sheets.
metadata: { "popebot": { "emoji": "🧲", "requires": { "bins": ["curl", "jq"] }, "env": ["GIPHY_API_KEY", "TENOR_API_KEY"] } }
---

# gifgrep

Search for GIFs from GIPHY and Tenor APIs, download them, and extract still frames or contact sheets.

## Setup

Get API keys:

- **GIPHY**: https://developers.giphy.com/dashboard/
- **Tenor**: https://tenor.com/gifapi

Configure environment:

```bash
export GIPHY_API_KEY="your-giphy-key"
export TENOR_API_KEY="your-tenor-key"  # Optional, uses demo key if unset
```

## Usage

### Search GIPHY

Search for GIFs on GIPHY:

```bash
curl "https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=hello&limit=5" | jq '.data[].images.original.url'
```

### Search Tenor

Search for GIFs on Tenor:

```bash
curl "https://tenor.googleapis.com/v2/search?key=${TENOR_API_KEY}&q=hello&limit=5" | jq '.results[].media_formats.gif.url'
```

### Download a GIF

Download a GIF from URL:

```bash
curl -O "https://media.giphy.com/media/xxx/giphy.gif"
```

### Extract Still Frame

Extract a single frame from a GIF:

```bash
ffmpeg -i animation.gif -vf "select=eq(n\,0)" -vsync vfr still.png
```

### Extract Frame at Time

Extract a frame at a specific time:

```bash
ffmpeg -i animation.gif -ss 1.5 -frames:v 1 still.png
```

### Create Contact Sheet

Create a grid showing multiple frames:

```bash
ffmpeg -i animation.gif -vf "fps=5,scale=100:-1,tile=3x3" sheet.png
```

## Tips

- Use `--limit` to control number of results
- Filter by rating: `&rating=g` for general audience
- Use `trending` endpoints for popular content
- Cache downloaded GIFs to avoid repeated API calls
