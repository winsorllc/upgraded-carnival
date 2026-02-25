---
name: gifgrep
description: Search GIF providers (Tenor/Giphy) with CLI, browse in TUI, download results, and extract stills or sheets. Use when you need to find, preview, or extract frames from animated GIFs.
metadata:
  {
    "requires": { "bins": ["gifgrep"] },
    "homepage": "https://gifgrep.com"
  }
---

# gifgrep

Search GIF providers (Tenor/Giphy), browse in a TUI, download results, and extract stills or sheets.

## Trigger

Use this skill when the user asks to:
- Find/search for GIFs
- Download GIFs
- Extract still frames from GIFs
- Create sprite sheets from GIF animations

## Quick Start

```bash
# Search for GIFs
gifgrep cats --max 5

# Get URLs only
gifgrep cats --format url | head -n 5

# JSON output for scripting
gifgrep search --json cats | jq '.[0].url'

# TUI browser
gifgrep tui "office handshake"

# Download to ~/Downloads
gifgrep cats --download --max 1 --format url
```

## TUI Mode

```bash
# Interactive TUI browser
gifgrep tui "query"
```

TUI supports keyboard navigation and preview of GIFs.

## Download + Reveal

```bash
# Download to ~/Downloads
gifgrep cats --download --max 1 --format url

# Open in Finder/Explorer after download
gifgrep cats --download --reveal
```

## Extract Stills and Sheets

### Extract a single still frame

```bash
gifgrep still ./clip.gif --at 1.5s -o still.png
```

### Extract a grid of frames (sprite sheet)

```bash
gifgrep sheet ./clip.gif --frames 9 --cols 3 -o sheet.png
```

Sheets create a single PNG grid of sampled frames - great for quick review, documentation, PRs, and chat.

### Tuning options

| Option | Description |
|--------|-------------|
| `--frames` | Number of frames to sample |
| `--cols` | Grid column count |
| `--padding` | Space between frames |

## Providers

| Provider | API Key Required | Default |
|----------|-----------------|---------|
| Tenor | Optional (demo key used if unset) | Default |
| Giphy | Yes (`GIPHY_API_KEY`) | Optional |

```bash
# Use specific provider
gifgrep cats --source tenor
gifgrep cats --source giphy
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GIPHY_API_KEY` | API key for Giphy provider |
| `TENOR_API_KEY` | API key for Tenor (optional) |
| `GIFGREP_SOFTWARE_ANIM=1` | Force software animation |
| `GIFGREP_CELL_ASPECT=0.5` | Tweak preview geometry |

## Output Formats

| Format | Description |
|--------|-------------|
| `url` | Direct URL to GIF |
| `json` | Structured JSON with id, title, url, preview_url, tags, width, height |
| `markdown` | Markdown with preview URL |

## Use Cases

1. **Find reaction GIFs** - Search for emotional reactions
2. **Extract documentation frames** - Get stills from GIF tutorials
3. **Create sprite sheets** - Grid overview of animation steps
4. **Quick preview** - TUI for browsing without downloading
5. **Script automation** - JSON output for bot integration
