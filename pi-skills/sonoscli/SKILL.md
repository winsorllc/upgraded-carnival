---
name: sonoscli
description: Control Sonos speakers via CLI. Play, pause, skip, adjust volume, group speakers, and manage playlists.
metadata:
  {
    "openclaw": {
      "emoji": "🔊",
      "requires": { "bins": ["sonoscli"] }
    }
  }
---

# Sonos CLI

Control Sonos speakers from the command line.

## Installation

```bash
npm install -g sonos-cli
# or
cargo install sonoscli
```

## Configuration

Environment variables:
- `SONOS_HOST`: IP address of a Sonos speaker (auto-discovery if not set)
- `SONOS_PORT`: Port (default: 1400)

## Usage

Play/Pause:

```bash
sonoscli play
sonoscli pause
sonoscli toggle
```

Volume:

```bash
sonoscli volume 50       # Set volume to 50%
sonoscli volume +10      # Increase by 10%
sonoscli volume -10      # Decrease by 10%
```

Transport:

```bash
sonoscli next
sonoscli previous
sonoscli seek 60         # Seek to 60 seconds
```

Grouping:

```bash
sonoscli group kitchen,livingroom  # Group speakers
sonoscli ungroup                   # Ungroup all
sonoscli pause-all                 # Pause all speakers
```

Now Playing:

```bash
sonoscli now
sonoscli now --json
```

Search & Play:

```bash
sonoscli search "bohemian rhapsody"
sonoscli play uri "x-sonos-spotify:track:abc123"
```

Favorites:

```bash
sonoscli favorites
sonoscli play-favorite "My Playlist"
```
