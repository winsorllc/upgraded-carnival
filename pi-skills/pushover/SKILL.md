---
name: pushover
description: Send Pushover notifications to your devices. Requires PUSHOVER_TOKEN and PUSHOVER_USER_KEY in .env.
metadata:
  {
    "zeroclaw":
      {
        "emoji": "📱",
        "requires": { "env": ["PUSHOVER_TOKEN", "PUSHOVER_USER_KEY"] },
      },
  }
---

# Pushover

Send instant push notifications to your iOS/Android devices via Pushover API.

## Requirements

Set these environment variables in your `.env` file:
- `PUSHOVER_TOKEN` — Your Pushover application token
- `PUSHOVER_USER_KEY` — Your Pushover user key

## When to Use

✅ **USE this skill when:**

- Sending urgent alerts to your phone
- Real-time notifications for automation scripts
- High-priority system alerts

## When NOT to Use

❌ **DON'T use this skill when:**

- Routine messages (use email or chat)
- Non-urgent notifications
- Bulk messaging (Pushover has rate limits)

## Usage

```bash
# Basic notification
pushover "Your build is complete!"

# With title
pushover --title "Build Status" "Deployment finished successfully"

# With priority
pushover --priority 1 "URGENT: Server down!"

# With sound
pushover --sound bird "Task completed"

# URL attachment
pushover --url "https://example.com" "View dashboard"
```

## Parameters

| Parameter | Description |
|-----------|-------------|
| `message` | The notification text (required) |
| `title` | Optional notification title |
| `priority` | Priority level (-2 to 1) |
| `sound` | Notification sound name |
| `url` | Optional URL to include |
| `url_title` | Title for the URL |

## Priority Levels

| Priority | Description |
|----------|-------------|
| -2 | Lowest (no sound) |
| -1 | Low (no sound if quiet hours) |
| 0 | Normal (default) |
| 1 | High (bypass quiet hours) |

## Available Sounds

- `pushover` (default)
- `bike`
- `bugle`
- `cashregister`
- `classical`
- `climb`
- `creative`
- `drop`
- `echo`
- `falling`
- `game`
- `gharp`
- `incoming`
- `intercom`
- `magic`
- `mechanical`
- `none`
- `persistent`
- `piano_bar`
- `pop`
- `purr`
- `siren`
- `spacealarm`
- `tugboat`
- `alien`
- `bell`
- `bird`
- `bounce`
- `dent`
- `friendly`
- `glass`
- `gloop`
- `goat`
- `hangout`
- `heartbeat`
- `metallic`
- `motorcycle`
- `notification`
- `open-ended`
- `polished`
- `portal`
- `ringside`
- `sax`
- `score`
- `shield`
- `silence`
- `spiral`
- `typewriter`
- `updown`
- `vibrate`
- `whistle`

## Notes

- Pushover has a 7,500 message/month limit on free accounts
- Rate limit: 1 message per second
- Messages over 1,000 characters are truncated
