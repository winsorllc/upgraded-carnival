---
name: Session Manager
description: Multi-session management for coordinating work across isolated contexts. Lists active sessions, switches contexts, and tracks session history. Supports session-level configuration and state persistence.
author: PopeBot
version: 1.0.0
tags:
  - session
  - context
  - multi-session
  - state-management
---

# Session Manager

Multi-session management for coordinating work across isolated contexts. Inspired by OpenClaw's session tools.

## Capabilities

- List active sessions
- Session context switching
- Session history tracking
- Session state persistence
- Cross-session communication
- Session metadata storage
- Session priority management
- Active session monitoring

## When to Use

Use the session-manager skill when:
- Working on multiple concurrent tasks
- Need isolated contexts for different jobs
- Coordinating between sessions
- Tracking session history and state
- Managing long-running sessions

## Usage Examples

### List sessions
```bash
node /job/.pi/skills/session-manager/session.js list
```

### Create new session
```bash
node /job/.pi/skills/session-manager/session.js create "Feature-X"
```

### Switch session
```bash
node /job/.pi/skills/session-manager/session.js switch "Feature-X"
```

### Show session info
```bash
node /job/.pi/skills/session-manager/session.js info "Feature-X"
```

### Session history
```bash
node /job/.pi/skills/session-manager/session.js history --limit 20
```

### Archive sessions
```bash
node /job/.pi/skills/session-manager/session.js archive "Feature-X"
```
