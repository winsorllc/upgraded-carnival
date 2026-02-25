---
name: feishu
description: Send messages and manage webhooks for Feishu/Lark (ByteDance's enterprise communication platform).
metadata:
  {
    "zeroclaw":
      {
        "emoji": "✈️",
        "requires": { "env": ["FEISHU_APP_ID", "FEISHU_APP_SECRET"] },
      },
  }
---

# Feishu / Lark

Send messages and manage webhooks for Feishu (飞书), ByteDance's enterprise communication platform.

## When to Use

✅ **USE this skill when:**

- Sending notifications to Feishu/Lark channels
- Integrating with ByteDance enterprise tools
- Building workflows with Feishu bots

## When NOT to Use

❌ **DON'T use this skill when:**

- Non-enterprise communication (use Slack, Discord)
- Consumer messaging (use Telegram, WhatsApp)

## Requirements

Set these environment variables:
- `FEISHU_APP_ID` — Your Feishu application ID
- `FEISHU_APP_SECRET` — Your Feishu application secret

Or use webhook URL directly for simple integrations.

## Usage

### Webhook (Simplest)

```bash
# Send text message via webhook
curl -X POST "https://open.feishu.cn/open-apis/bot/v2/hook/WEBHOOK_ID" \
  -H "Content-Type: application/json" \
  -d '{"msg_type": "text", "content": {"text": "Hello!"}}'
```

### Rich Messages

```json
{
  "msg_type": "post",
  "content": {
    "post": {
      "zh_cn": {
        "title": "Notification",
        "content": [[{"tag": "text", "text": "Bold text"}]]
      }
    }
  }
}
```

### Interactive Cards

```json
{
  "msg_type": "interactive",
  "card": {
    "header": {
      "title": {"tag": "plain_text", "content": "Alert"},
      "template": "red"
    },
    "elements": [
      {
        "tag": "action",
        "actions": [
          {
            "tag": "button",
            "text": {"tag": "plain_text", "content": "View"},
            "type": "primary",
            "url": "https://example.com"
          }
        ]
      }
    ]
  }
}
```

### Message Types

| Type | Description |
|------|-------------|
| `text` | Plain text |
| `post` | Rich post with formatting |
| `image` | Image by image_key |
| `interactive` | Card with buttons/inputs |
| `share_chat` | Share to group |

## Bot Events

Subscribe to events:
- `im.message.receive_v1` — Message received
- `im.message.message_read_v1` — Message read
- `contact.user.created` — User added

## Notes

- Feishu = 飞书 (Chinese version)
- Lark = International version
- Both use same API with different base URLs
- Rate limit: 100 requests/second for webhooks
