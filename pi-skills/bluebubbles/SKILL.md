---
name: bluebubbles
description: Send and manage iMessages via BlueBubbles server. Use when you need to send texts, attachments, reactions (tapbacks), edit/unsend messages, reply in threads, and manage iMessage conversations on macOS.
metadata:
  {
    "openclaw": {
      "emoji": "🫧",
      "requires": { "config": ["channels.bluebubbles"] }
    }
  }
---

# BlueBubbles iMessage Integration

Send and manage iMessages through the BlueBubbles server API.

## Capabilities

- **Send** text messages and attachments
- **React** to messages with tapbacks (❤️, 😂, 😮, 😢, 👍, 👎)
- **Edit** previously sent messages
- **Unsend** messages
- **Reply** in threads
- **Manage** group chat participants, names, and icons

## Prerequisites

- BlueBubbles server running on macOS
- API key configured in settings
- Server URL configured

## Configuration

```json
{
  "channels": {
    "bluebubbles": {
      "url": "http://localhost:4567",
      "apiKey": "your-api-key"
    }
  }
}
```

## Usage

Send a message:

```bash
bluebubbles send --target "+15551234567" --message "Hello from PopeBot"
```

Send to a chat GUID:

```bash
bluebubbles send --chat-guid "iMessage;+15551234567;123" --message "Hello"
```

React to a message:

```bash
bluebubbles react --target "+15551234567" --message-id "<guid>" --emoji "❤️"
```

Send attachment:

```bash
bluebubbles send --target "+15551234567" --attachment "/path/to/image.jpg"
```

## Target Formats

- Phone: `+15551234567`
- Email: `user@example.com`
- Chat GUID: `iMessage;+15551234567;123` (preferred for precision)
