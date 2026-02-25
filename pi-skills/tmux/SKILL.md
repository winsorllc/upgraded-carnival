---
name: tmux
description: Control tmux sessions by sending keystrokes and reading pane output. Use when: you need to interact with existing tmux sessions, monitor background processes, send input to interactive terminal applications, or scrape output from long-running processes.
metadata:
  {
    "os": ["darwin", "linux"],
    "requires": { "bins": ["tmux"] }
  }
---

# tmux Session Control

Control tmux sessions by sending keystrokes and reading output. Essential for managing interactive CLI sessions and background processes.

## Setup

```bash
# Install tmux (if not already installed)
# Debian/Ubuntu
apt-get install tmux

# macOS
brew install tmux
```

## Usage

### List Sessions

```bash
{baseDir}/tmux.js list
# or
tmux ls
```

### Capture Pane Output

```bash
# Last 20 lines of pane
{baseDir}/tmux.js capture mysession

# Entire scrollback
{baseDir}/tmux.js capture mysession --scrollback

# Specific window.pane
{baseDir}/tmux.js capture "mysession:0.0"
```

### Send Keys to Session

```bash
# Send text (no Enter)
{baseDir}/tmux.js send mysession "hello world"

# Send text + Enter
{baseDir}/tmux.js send mysession "hello world" --enter

# Send special keys
{baseDir}/tmux.js send mysession "" --key Enter
{baseDir}/tmux.js send mysession "" --key Escape
{baseDir}/tmux.js send mysession "" --key C-c
```

### Create Session

```bash
{baseDir}/tmux.js new mysession
```

### Kill Session

```bash
{baseDir}/tmux.js kill mysession
```

### Rename Session

```bash
{baseDir}/tmux.js rename oldname newname
```

## Options

| Option | Description |
|--------|-------------|
| `--scrollback` | Capture entire scrollback history |
| `--enter` | Send Enter key after text |
| `--key` | Send special key (Enter, Escape, C-c, C-d, etc.) |
| `--pane` | Target specific pane (default: 0.0) |
| `--window` | Target specific window (default: 0) |

## When to Use

✅ **USE this skill when:**

- Monitoring interactive sessions in tmux
- Sending input to interactive terminal applications
- Scraping output from long-running processes in tmux
- Navigating tmux panes/windows programmatically
- Checking on background work in existing sessions

❌ **DON'T use this skill when:**

- Running one-off shell commands → use exec tool directly
- Starting new background processes → use exec with background flag
- Non-interactive scripts → use exec tool
- The process isn't in tmux

## Tips

- Use `capture` to read output without modifying the session
- Split text and Enter into separate sends for interactive prompts
- Session names with special characters should be quoted
- Target format: `session:window.pane` (e.g., `shared:0.0`)
