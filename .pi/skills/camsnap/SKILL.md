---
name: camsnap
description: Capture frames or clips from RTSP/ONVIF cameras. Use when you need to grab snapshots, video clips, or monitor motion events from IP cameras.
---

# camsnap

Capture frames/clips from RTSP/ONVIF cameras.

## Install

```bash
brew install steipete/tap/camsnap
```

## Setup

```bash
# Create config
~/.config/camsnap/config.yaml

# Add camera
camsnap add --name kitchen --host 192.168.0.10 --user admin --pass password
```

## Config Format

```yaml
cameras:
  - name: kitchen
    host: 192.168.0.10
    user: admin
    password: secret
    rtsp_url: rtsp://192.168.0.11:554/stream
```

## Quick Start

```bash
# Discover cameras
camsnap discover --info

# Take snapshot
camsnap snap kitchen --out shot.jpg

# Record clip
camsnap clip kitchen --dur 5s --out clip.mp4

# Motion watch
camsnap watch kitchen --threshold 0.2 --action 'echo Motion detected!'
```

## Commands

| Command | Description |
|---------|-------------|
| `discover` | Find cameras on network |
| `snap` | Capture snapshot |
| `clip` | Record video clip |
| `watch` | Monitor for motion |
| `doctor` | Diagnose camera issues |

## Options

| Flag | Description |
|------|-------------|
| `--out` | Output file path |
| `--dur` | Duration (5s, 30s, 1m) |
| `--threshold` | Motion detection threshold |
| `--action` | Command on motion |

## Tips

- Requires `ffmpeg` on PATH
- Test with short captures first
- Check `camsnap doctor` for issues
