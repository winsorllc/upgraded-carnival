---
name: wacli
description: Send WhatsApp messages via WhatsApp Business API. Use for automated messaging, notifications, and customer communications.
metadata:
  {
    "openclaw": {
      "emoji": "💬",
      "requires": { "env": ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID"] }
    }
  }
---

# WhatsApp CLI

Send WhatsApp messages via the Business API.

## Prerequisites

1. Create Meta Developer account: https://developers.facebook.com/
2. Create app and add WhatsApp product
3. Get Phone Number ID and Access Token

## Configuration

```bash
export WHATSAPP_TOKEN="your-access-token"
export WHATSAPP_PHONE_ID="your-phone-number-id"
```

Or in `~/.thepopebot/secrets.json`:
```json
{
  "whatsapp_token": "...",
  "whatsapp_phone_id": "..."
}
```

## Usage

Send text message:

```bash
wacli send --to "+15551234567" --message "Hello!"
```

Send template message:

```bash
wacli template --to "+15551234567" --template "hello_world"
```

Send with media:

```bash
wacli send --to "+15551234567" --message "Check this out" --media "https://example.com/image.jpg"
```

Send reaction:

```bash
wacli react --to "+15551234567" --message-id "<msg-id>" --emoji "👍"
```

## Message Types

- Text messages
- Media (images, audio, video, documents)
- Templates (for initiating conversations)
- Reactions
- Labels
