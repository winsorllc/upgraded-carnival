---
name: twitch
description: Twitch chat integration for streaming, chat commands, and live notifications.
metadata:
  {
    "openclaw":
      {
        "emoji": "🎮",
        "requires": { "env": ["TWITCH_USERNAME", "TWITCH_OAUTH_TOKEN", "TWITCH_CLIENT_ID"] },
      },
  }
---

# Twitch

Twitch chat integration for streaming, chat commands, and live notifications.

## When to Use

✅ **USE this skill when:**

- Responding to Twitch chat messages
- Building Twitch chat bots
- Streamer automation
- Live notifications for stream events

## When NOT to Use

❌ **DON'T use this skill when:**

- Non-Twitch streaming platforms (use YouTube, Kick)
- Non-chat interactions (use Discord)

## Requirements

Set these environment variables:
- `TWITCH_USERNAME` — Bot's Twitch username
- `TWITCH_OAUTH_TOKEN` — OAuth token (format: `oauth:xxx`)
- `TWITCH_CLIENT_ID` — Client ID from Twitch Developer Portal
- `TWITCH_CHANNEL` — Channel to join

## Getting Credentials

1. Create a Twitch account for your bot
2. Go to [Twitch Token Generator](https://twitchtokengenerator.com/)
3. Select **Bot Token** with scopes: `chat:read`, `chat:write`
4. Copy the Access Token (add `oauth:` prefix)
5. Get Client ID from Twitch Developer Portal

## Configuration

```json
{
  "channels": {
    "twitch": {
      "enabled": true,
      "username": "your_bot",
      "accessToken": "oauth:abc123...",
      "clientId": "xyz789...",
      "channel": "streamer_name"
    }
  }
}
```

### Access Control

```json
{
  "requireMention": false,
  "allowFrom": ["123456789"],
  "allowedRoles": ["moderator", "vip", "subscriber"]
}
```

## Commands

### Send Message

```bash
# Send to chat
twitch send "#channel Hello world!"

# Send to own channel
twitch send "Hello viewers!"
```

### Stream Events

```bash
# Listen for follows
twitch listen follow

# Listen for subscriptions
twitch listen sub

# Listen for raids
twitch listen raid
```

### Moderation

```bash
# Timeout user
twitch timeout username 600

# Ban user
twitch ban username "Reason"

# Delete message
twitch delete MESSAGE_ID
```

## Bot Commands (Chat)

Common chat bot patterns:

```
!hello - Greet the user
!uptime - Show stream uptime
!game - Show current game
!socials - Show social media links
!commands - List available commands
```

## Events

| Event | Description |
|-------|-------------|
| `follow` | New follower |
| `sub` | New subscriber |
| `resub` | Resubscription |
| `raid` | Raiding channel |
| `gift` | Subscription gift |
| `chat` | Chat message |
| `host` | Hosting another channel |

## Notes

- Rate limit: 20 messages per second
- Requires `#chat:read` and `#chat:write` scopes
- OAuth token must be refreshed periodically
