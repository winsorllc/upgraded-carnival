---
name: pushover
description: Send instant push notifications to mobile/desktop via Pushover API. Use for urgent alerts, job completion notifications, or time-sensitive messages that need immediate attention.
homepage: https://pushover.net/api
metadata: { "popebot": { "emoji": "🔔" } }
---

# Pushover Notification Skill

Send instant push notifications to your mobile phone and desktop via the Pushover API.

## When to Use

✅ **USE this skill when:**

- Job completion notifications requiring immediate attention
- Urgent alerts (errors, failures, time-sensitive events)
- High-priority status updates
- When the user needs to be notified NOW (not via email)
- Supplementing email notifications for critical messages

❌ **DON'T use this skill when:**

- Long-form reports or detailed documentation (use email instead)
- Non-urgent updates that can wait
- Bulk notifications (Pushover has rate limits)

## Configuration

Pushover requires two credentials (set as GitHub Secrets with `AGENT_LLM_` prefix):

- `AGENT_LLM_PUSHOVER_TOKEN` - Your application API token (get from https://pushover.net/apps/build)
- `AGENT_LLM_PUSHOVER_USER_KEY` - Your user key (get from https://pushover.net)

### Setup

1. Create a Pushover account at https://pushover.net
2. Install the Pushover app on your phone (iOS/Android)
3. Register a new application at https://pushover.net/apps/build
4. Copy your **API Token** and **User Key**
5. Set as GitHub Secrets:
   ```bash
   npx thepopebot set-agent-llm-secret PUSHOVER_TOKEN "your-token"
   npx thepopebot set-agent-llm-secret PUSHOVER_USER_KEY "your-user-key"
   ```

## Usage

```javascript
await context.tools.send_pushover({
  to: "user-key-or-device",  // Optional, defaults to PUSHOVER_USER_KEY
  message: "Job complete: Analysis finished",
  title: "PopeBot Alert",    // Optional
  priority: 0,               // -2 to 2 (see below)
  url: "https://...",        // Optional link
  urlTitle: "View Details"   // Optional URL label
});
```

### Priority Levels

| Priority | Behavior |
|----------|----------|
| `-2`     | No notification, always silent |
| `-1`     | Quiet notification (no sound/vibration) |
| `0`      | Normal priority (default) |
| `1`      | High priority (bypasses quiet hours) |
| `2`      | Emergency (repeats every 60s until acknowledged) |

### Options

- `to` - User key or device identifier (optional, defaults to configured user)
- `message` - Main notification text (required, max 1024 chars)
- `title` - App title/discrete label (optional, max 250 chars)
- `priority` - Priority level -2 to 2 (default: 0)
- `url` - Supplementary URL to attach (optional)
- `urlTitle` - Custom text for the URL button (optional)
- `sound` - Custom sound name (optional, see Pushover docs)
- `device` - Specific device to target (optional)

## Examples

### Simple notification
```javascript
await context.tools.send_pushover({
  message: "Daily backup completed successfully"
});
```

### High-priority alert
```javascript
await context.tools.send_pushover({
  title: "⚠️ Error Alert",
  message: "Pipeline failed at step: build",
  priority: 2,
  url: "https://github.com/.../actions/runs/123",
  urlTitle: "View Logs"
});
```

### Job completion with link
```javascript
await context.tools.send_pushover({
  title: "Research Complete",
  message: "Analysis of 50 documents finished. 3 key findings.",
  priority: 1,
  url: "https://.../pr/42",
  urlTitle: "Review PR"
});
```

## Tips

- Keep messages concise (under 200 chars for best visibility)
- Use priority `2` sparingly (emergency alerts only)
- Include URLs for quick access to related resources
- Use emoji in titles for visual scanning (🔔 ⚠️ ✅ ❌)
- Priority `-1` is good for informational updates during off-hours

## Rate Limits

- 750 messages per hour per user
- 10,000 messages per month (free tier)
- Emergency priority (2) has additional limits

For bulk notifications, consider batching or using the email skill instead.
