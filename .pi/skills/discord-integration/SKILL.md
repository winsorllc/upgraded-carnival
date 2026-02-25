---
name: discord-integration
description: Send messages and manage Discord webhooks. Post messages to Discord channels via webhooks or bot API.
---

# Discord Integration

Send messages to Discord channels via webhooks or bot API. Supports rich embeds, files, and reactions.

## Setup

Requires a Discord webhook URL or bot token. Set either:
- `DISCORD_WEBHOOK_URL` - For simple webhook-based messaging
- `DISCORD_BOT_TOKEN` - For bot API access with more features

## Usage

### Send a Simple Message

```bash
{baseDir}/discord-send.js --webhook "https://discord.com/api/webhooks/..." --content "Hello Discord!"
```

### Send an Embed

```bash
{baseDir}/discord-send.js --webhook "https://discord.com/api/webhooks/..." --embed '{"title": "Hello", "description": "Message body", "color": 16711680}'
```

### Send with Bot Token

```bash
{baseDir}/discord-send.js --channel "123456789" --content "Hello from bot!" --token "$DISCORD_BOT_TOKEN"
```

## Options

| Option | Description | Required |
|--------|-------------|----------|
| `--webhook` | Discord webhook URL | Yes* |
| `--channel` | Discord channel ID (for bot) | Yes* |
| `--content` | Message content | Yes |
| `--embed` | JSON string for embed | No |
| `--username` | Override webhook username | No |
| `--avatar-url` | Override webhook avatar | No |
| `--token` | Discord bot token | For bot mode |
| `--file` | Path to file to attach | No |

## Embed Format

```json
{
  "title": "Embed Title",
  "description": "Main content",
  "color": 16711680,
  "fields": [
    {"name": "Field 1", "value": "Value 1", "inline": true}
  ],
  "footer": {"text": "Footer text"},
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## When to Use

- Sending notifications to Discord from jobs
- Posting job results to Discord channels
- Creating rich status updates with embeds
