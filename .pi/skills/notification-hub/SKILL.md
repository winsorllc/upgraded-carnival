---
name: notification-hub
description: Send notifications to multiple channels. Unified interface for sending alerts via Email, Slack, Discord, Telegram, and SMS.
---

# Notification Hub

Send notifications to multiple channels from a single interface. Supports Email, Slack, Discord, Telegram, SMS, and webhooks.

## Setup

Configure channels via environment variables:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email
- `SLACK_WEBHOOK_URL` - Slack
- `DISCORD_WEBHOOK_URL` - Discord
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` - Telegram

## Usage

### Send Notification

```bash
{baseDir}/notification-hub.js --channel slack --message "Deployment complete"
```

### Send to Multiple Channels

```bash
{baseDir}/notification-hub.js --channel email,slack --subject "Alert" --message "Server down!"
```

### Send with Priority

```bash
{baseDir}/notification-hub.js --channel telegram --priority high --message "Critical error!"
```

## Options

| Option | Description | Required |
|--------|-------------|----------|
| `--channel` | Comma-separated channels (email,slack,discord,telegram,sms) | Yes |
| `--message` | Notification message | Yes |
| `--subject` | Subject for email | No |
| `--priority` | Priority: low, normal, high, critical | No |
| `--title` | Title for rich notifications | No |

## When to Use

- Unified alerting from jobs
- Multi-channel notifications
- Priority-based routing
- Simple notification API
