---
name: imsg
description: iMessage/SMS CLI for listing chats, history, and sending messages via Messages.app on macOS. Use when you need to read or send iMessages from the command line.
---

# imsg

iMessage/SMS CLI for macOS Messages.app.

## Install

```bash
brew install steipete/tap/imsg
```

## When to Use

✅ **USE when:**
- User asks to send iMessage or SMS
- Reading iMessage conversation history
- Checking recent Messages.app chats
- Sending to phone numbers or Apple IDs

❌ **DON'T use when:**
- Telegram messages → use telegram skill
- Signal messages → use Signal skill
- WhatsApp messages → use WhatsApp skill
- Discord/Slack messages → use respective skills

## Quick Start

```bash
# List recent chats
imsg chats

# Show chat history
imsg history "+15551234567"
imsg history "friend@icloud.com"

# Send message
imsg send "+15551234567" "Hello!"
imsg send "friend@icloud.com" "Hi there!"

# Search messages
imsg search "keyword"
```

## Commands

| Command | Description |
|---------|-------------|
| `chats` | List recent conversations |
| `history <contact>` | Show message history |
| `send <contact> <msg>` | Send a message |
| `search <query>` | Search messages |
| `attachments <chat>` | List attachments |

## Options

| Flag | Description |
|------|-------------|
| `--limit N` | Number of messages |
| `--since <date>` | Messages since date |
| `--json` | JSON output |

## Notes

- Only works on macOS (requires Messages.app)
- Requires permission to control Messages.app
- Supports both iMessage and SMS
- Group chat management not supported
- Always confirm before bulk messaging
