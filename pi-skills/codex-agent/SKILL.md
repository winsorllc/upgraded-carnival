---
name: codex-agent
description: Delegate coding tasks to sub-agents (Codex, Claude Code, Pi) via background process. Use for building features, reviewing PRs, refactoring, and iterative coding. NOT for simple one-liner fixes or reading code.
metadata:
  {
    "requires": { "bins": ["codex", "claude", "pi", "opencode"] }
  }
---

# CodeX Agent (Sub-Agent Delegation)

Delegate coding tasks to sub-agents running Codex, Claude Code, or Pi. Spawn background agents for complex tasks that need file exploration and iterative coding.

## ⚠️ PTY Mode Required!

Sub-agents are **interactive terminal applications** that need a pseudo-terminal (PTY) to work correctly. Without PTY, you'll get broken output, missing colors, or the agent may hang.

**Always use PTY mode when running sub-agents:**

```bash
# ✅ Correct - with PTY
bash pty:true command:"codex exec 'Your prompt'"

# ❌ Wrong - no PTY, agent may break
bash command:"codex exec 'Your prompt'"
```

### Bash Tool Parameters for Agent Spawning

| Parameter | Type | Description |
|-----------|------|-------------|
| `command` | string | The shell command to run |
| `pty` | boolean | **Use for sub-agents!** Allocates pseudo-terminal |
| `workdir` | string | Working directory (agent sees only this folder) |
| `background` | boolean | Run in background, returns sessionId |
| `timeout` | number | Timeout in seconds |
| `elevated` | boolean | Run on host instead of sandbox |

---

## Quick Start: One-Shot Tasks

For quick prompts/chats in a temp git repo:

```bash
# Quick chat (Codex needs a git repo!)
SCRATCH=$(mktemp -d) && cd $SCRATCH && git init && codex exec "Your prompt here"

# Or in a real project - with PTY!
bash pty:true workdir:~/Projects/myproject command:"codex exec 'Add error handling to the API calls'"
```

**Why git init?** Most coding agents refuse to run outside a trusted git directory.

---

## The Pattern: workdir + background + pty

For longer tasks, use background mode with PTY:

```bash
# Start agent in target directory (with PTY!)
bash pty:true workdir:~/project background:true command:"codex exec --full-auto 'Build a snake game'"

# Monitor progress
process action:log sessionId:XXX

# Check if done
process action:poll sessionId:XXX

# Send input (if agent asks a question)
process action:write sessionId:XXX data:"y"

# Kill if needed
process action:kill sessionId:XXX
```

---

## Available Agents

### Codex CLI
```bash
# Install
npm install -g @anthropic-ai/codex-cli

# Usage
codex exec "Build me a todo app"
codex chat "How do I center a div?"
```

### Claude Code
```bash
# Install
npm install -g @anthropic/claude-code

# Usage  
claude --dangerously-skip-permissions "Your prompt"
```

### Pi (for smaller tasks)
```bash
# Uses the Pi coding agent
pi "Your coding task"
```

---

## When to Use Sub-Agents

✅ **Use this skill for:**
- Building/creating new features or apps
- Reviewing PRs (spawn in temp dir)
- Refactoring large codebases
- Iterative coding needing file exploration
- Complex debugging sessions

❌ **Don't use for:**
- Simple one-liner fixes (just edit directly)
- Reading code (use read tool)
- Any work in ~/workspace (never spawn agents here)

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key for Claude/Codex |
| `OPENAI_API_KEY` | API key for OpenAI models |
| `CLAUDE_CODE_EXTENSIONS` | Enable Claude Code extensions |

---

## Process Tool Actions (for background sessions)

| Action | Description |
|--------|-------------|
| `list` | List all running/recent sessions |
| `poll` | Check if session is still running |
| `log` | Get session output |
| `write` | Send raw data to stdin |
| `submit` | Send data + newline |
| `send-keys` | Send key tokens |
| `kill` | Terminate the session |
