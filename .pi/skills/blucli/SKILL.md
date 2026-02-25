---
name: blucli
description: BluOS CLI for discovery, playback, grouping, and volume control on Bluesound/NAD players. Use when you need to control audio playback on BluOS devices.
---

# blucli (blu)

Control Bluesound/NAD players from the command line.

## Install

```bash
go install github.com/steipete/blucli/cmd/blu@latest
```

## Quick Start

```bash
# Discover devices
blu devices

# Check status
blu --device <device-id> status

# Playback controls
blu play
blu pause
blu stop

# Volume
blu volume set 15
blu volume up
blu volume down
```

## Device Selection

Priority order:
1. `--device <id|name|alias>` flag
2. `BLU_DEVICE` environment variable
3. Config default

## Grouping

```bash
# Group status
blu group status

# Add to group
blu group add <device-id>

# Remove from group
blu group remove <device-id>
```

## TuneIn Radio

```bash
# Search TuneIn
blu tunein search "jazz"

# Play station
blu tunein play "station name"
```

## Playback

```bash
# Play/pause/stop
blu play
blu pause
blu stop

# Next/previous
blu next
blu previous

# Seek
blu seek +30
blu seek -10
```

## Presets

```bash
# List presets
blu preset list

# Play preset
blu preset play 1
```

## Options

| Flag | Description |
|------|-------------|
| `--device` | Target device |
| `--json` | JSON output for scripts |
| `--format` | Output format |

## Tips

- Use `--json` for scripting
- Confirm the target device before changing playback
- Check `blu devices` for available players
