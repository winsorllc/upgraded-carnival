---
name: channel-router
description: Route messages across multiple channels (Telegram, Discord, Slack, WhatsApp) with unified interface and per-channel configuration.
---

# Channel Router Skill

Route messages across multiple messaging channels with unified interface. Inspired by OpenClaw's multi-channel inbox and ZeroClaw's channel system.

## Setup

Configure channels in environment variables:

```bash
# Enable channels
export CHANNEL_TELEGRAM_ENABLED=true
export CHANNEL_DISCORD_ENABLED=true
export CHANNEL_SLACK_ENABLED=true
export CHANNEL_WHATSAPP_ENABLED=true

# Channel-specific config
export TELEGRAM_BOT_TOKEN="..."
export DISCORD_BOT_TOKEN="..."
export SLACK_BOT_TOKEN="..."
```

## Usage

### Send message to channel

```bash
{baseDir}/channel-router.js send telegram --chat-id 123456789 "Hello!"
{baseDir}/channel-router.js send discord --channel C123456 "Hello!"
{baseDir}/channel-router.js send slack --channel C123456 "Hello!"
```

### Broadcast to all channels

```bash
{baseDir}/channel-router.js broadcast "Hello from all channels!"
```

### List configured channels

```bash
{baseDir}/channel-router.js list
```

### Get channel status

```bash
{baseDir}/channel-router.js status telegram
```

### Set up channel routing rules

```bash
{baseDir}/channel-router.js route add --from telegram --to discord
```

## Supported Channels

| Channel | Status | Features |
|---------|--------|----------|
| Telegram | ✓ | Text, media, replies |
| Discord | ✓ | Text, embeds, webhooks |
| Slack | ✓ | Text, blocks, webhooks |
| WhatsApp | ✓ | Text, media |
| Signal | ✓ | Text |
| Matrix | ✓ | Text, E2EE |

## Routing Rules

Configure message routing between channels:
- Forward all messages from A to B
- Filter by keyword/content
- Transform messages (strip quotes, add prefixes)
- Rate limiting per channel
