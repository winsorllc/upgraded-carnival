---
name: slack-cli
description: Send messages and manage Slack channels via webhooks and API. Use for notifications, alerts, and Slack integrations.
metadata:
  {
    "openclaw": {
      "emoji": "💬",
      "requires": { "env": ["SLACK_WEBHOOK_URL", "SLACK_BOT_TOKEN"] }
    }
  }
---

# Slack CLI

Send messages and manage Slack integrations.

## When to Use

✅ **USE this skill when:**

- Send notifications to Slack channels
- Post alerts to Slack
- Create Slack webhook integrations
- Send direct messages via bot

## When NOT to Use

❌ **DON'T use this skill when:**

- Real-time chat interactions → use Slack client
- Complex Slack apps → use Slack SDK directly

## Requirements

- Slack webhook URL OR bot token

## Setup

### Webhook Method (Simplest)

1. Go to https://api.slack.com/apps
2. Create new app > "From scratch"
3. Activate Incoming Webhooks
4. Add new webhook to channel
5. Set environment variable:

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/xxx/xxx/xxx"
```

### Bot Token Method

1. Create Slack app at https://api.slack.com/apps
2. Add OAuth scopes: `chat:write`, `channels:read`, `im:write`
3. Install to workspace
4. Set environment variable:

```bash
export SLACK_BOT_TOKEN="xoxb-your-token"
export SLACK_TEAM_ID="your-team-id"
```

## Usage

### Send Webhook Message

```bash
# Simple message
slack-webhook.sh "Hello, Slack!"

# With blocks
slack-webhook.sh --blocks '{"type": "section", "text": {"type": "mrkdwn", "text": "Hello!"}}'

# With attachment
slack-webhook.sh "Build complete" --color "good"
```

### Send via Bot API

```bash
# Send to channel
slack-send.sh --channel C123456 "Hello"

# Send DM
slack-send.sh --user U123456 "Hello"

# Post to thread
slack-send.sh --channel C123456 --thread_ts "1234567890.123" "Reply"
```

### List Channels

```bash
slack-channels.sh
```

### Send File

```bash
slack-upload.sh --channel C123456 --file /path/to/file.txt --title "Report"
```

## Commands

### slack-webhook.sh

Send webhook message.

```bash
slack-webhook.sh <message> [options]

Options:
  --channel ID     Override default channel
  --username NAME  Custom username
  --icon EMOJI     Custom icon (e.g., :robot_face:)
  --color HEX      Attachment color (good/warning/danger or hex)
  --blocks JSON    Block Kit JSON
  --file PATH      File to upload
```

### slack-send.sh

Send message via bot API.

```bash
slack-send.sh [options]

Options:
  --channel ID      Channel ID (C...)
  --user ID         User ID for DM (U...)
  --thread_ts ID    Thread to reply to
  --message TEXT    Message content
  --blocks JSON     Block Kit JSON
```

### slack-channels.sh

List channels.

```bash
slack-channels.sh [--excludearchived]
```

### slack-upload.sh

Upload file to Slack.

```bash
slack-upload.sh --channel ID --file PATH --title "Name"
```

## Block Kit Examples

### Section with button:

```bash
slack-webhook.sh "" --blocks '{
  "type": "section",
  "text": {"type": "mrkdwn", "text": "Deployment ready"},
  "accessory": {
    "type": "button",
    "text": {"type": "plain_text", "text": "Deploy"},
    "action_id": "deploy"
  }
}'
```

### List:

```bash
slack-webhook.sh "" --blocks '[
  {"type": "section", "text": {"type": "mrkdwn", "text": "*Features:*"}},
  {"type": "section", "text": {"type": "mrkdwn", "text": "• New dashboard"}},
  {"type": "section", "text": {"type": "mrkdwn", "text": "• Dark mode"}}
]'
```

## Examples

### Simple Notification

```bash
slack-webhook.sh "🚀 Deployment complete!"
```

### Build Status

```bash
if [ $? -eq 0 ]; then
  slack-webhook.sh "✅ Build succeeded" --color "good"
else
  slack-webhook.sh "❌ Build failed" --color "danger"
fi
```

### Alert with Details

```bash
slack-webhook.sh "⚠️ High CPU Usage" \
  --color "warning" \
  --blocks '{
    "type": "section",
    "fields": [
      {"type": "mrkdwn", "text": "*Server:*\nprod-api-01"},
      {"type": "mrkdwn", "text": "*CPU:*\n92%"}
    ]
  }'
```

## Notes

- Webhooks are simpler but less flexible
- Bot tokens allow full API access
- Rate limits: ~50 messages per minute per channel
- Block Kit provides rich formatting: https://api.slack.com/block-kit
