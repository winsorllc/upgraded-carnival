---
name: canvas
description: Display HTML content on connected node devices (Mac app, iOS, Android). Use when you need to show visual content, dashboards, or interactive HTML on remote devices.
---

# Canvas Skill

Display HTML content on connected node devices (Mac, iOS, Android).

## Overview

The canvas tool presents web content on any connected node's canvas view:

- Displaying games, visualizations, dashboards
- Showing generated HTML content
- Interactive demos

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Canvas Host    │────▶│   Node Bridge    │────▶│  Node App   │
│  (HTTP Server) │     │  (TCP Server)    │     │ (Mac/iOS/   │
│  Port 18793     │     │  Port 18790      │     │  Android)   │
└─────────────────┘     └──────────────────┘     └─────────────┘
```

1. **Canvas Host Server**: Serves static HTML/CSS/JS files
2. **Node Bridge**: Communicates canvas URLs to connected nodes
3. **Node Apps**: Render content in WebView

## Tailscale Integration

| Bind Mode | Server Binds To    | Canvas URL Uses          |
|-----------|-------------------|-------------------------|
| `loopback` | 127.0.0.1        | localhost (local only)  |
| `lan`      | LAN interface     | LAN IP address          |
| `tailnet`  | Tailscale interface | Tailscale hostname    |
| `auto`     | Best available    | Tailscale > LAN > loopback |

## Actions

| Action | Description |
|--------|-------------|
| `load` | Load HTML file to canvas |
| `clear` | Clear canvas |
| `eval` | Execute JavaScript |
| `screenshot` | Capture canvas screenshot |

## Usage

```javascript
// Load HTML to canvas
canvas.load("dashboard.html")

// Clear canvas
canvas.clear()

// Execute JavaScript
canvas.eval("document.body.style.background = 'blue'")

// Screenshot
canvas.screenshot()
```

## Config

```yaml
canvasHost:
  root: ./canvas  # HTML files directory
  port: 18793

bridge:
  host: auto  # loopback, lan, tailnet, auto
```

## Tips

- HTML files served from `canvasHost.root` directory
- Node apps must be connected to bridge
- Use Tailscale for remote node display
- Works great for dashboards and visualizations
