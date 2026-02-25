---
name: slack-integration
description: Send messages and manage Slack integrations. Post messages to Slack channels via webhooks or bot API.
---

# Slack Integration

Send messages to Slack channels via webhooks or bot API. Supports rich blocks, files, and interactive messages.

## Setup

Requires a Slack webhook URL or bot token. Set either:
- `SLACK_WEBHOOK_URL` - For simple webhook-based messaging
- `SLACK_BOT_TOKEN` - For bot API access with more features

## Usage

### Send a Simple Message

```bash
{baseDir}/slack-send.js --webhook "https://hooks.slack.com/..." --text "Hello Slack!"
```

### Send with Blocks (Rich UI)

```bash
{baseDir}/slack-send.js --webhook "https://hooks.slack.com/..." --blocks '[{"type": "section", "text": {"type": "mrkdwn", "text": "Hello *World*!"}}]'
```

### Send via Bot API

```bash
{baseDir}/slack-send.js --channel "C123456" --text "Hello from bot!" --token "$SLACK_BOT_TOKEN"
```

## Options

| Option | Description | Required |
|--------|-------------|----------|
| `--webhook` | Slack webhook URL | Yes* |
| `--channel` | Slack channel ID (for bot) | Yes* |
| `--text` | Message text (fallback for rich messages) | Yes |
| `--blocks` | JSON string for Slack blocks | No |
| `--username` | Override webhook username | No |
| `--icon-emoji` | Override webhook icon (e.g., :robot:) | No |
| `--token` | Slack bot token | For bot mode |

## Block Kit Examples

Simple section:
```json
[{"type": "section", "text": {"type": "mrkdwn", "text": "Hello *World*!"}}]
```

With button:
```json
[
  {"type": "section", "text": {"type": "mrkdwn", "text": "Click the button:"}},
  {"type": "actions", "elements": [{"type": "button", "text": {"type": "plain_text", "text": "Click Me"}, "action_id": "button_click"}]}
]
```

## When to Use

- Sending notifications to Slack from jobs
- Posting job results with rich formatting
- Creating interactive messages with buttons
