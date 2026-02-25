---
name: discord
description: Send messages, manage channels, and interact with Discord via API. Use when: user wants to send notifications to Discord, read messages from channels, or manage Discord webhooks.
---

# Discord Skill

Interact with Discord via webhooks and API.

## When to Use

✅ **USE this skill when:**

- Send a notification to Discord
- Post a message to a channel
- Receive alerts in Discord
- Create Discord webhook integrations

## When NOT to Use

❌ **DON'T use this skill when:**

- Real-time chat interactions → use Discord client
- Bot functionality → use Discord bot API
- Complex message formatting → use Discord directly

## Requirements

- Discord webhook URL OR bot token

## Setup

### Webhook Method (Simplest)

1. Go to Server Settings > Integrations > Webhooks
2. Create a new webhook
3. Copy the webhook URL
4. Set as environment variable:

```bash
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/xxx/xxx"
```

### Bot Token Method

1. Create a Discord application at https://discord.com/developers/applications
2. Add a bot user
3. Get the bot token
4. Set as environment variable:

```bash
export DISCORD_BOT_TOKEN="your-bot-token"
```

## Usage

### Send Webhook Message

```bash
# Simple message
discord-webhook.sh "Hello, Discord!"

# With embed
discord-webhook.sh "Title" --content "Description" --color "ff0000"

# With file
discord-webhook.sh "Check this out" --file /path/to/file.png
```

### Send via Bot

```bash
# Send to channel
discord-send.sh --channel CHANNEL_ID "Hello"

# Send DM
discord-send.sh --user USER_ID "Hello"
```

## Commands

### discord-webhook.sh

Send webhook message.

```bash
./discord-webhook.sh <message> [options]

Options:
  --content TEXT    Message body
  --title TEXT     Embed title
  --color HEX      Embed color
  --file PATH      Attachment file
  --username NAME  Override webhook username
  --avatar URL    Override avatar URL
```

### discord-send.sh

Send message via bot.

```bash
./discord-send.sh [options]

Options:
  --channel ID     Channel ID
  --user ID        User ID (for DM)
  --message TEXT   Message content
  --embed JSON     Embed as JSON
```

## Examples

### Simple Notification

```bash
discord-webhook.sh "Deployment complete!"
```

### Rich Embed

```bash
discord-webhook.sh "" \
  --title "Build Status" \
  --content "✅ Production deployed successfully" \
  --color "00ff00"
```

### Alert on Failure

```bash
if [ $? -ne 0 ]; then
  discord-webhook.sh "❌ Build failed!" \
    --content "Check the logs for details"
fi
```

## Embed Format

```json
{
  "title": "Title",
  "description": "Description",
  "color": 16711680,
  "footer": {"text": "Footer text"},
  "fields": [
    {"name": "Field 1", "value": "Value 1"},
    {"name": "Field 2", "value": "Value 2"}
  ]
}
```

## Notes

- Webhooks are limited to 30 requests per minute
- Bot messages have higher rate limits
- Webhook URLs should be kept secret
- Use embeds for rich formatting
- Supports file attachments (8MB limit for webhooks)
