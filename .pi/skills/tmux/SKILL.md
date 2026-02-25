---
name: tmux
description: Terminal multiplexer for managing persistent terminal sessions, detaching/reattaching, and running commands in background sessions. Use when: (1) you need to run long-lived processes that survive disconnection, (2) managing multiple terminal workspaces, (3) running parallel tasks in separate sessions, (4) persisting command output across agent runs.
---

# Tmux Skill

Terminal multiplexer for managing persistent terminal sessions.

## When to Use

✅ **USE this skill when:**
- Running long-lived processes that must survive disconnection
- Managing multiple terminal workspaces/projects
- Running parallel tasks in separate tmux sessions
- Needing to persist command output across agent runs
- Creating detached background processes
- Pair programming or sharing terminal sessions

❌ **DON'T use this skill when:**
- Simple one-off commands → use regular bash
- Short-lived foreground processes → use regular bash
- GUI applications → use other tools

## Setup

```bash
# Check if tmux is installed
which tmux

# Install if needed (Debian/Ubuntu)
apt-get update && apt-get install -y tmux

# Install (macOS)
brew install tmux
```

## Common Commands

### Session Management

```bash
# List all sessions
tmux ls

# Create new session (detached)
tmux new-session -d -s mysession

# Create session and run command
tmux new-session -d -s mysession "npm run dev"

# Attach to session
tmux attach -t mysession

# Detach from session (inside tmux)
Ctrl-b d

# Kill session
tmux kill-session -t mysession

# Rename session
tmux rename-session -t oldname newname
```

### Window Management

```bash
# Create new window
tmux new-window -t mysession

# Create window with name
tmux new-window -t mysession -n "editor"

# Switch to window by number
tmux select-window -t mysession:0

# Switch to window by name
tmux select-window -t mysession:"editor"

# List windows
tmux list-windows -t mysession

# Kill window
tmux kill-window -t mysession:0
```

### Pane Management

```bash
# Split window horizontally
tmux split-window -h

# Split window vertically
tmux split-window -v

# Switch panes
tmux select-pane -L  # left
tmux select-pane -R  # right
tmux select-pane -U  # up
tmux select-pane -D  # down

# Resize pane
tmux resize-pane -U 10  # resize up 10 lines

# Kill pane
tmux kill-pane
```

### Sending Commands

```bash
# Send command to session (non-interactive)
tmux send-keys -t mysession "ls -la" C-m

# Send command to window
tmux send-keys -t mysession:0 "npm test" C-m

# Capture pane output
tmux capture-pane -t mysession -p

# Capture last 100 lines
tmux capture-pane -t mysession -p -S -100
```

### Advanced

```bash
# Send text to all panes in a session
tmux set-window-option -t mysession synchronize-panes on

# List all key bindings
tmux list-keys

# Check tmux version
tmux -V
```

## Scripting Examples

### Run command in background session

```bash
#!/bin/bash
SESSION="background-job-$$"
tmux new-session -d -s "$SESSION" "your-command"
echo "Started in tmux session: $SESSION"
```

### Capture output after command completes

```bash
#!/bin/bash
SESSION="capture-test-$$"
tmux new-session -d -s "$SESSION"
tmux send-keys -t "$SESSION" "ls -la" C-m
sleep 2
tmux capture-pane -t "$SESSION" -p
tmux kill-session -t "$SESSION"
```

### Wait for process in session

```bash
#!/bin/bash
SESSION="wait-test-$$"
tmux new-session -d -s "$SESSION"

# Run a command
tmux send-keys -t "$SESSION" "sleep 5 && echo done" C-m

# Poll for completion
while tmux capture-pane -t "$SESSION" -p | grep -q "done"; do
  sleep 1
done

echo "Process completed"
tmux kill-session -t "$SESSION"
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TMUX` | Set if running inside tmux |
| `TMUX_PANE` | Pane ID when inside tmux |

## Notes

- Always use `-t target` to specify session/window/pane
- Commands ending with `C-m` simulate pressing Enter
- Capture pane output to get command results
- Clean up sessions when done to avoid resource leaks
