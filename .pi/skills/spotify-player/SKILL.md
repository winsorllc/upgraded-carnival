---
name: spotify-player
description: "Terminal Spotify playback and search via spogo. Use for controlling Spotify playback, searching for tracks, and managing devices."
homepage: https://github.com/petrspopos/spogo
metadata:
  {
    "thepopebot":
      {
        "emoji": "🎵",
        "requires": { "bins": ["spogo"] },
      },
  }
---

# Spotify Player

Control Spotify playback from the terminal.

## Setup

**Requirements:**
- Spotify Premium account
- Spotify CLI tool (spogo recommended, spotify_player as fallback)

**Installation (macOS):**
```bash
brew tap steipete/tap
brew install spogo
```

**Authentication:**
```bash
spogo auth import --browser chrome
```

## Usage

### Playback Controls
```bash
spogo play           # Start playback
spogo pause          # Pause playback
spogo next           # Next track
spogo prev           # Previous track
spogo shuffle        # Toggle shuffle
spogo repeat         # Toggle repeat
```

### Search
```bash
spogo search track "song name"
spogo search album "album name"
spogo search artist "artist name"
```

### Devices
```bash
spogo device list    # List available devices
spogo device set "Computer"  # Switch to specific device
```

### Status
```bash
spogo status         # Show current playback status
```

### Queue
```bash
spogo queue add "song name"  # Add to queue
spogo queue list             # View queue
```

## Configuration

- Config folder: `~/.config/spogo/`
- See `spogo --help` for all options

## Notes

- Requires Spotify Premium
- Must authenticate with browser cookies first
- Works on macOS, Linux, and Windows (via WSL)
