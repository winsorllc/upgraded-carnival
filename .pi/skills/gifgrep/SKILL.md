---
name: gifgrep
description: Search GIF providers (Tenor/Giphy) with CLI/TUI, download results, and extract stills or sheets. Use when you need to find, preview, and download GIFs.
---

# gifgrep

Use `gifgrep` to search GIF providers (Tenor/Giphy), browse in a TUI, download results, and extract stills or sheets.

## Install

```bash
# macOS
brew install steipete/tap/gifgrep

# Go
go install github.com/steipete/gifgrep/cmd/gifgrep@latest
```

## Quick Start

```bash
# Search and show top 5 results
gifgrep cats --max 5

# Get URLs only
gifgrep cats --format url | head -n 5

# JSON output for scripting
gifgrep search --json cats | jq '.[0].url'

# TUI for interactive browsing
gifgrep tui "office handshake"

# Download a GIF
gifgrep cats --download --max 1 --format url
```

## TUI Mode

```bash
# Interactive TUI to search and browse
gifgrep tui "query"

# Navigate with arrow keys, press Enter to select, q to quit
```

## Extract Stills/Sheets

```bash
# After downloading, extract a still frame
gifgrep extract-still animation.gif --output still.jpg

# Create a sprite sheet
gifgrep sheet animation.gif --columns 4 --output sheet.jpg
```

## Options

| Flag | Description |
|------|-------------|
| `--max N` | Maximum results |
| `--format url` | Output only URLs |
| `--json` | JSON output |
| `--download` | Download to current directory |
| `--output FILE` | Output file path |
| `--provider tenorpq` | Provider selection |

## Use Cases

- Find reaction GIFs for communication
- Download images for presentations
- Extract stills for thumbnails
- Create sprite sheets for game development
