---
name: peekaboo
description: Capture and automate macOS UI with the Peekaboo CLI - screenshots, UI inspection, element targeting, and input automation.
homepage: https://peekaboo.boo
metadata:
  {
    "openclaw":
      {
        "emoji": "👀",
        "os": ["darwin"],
        "requires": { "bins": ["peekaboo"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "steipete/tap/peekaboo",
              "bins": ["peekaboo"],
              "label": "Install Peekaboo (brew)",
            },
          ],
      },
  }
---

# Peekaboo

macOS UI automation CLI: capture screens, inspect UI elements, drive input, manage apps/windows/menus.

## Requirements

- macOS only
- Screen Recording + Accessibility permissions

## Install

```bash
brew install steipete/tap/peekaboo
```

## Quickstart

```bash
peekaboo permissions
peekaboo list apps --json
peekaboo see --annotate --path /tmp/peekaboo-see.png
peekaboo click --on B1
peekaboo type "Hello" --return
```

## Core Commands

| Command | Description |
|---------|-------------|
| `capture` | Live capture or video ingest + frame extraction |
| `clean` | Prune snapshot cache and temp files |
| `config` | Init/show/edit/validate configuration |
| `image` | Capture screenshots (screen/window/menu bar regions) |
| `list` | Apps, windows, screens, menubar, permissions |
| `see` | Annotated UI maps with optional AI analysis |
| `run` | Execute `.peekaboo.json` scripts |

## Interaction Commands

| Command | Description |
|---------|-------------|
| `click` | Target by ID/query/coords with smart waits |
| `drag` | Drag & drop across elements/coords |
| `hotkey` | Modifier combos like `cmd,shift,t` |
| `move` | Cursor positioning with optional smoothing |
| `paste` | Set clipboard → paste → restore |
| `press` | Special-key sequences with repeats |
| `scroll` | Directional scrolling (targeted + smooth) |
| `swipe` | Gesture-style drags between targets |
| `type` | Text input with control keys |

## System Commands

| Command | Description |
|---------|-------------|
| `app` | Launch/quit/relaunch/hide/unhide/switch/list apps |
| `clipboard` | Read/write clipboard (text/images/files) |
| `dialog` | Click/input/file/dismiss system dialogs |
| `dock` | Launch/right-click/hide/show Dock items |
| `menu` | Click/list application menus + menu extras |
| `menubar` | List/click status bar items |
| `open` | Enhanced `open` with app targeting |
| `space` | List/switch/move windows across Spaces |
| `window` | Close/minimize/maximize/move/resize/focus/list |

## Common Parameters

### Targeting
- `--app`, `--pid` — Target specific app
- `--window-title`, `--window-id`, `--window-index` — Window selection
- `--on`/`--id` — Element ID
- `--coords x,y` — Coordinates

### Capture
- `--path` — Output file path
- `--format png|jpg` — Image format
- `--retina` — Retina resolution
- `--mode screen|window|frontmost` — Capture mode

### Motion/Typing
- `--duration` — For drag/swipe
- `--delay` — Typing delay
- `--profile human|linear` — Movement profile

## Examples

### Login workflow

```bash
peekaboo see --app Safari --window-title "Login" --annotate --path /tmp/see.png
peekaboo click --on B3 --app Safari
peekaboo type "user@example.com" --app Safari
peekaboo press tab --count 1 --app Safari
peekaboo type "supersecret" --app Safari --return
```

### Screenshot + AI analysis

```bash
peekaboo image --mode screen --path /tmp/screen.png
peekaboo see --mode screen --analyze "Summarize the dashboard"
```

### App management

```bash
peekaboo app launch "Safari" --open https://example.com
peekaboo window focus --app Safari
peekaboo window set-bounds --app Safari --x 50 --y 50 --width 1200 --height 800
peekaboo app quit --app Safari
```

### Mouse automation

```bash
peekaboo move 500,300 --smooth
peekaboo drag --from B1 --to T2
peekaboo scroll --direction down --amount 6 --smooth
peekaboo hotkey --keys "cmd,shift,t"
```

## Permissions

```bash
peekaboo permissions
# Grant Screen Recording + Accessibility in System Preferences
```

## Notes

- Run `peekaboo learn` for full agent guide
- Use `peekaboo see --annotate` to identify targets before clicking
- Use `--json` flag for scripting
