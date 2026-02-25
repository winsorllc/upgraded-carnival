---
name: notification-center
description: Centralized notification system. Queue, manage, and send notifications through multiple channels. Inspired by OpenClaw's system.run/notify and ZeroClaw's channel system.
---

# Notification Center

Centralized notification management system for agent alerts and messages.

## Capabilities

- Queue notifications
- Send via multiple channels (log, file, webhook)
- Priority levels (critical, warning, info)
- Notification history
- Rate limiting

## Usage

```bash
# Send notification
/job/.pi/skills/notification-center/notify.js "Message" --priority critical

# List recent notifications
/job/.pi/skills/notification-center/notify-list.js

# Clear history
/job/.pi/skills/notification-center/notify-clear.js
```

## Priority Levels

- `critical`: Immediate attention required
- `warning`: Important but not urgent  
- `info`: Normal informational
- `debug`: Development only

## Configuration

Settings in notification config (JSON):
```json
{
  "channels": ["log", "file"],
  "file_path": "/tmp/notifications.log",
  "max_history": 100
}
```