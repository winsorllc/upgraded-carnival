---
name: web-screenshot
description: Capture screenshots of web pages using headless Chrome. Use when you need to capture website appearances, create thumbnails, or archive web pages visually.
---

# Web Screenshot

Capture full-page or viewport screenshots of websites using headless Chrome/Chromium.

## Quick Start

```bash
/job/.pi/skills/web-screenshot/screenshot.js "https://example.com" /tmp/screenshot.png
```

## Usage

### Basic Screenshot
```bash
/job/.pi/skills/web-screenshot/screenshot.js "<url>" <output_file>
```

### Full Page Screenshot
```bash
/job/.pi/skills/web-screenshot/screenshot.js "<url>" <output_file> --full
```

### With Custom Viewport
```bash
/job/.pi/skills/web-screenshot/screenshot.js "<url>" <output_file> --width 1920 --height 1080
```

### With Delay (for dynamic content)
```bash
/job/.pi/skills/web-screenshot/screenshot.js "<url>" <output_file> --delay 3000
```

### Mobile Viewport
```bash
/job/.pi/skills/web-screenshot/screenshot.js "<url>" <output_file> --mobile
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--full` | false | Capture full page (scroll height) |
| `--width` | 1280 | Viewport width in pixels |
| `--height` | 800 | Viewport height in pixels |
| `--delay` | 0 | Wait time before capture (ms) |
| `--mobile` | false | Use mobile viewport (375x667) |
| `--quality` | 80 | JPEG quality (1-100) |
| `--format` | png | Output format: png, jpeg, webp |
| `--wait-for` | null | CSS selector to wait for |
| `--dark-mode` | false | Enable dark mode emulation |

## Output Formats

- **PNG**: Lossless, larger files (default)
- **JPEG**: Compressed, smaller files, configurable quality
- **WebP**: Modern format, good compression

## Examples

```bash
# Basic screenshot
/job/.pi/skills/web-screenshot/screenshot.js "https://example.com" /tmp/example.png

# Full page capture
/job/.pi/skills/web-screenshot/screenshot.js "https://example.com/page" /tmp/full.png --full

# Desktop viewport
/job/.pi/skills/web-screenshot/screenshot.js "https://example.com" /tmp/desktop.png --width 1920 --height 1080

# Mobile view
/job/.pi/skills/web-screenshot/screenshot.js "https://example.com" /tmp/mobile.png --mobile

# Wait for dynamic content
/job/.pi/skills/web-screenshot/screenshot.js "https://example.com" /tmp/delayed.png --delay 5000

# Wait for specific element
/job/.pi/skills/web-screenshot/screenshot.js "https://example.com" /tmp/wait.png --wait-for ".loaded-content"

# High quality JPEG
/job/.pi/skills/web-screenshot/screenshot.js "https://example.com" /tmp/thumb.jpg --format jpeg --quality 90

# Dark mode capture
/job/.pi/skills/web-screenshot/screenshot.js "https://example.com" /tmp/dark.png --dark-mode
```

## Use Cases

- Website thumbnail generation
- Visual regression testing
- Archiving web page appearances
- Creating social media preview images
- Monitoring website changes
- Capturing error states or dynamic content

## When to Use

- User requests website screenshot
- Need visual reference for web page
- Creating thumbnails for link previews
- Documenting website state at a point in time
- Testing responsive layouts
