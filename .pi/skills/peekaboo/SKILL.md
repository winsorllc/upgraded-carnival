---
name: peekaboo
description: Capture and automate macOS UI with the Peekaboo CLI. Use when you need to capture screenshots, inspect UI elements, automate macOS apps, or manage windows/menus.
---

# Peekaboo

macOS UI automation CLI - capture, inspect, and automate.

## Install

```bash
brew install steipete/tap/peekaboo
```

## Core Commands

```bash
# Check connectivity
peekaboo bridge

# Clean snapshot cache
peekaboo clean

# Config management
peekaboo config init
peekaboo config show
peekaboo config validate
```

## Capture

```bash
# Capture screenshot
peekaboo image screenshot

# Capture specific region
peekaboo image screenshot --region "0,0,800,600"

# Capture window
peekaboo image window

# Live capture
peekaboo capture live
```

## List

```bash
# List apps
peekaboo list apps

# List windows
peekaboo list windows

# List screens
peekaboo list screens

# List menu bar
peekaboo list menubar
```

## Run Scripts

```bash
# Run .peekaboo.json script
peekaboo run script.peekaboo.json
```

## Permissions

```bash
# Check permissions status
peekaboo permissions
```

## Options

| Flag | Description |
|------|-------------|
| `--json, -j` | JSON output |
| `--help` | Command help |

## Tips

- Run via `polter peekaboo` for fresh builds
- Commands share a snapshot cache
- Use `--json` for scripting
- Check `peekaboo --version` for build info
