---
name: whatsapp-integration
description: Send messages via WhatsApp using WhatsApp Business API. Post messages to WhatsApp channels.
---

# WhatsApp Integration

Send messages via WhatsApp using WhatsApp Business API or WhatsApp Web.

## Setup

Requires WhatsApp Business API credentials or a configured WhatsApp Web session:
- `WHATSAPP_API_URL` - WhatsApp Business API URL
- `WHATSAPP_API_TOKEN` - WhatsApp Business API token

Or use the unofficial WhatsApp Web approach with session files.

## Usage

### Send Text Message

```bash
{baseDir}/whatsapp-send.js --to "+1234567890" --message "Hello from WhatsApp!"
```

### Send with Media

```bash
{baseDir}/whatsapp-send.js --to "+1234567890" --message "Check this out!" --media "https://example.com/image.jpg"
```

### Send to Group

```bash
{baseDir}/whatsapp-send.js --to "group-id" --message "Group message!" --group
```

## Options

| Option | Description | Required |
|--------|-------------|----------|
| `--to` | Recipient phone number or group ID | Yes |
| `--message` | Message content | Yes |
| `--media` | Media URL to send | No |
| `--caption` | Caption for media | No |
| `--group` | Target is a group | No |

## When to Use

- Sending notifications via WhatsApp
- Alerting users about job completion
- Two-way messaging with users

## Notes

- WhatsApp Business API requires approved business account
- For personal accounts, consider using WhatsApp Web with a session
