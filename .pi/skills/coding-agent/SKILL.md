---
name: coding-agent
description: "Delegate coding tasks to Codex, Claude Code, or Pi agents via background process. Use when: (1) building/creating new features or apps, (2) reviewing PRs (spawn in temp dir), (3) refactoring large codebases, (4) iterative coding that needs file exploration. NOT for: simple one-liner fixes (just edit), reading code (use read tool), or any work in ~/workspace (never spawn agents here). Requires a bash tool that supports pty:true."
---

# Coding Agent (bash-first)

Use **bash** (with optional background mode) for all coding agent work. Simple and effective.

## PTY Mode Required!

Coding agents (Codex, Claude Code, Pi) are **interactive terminal applications** that need a pseudo-terminal (PTY) to work correctly. Without PTY, you'll get broken output, missing colors, or the agent may hang.

**Always use `pty:true`** when running coding agents:

```bash
# Correct - with PTY
bash pty:true command:"codex exec 'Your prompt'"

# Wrong - no PTY, agent may break
bash command:"codex exec 'Your prompt'"
```

## Bash Tool Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `command` | string | The shell command to run |
| `pty` | boolean | Use for coding agents! Allocates a pseudo-terminal |
| `workdir` | string | Working directory (agent sees only this folder's context) |
| `background` | boolean | Run in background, returns sessionId for monitoring |
| `timeout` | number | Timeout in seconds |

## Process Tool Actions (for background sessions)

| Action | Description |
|--------|-------------|
| `list` | List all running/recent sessions |
| `poll` | Check if session is still running |
| `log` | Get session output |
| `write` | Send raw data to stdin |
| `submit` | Send data + newline |
| `kill` | Terminate the session |

## Quick Start

```bash
# Quick one-shot (Codex needs a git repo!)
SCRATCH=$(mktemp -d) && cd $SCRATCH && git init && codex exec "Your prompt here"

# With PTY in a real project
bash pty:true workdir:~/project command:"codex exec --full-auto 'Add error handling'"
```

## The Pattern: workdir + background + pty

For longer tasks, use background mode:

```bash
# Start agent in target directory
bash pty:true workdir:~/project background:true command:"codex exec --full-auto 'Build a snake game'"

# Monitor progress
process action:log sessionId:XXX

# Check if done
process action:poll sessionId:XXX

# Send input if needed
process action:submit sessionId:XXX data:"yes"

# Kill if needed
process action:kill sessionId:XXX
```

## Codex CLI

| Flag | Effect |
|------|--------|
| `exec "prompt"` | One-shot execution |
| `--full-auto` | Auto-approves in workspace |
| `--yolo` | No sandbox, fastest |

```bash
# Quick one-shot
bash pty:true workdir:~/project command:"codex exec --full-auto 'Build a dark mode toggle'"

# Background for longer work
bash pty:true workdir:~/project background:true command:"codex --yolo 'Refactor the auth module'"
```

### Reviewing PRs

**CRITICAL: Never review PRs in your main project folder!**

```bash
# Clone to temp for safe review
REVIEW_DIR=$(mktemp -d)
git clone https://github.com/user/repo.git $REVIEW_DIR
cd $REVIEW_DIR && gh pr checkout 130
bash pty:true workdir:$REVIEW_DIR command:"codex review --base origin/main"

# Or use git worktree
git worktree add /tmp/pr-130-review pr-130-branch
bash pty:true workdir:/tmp/pr-130-review command:"codex review --base main"
```

## Claude Code

```bash
bash pty:true workdir:~/project command:"claude 'Your task'"
bash pty:true workdir:~/project background:true command:"claude 'Your task'"
```

## Pi Coding Agent

```bash
# Install: npm install -g @mariozechner/pi-coding-agent
bash pty:true workdir:~/project command:"pi 'Your task'"
bash pty:true command:"pi -p 'Summarize src/'"
```

## Parallel Issue Fixing with git worktrees

```bash
# Create worktrees for each issue
git worktree add -b fix/issue-78 /tmp/issue-78 main
git worktree add -b fix/issue-99 /tmp/issue-99 main

# Launch agents
bash pty:true workdir:/tmp/issue-78 background:true command:"pnpm install && codex --yolo 'Fix issue #78'"
bash pty:true workdir:/tmp/issue-99 background:true command:"pnpm install && codex --yolo 'Fix issue #99'"

# Monitor
process action:list

# Create PRs
cd /tmp/issue-78 && git push -u origin fix/issue-78

# Cleanup
git worktree remove /tmp/issue-78
git worktree remove /tmp/issue-99
```

## Rules

1. **Always use pty:true** - coding agents need a terminal!
2. **Respect tool choice** - use the requested agent
3. **Be patient** - don't kill sessions because they're slow
4. **Monitor with process:log**
5. **--full-auto for building** - auto-approves changes
6. **Never start agents in your main workspace folder**
