---
name: goplaces
description: Query Google Places API (New) via CLI for text search, place details, and reviews. Use when you need to find businesses, restaurants, points of interest with location data.
---

# goplaces

Google Places API (New) CLI - human output by default, `--json` for scripts.

## Install

```bash
brew install steipete/tap/goplaces
```

## Config

```bash
export GOOGLE_PLACES_API_KEY="your-api-key"
# Optional: GOOGLE_PLACES_BASE_URL for testing
```

## Quick Start

### Search Places

```bash
# Search for coffee shops
goplaces search "coffee" --open-now --min-rating 4 --limit 5

# Search with location bias
goplaces search "pizza" --lat 40.8 --lng -73.9 --radius-m 3000

# Search with pagination
goplaces search "pizza" --page-token "NEXT_PAGE_TOKEN"
```

### Place Details

```bash
# Get place details with reviews
goplaces details ChIJxxxx --reviews

# Get JSON output for scripting
goplaces details ChIJxxxx --json
```

### Resolve

```bash
# Resolve a query to places
goplaces resolve "Soho, London" --limit 5
```

### Text Search

```bash
# Human-readable output
goplaces text "restaurants in Brooklyn"

# JSON for scripts
goplaces text "hotels near Central Park" --json
```

## Options

| Flag | Description |
|------|-------------|
| `--json` | JSON output |
| `--open-now` | Filter for currently open |
| `--min-rating N` | Minimum rating filter |
| `--limit N` | Results limit |
| `--lat/--lng` | Location coordinates |
| `--radius-m` | Search radius in meters |
| `--reviews` | Include reviews in output |
| `--no-color` | Disable ANSI colors |

## Environment Variables

- `GOOGLE_PLACES_API_KEY` - Required API key
- `GOOGLE_PLACES_BASE_URL` - Optional custom endpoint
- `NO_COLOR` - Disable colors
