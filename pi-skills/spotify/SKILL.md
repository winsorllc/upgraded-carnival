---
name: spotify
description: Control Spotify playback, search for tracks, and manage playlists. Use when: user wants to play music, skip tracks, search for songs, or manage playlists.
---

# Spotify Skill

Control Spotify playback and manage music.

## When to Use

✅ **USE this skill when:**

- "Play some music"
- "Skip this song"
- "Search for [artist/song]"
- "What's currently playing?"
- "Create a playlist"

## When NOT to Use

❌ **DON'T use this skill when:**

- Non-Spotify music → use platform-specific tools
- High-quality audio downloads → use dedicated downloaders
- Podcast management → use podcast apps

## Requirements

- Spotify account
- Spotify CLI tools (`spotify-cli`, `spot`, or `spt`)

## Installation

```bash
# Using Homebrew (macOS)
brew install spotify-cli

# Or use spotify-player
cargo install spotify_player

# Or spt (Spotify CLI)
brew install jingy/spt/spt
```

## Usage

### Playback Control

```bash
# Play/Pause
spotify-ctrl.sh play
spotify-ctrl.sh pause
spotify-ctrl.sh toggle

# Skip tracks
spotify-ctrl.sh next
spotify-ctrl.sh previous

# Volume
spotify-ctrl.sh volume 50
spotify-ctrl.sh volume up
spotify-ctrl.sh volume down
```

### Now Playing

```bash
# Get current track
spotify-now.sh

# Get as JSON
spotify-now.sh --json
```

### Search

```bash
# Search for tracks
spotify-search.sh "song name"
spotify-search.sh "artist name"

# Search with limit
spotify-search.sh "query" --limit 10
```

## Commands

### spotify-ctrl.sh

Control playback.

```bash
./spotify-ctrl.sh <action> [options]

Actions:
  play, pause, toggle
  next, previous
  shuffle, repeat
  volume LEVEL

Examples:
  ./spotify-ctrl.sh play
  ./spotify-ctrl.sh next
  ./spotify-ctrl.sh volume 75
```

### spotify-now.sh

Show now playing.

```bash
./spotify-now.sh [options]

Options:
  --json    Output as JSON
  --art     Show album art (if supported)
```

### spotify-search.sh

Search Spotify.

```bash
./spotify-search.sh <query> [options]

Options:
  --limit N    Number of results (default: 5)
  --type TYPE  Track, artist, album, playlist

Examples:
  ./spotify-search.sh "Bohemian Rhapsody"
  ./spotify-search.sh "Daft Punk" --limit 10
```

## Examples

### Play a Song

```bash
spotify-search.sh "Blinding Lights" | head -1 | xargs spotify-ctrl.sh play
```

### Volume Control

```bash
spotify-ctrl.sh volume 50    # Set to 50%
spotify-ctrl.sh volume up   # Increase by 10%
spotify-ctrl.sh volume down # Decrease by 10%
```

### Get Now Playing

```bash
spotify-now.sh
```

## Notes

- Requires Spotify Premium for remote control
- Uses Spotify Web API or D-Bus (Linux) / AppleScript (macOS)
- Rate limits apply to search
- Use `--json` for programmatic consumption
