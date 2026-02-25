---
name: presence-manager
description: Manage presence status, typing indicators, and connection state for real-time messaging channels.
---

# Presence Manager Skill

Manage presence status, typing indicators, and connection state for real-time messaging. Inspired by OpenClaw's presence and typing indicators.

## Setup

Configure presence settings in environment variables:

```bash
# Presence configuration
export PRESENCE_STATUS="online"  # online, away, dnd, offline
export PRESENCE_ACTIVITY="Coding"  # Custom status message
export TYPING_INDICATORS_ENABLED=true
```

## Usage

### Set presence status

```bash
{baseDir}/presence-manager.js status online
{baseDir}/presence-manager.js status away "In a meeting"
{baseDir}/presence-manager.js status dnd "Do not disturb"
```

### Broadcast typing indicator

```bash
{baseDir}/presence-manager.js typing start telegram 123456789
{baseDir}/presence-manager.js typing stop telegram 123456789
```

### Get presence info

```bash
{baseDir}/presence-manager.js info telegram 123456789
```

### Monitor connection health

```bash
{baseDir}/presence-manager.js health
```

### Set custom activity/status

```bash
{baseDir}/presence-manager.js activity "Building something cool"
```

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `PRESENCE_STATUS` | Initial presence | online |
| `PRESENCE_ACTIVITY` | Custom status text | - |
| `TYPING_INDICATORS_ENABLED` | Enable typing indicators | true |

## Presence States

| State | Description | Icon |
|-------|-------------|------|
| online | Available | 🟢 |
| away | Temporarily away | 🟡 |
| dnd | Do not disturb | 🔴 |
| offline | Disconnected | ⚪ |

## Typing Indicators

Typing indicators are supported for:
- Telegram
- Discord
- Slack

## Example Use Cases

- Show availability to team members
- Indicate current activity/context
- Typing indicators for better UX
- Connection health monitoring
