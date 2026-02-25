---
name: push-notifier
description: Send push notifications via Pushover and other services. Similar to ZeroClaw pushover tool for notifications.
---

# Push Notifier

Send push notifications to mobile devices.

## Usage

```bash
# Send notification
./scripts/push.js --message "Deployment complete" [--title "Alert"]

# With priority
./scripts/push.js --message "Critical error" --priority 2

# With sound
./scripts/push.js --message "Build done" --sound "magic"
```

## Configuration

Requires Pushover token and user key as environment variables.