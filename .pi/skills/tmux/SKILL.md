---
name: tmux
description: Remote-control tmux sessions for interactive CLIs by sending keystrokes and scraping pane output. Use when you need to manage long-running interactive processes, monitor sessions, or control terminal applications.
---

# tmux Session Control

Control tmux sessions by sending keystrokes and reading output. Essential for managing long-running processes and interactive terminal applications.

## When to Use

✅ **USE this skill when:**

- Monitoring long-running processes in tmux
- Sending input to interactive terminal applications
- Scraping output from processes in tmux
- Navigating tmux panes/windows programmatically
- Managing multiple concurrent sessions

## When NOT to Use

❌ **DON'T use this skill when:**

- Running one-off shell commands → use `bash` tool directly
- Starting new background processes → use `bash` with `&`
- Non-interactive scripts → use `bash` tool
- The process isn't in tmux

## Common Commands

### List Sessions

```bash
tmux list-sessions
```

### Capture Output

```bash
# Last 20 lines of pane
tmux capture-pane -t session_name -p | tail -20

# Entire scrollback
tmux capture-pane -t session_name -p -S -
```

### Send Keys

```bash
# Send text + Enter
tmux send-keys -t session_name "command" Enter

# Send Ctrl+C
tmux send-keys -t session_name C-c
```

### Session Management

```bash
# Create new detached session
tmux new-session -d -s session_name

# Kill session
tmux kill-session -t session_name

# Check if session exists
tmux has-session -t session_name 2>/dev/null && echo "exists"
```

## Examples

```bash
# Create a session and run a long process
tmux new-session -d -s myjob "node long-running-script.js"

# Check output after 10 seconds
sleep 10 && tmux capture-pane -t myjob -p -S -50

# Send interrupt
tmux send-keys -t myjob C-c

# Clean up
tmux kill-session -t myjob
```
