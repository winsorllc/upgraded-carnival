---
name: line
description: LINE messaging platform integration for chat, stickers, and rich messages.
metadata:
  {
    "openclaw":
      {
        "emoji": "💬",
        "requires": { "env": ["LINE_CHANNEL_ID", "LINE_CHANNEL_SECRET", "LINE_ACCESS_TOKEN"] },
      },
  }
---

# LINE

LINE messaging platform integration for chat, stickers, and rich messages.

## When to Use

✅ **USE this skill when:**

- Messaging users on LINE
- Sending rich messages with buttons/carousels
- LINE Bot development
- LINE Official Account management

## When NOT to Use

❌ **DON'T use this skill when:**

- Non-Japanese/Asian markets where LINE isn't popular
- Simple text notifications (use email, Slack)

## Requirements

Get credentials from LINE Developers Console:
- `LINE_CHANNEL_ID` — Channel ID
- `LINE_CHANNEL_SECRET` — Channel Secret
- `LINE_ACCESS_TOKEN` — Long-lived access token

## Messaging API

### Send Text

```bash
curl -X POST https://api.line.me/v2/bot/message/reply \
  -H "Authorization: Bearer $LINE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "replyToken": "REPLY_TOKEN",
    "messages": [{"type": "text", "text": "Hello!"}]
  }'
```

### Send to Multiple Users

```bash
curl -X POST https://api.line.me/v2/bot/message/multicast \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["USER_ID_1", "USER_ID_2"],
    "messages": [{"type": "text", "text": "Hello all!"}]
  }'
```

### Broadcast

```bash
# Send to all followers
curl -X POST https://api.line.me/v2/bot/message/broadcast \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"type": "text", "text": "Announcement!"}]}'
```

## Rich Messages

### Buttons Template

```json
{
  "type": "template",
  "altText": "Buttons",
  "template": {
    "type": "buttons",
    "thumbnailImageUrl": "https://example.com/image.jpg",
    "title": "Menu",
    "text": "Choose an option",
    "actions": [
      {"type": "message", "label": "Option 1", "text": "opt1"},
      {"type": "uri", "label": "Website", "uri": "https://example.com"}
    ]
  }
}
```

### Carousel Template

```json
{
  "type": "template",
  "altText": "Carousel",
  "template": {
    "type": "carousel",
    "columns": [
      {
        "thumbnailImageUrl": "https://example.com/1.jpg",
        "title": "Item 1",
        "text": "Description 1",
        "actions": [{"type": "message", "label": "Select", "text": "item1"}]
      }
    ]
  }
}
```

### Flex Message

```json
{
  "type": "flex",
  "altText": "Flex Message",
  "contents": {
    "type": "bubble",
    "hero": {"type": "image", "url": "https://example.com/image.jpg"},
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {"type": "text", "text": "Title", "weight": "bold"},
        {"type": "text", "text": "Description"}
      ]
    }
  }
}
```

## Message Types

| Type | Description |
|------|-------------|
| `text` | Plain text |
| `image` | Image |
| `video` | Video |
| `audio` | Audio |
| `file` | File |
| `location` | Location |
| `sticker` | Sticker |
| `template` | Buttons/Carousel/Confirm |
| `flex` | Rich layout |

## LINE Bot Features

### Webhook Events

- `message` — Text, image, video received
- `follow` — User added bot
- `unfollow` — User blocked bot
- `join` — Bot added to group
- `leave` — Bot removed from group
- `postback` — Button/carousel action

### Quick Replies

```json
{
  "type": "text",
  "text": "Select",
  "quickReply": {
    "items": [
      {"type": "action", "action": {"type": "message", "label": "Option 1", "text": "opt1"}}
    ]
  }
}
```

## Notes

- Rate limit: 1000 messages/month (free), unlimited (paid)
- Push messages require LINE Official Account
- Webhook must return 200 within 20 seconds
