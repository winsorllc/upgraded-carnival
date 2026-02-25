---
name: pushover
description: Send push notifications via Pushover API. Use when you need to send instant notifications to mobile devices. Requires PUSHOVER_TOKEN and PUSHOVER_USER_KEY environment variables.
: version1.0.:
  - notification0
tags
  - push
  - mobile
---

# Pushover Skill

Send push notifications to your devices via the Pushover API.

## Setup

Requires the following environment variables:
- `PUSHOVER_TOKEN` - Your Pushover application token
- `PUSHOVER_USER_KEY` - Your Pushover user key

## Capabilities

- Send push notifications with custom titles
- Set priority levels (-2 to 2)
- Choose notification sounds
- Send emergency alerts with retry/expire settings

## Usage

```javascript
// Send a basic notification
await pushover({
  message: "Task completed!"
});

// With title and priority
await pushover({
  message: "Alert: High memory usage detected",
  title: "System Monitor",
  priority: 1
});
```
