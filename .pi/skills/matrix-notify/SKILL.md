---
name: matrix-notify
description: Send messages to Matrix (Element) chat rooms. Support for text, markdown, HTML, images, and file attachments.
metadata:
  {
    "thepopebot":
      {
        "emoji": "💬",
        "version": "1.0.0",
        "features": ["matrix-protocol", "rich-messages", "file-upload", "room-management"]
      }
  }
---

# Matrix Notify — Matrix Protocol Messaging

Send messages to Matrix (Element) chat rooms with support for rich formatting and file uploads.

## Overview

This skill provides:
- **Text Messages**: Plain text, markdown, and HTML
- **Rich Content**: Images, files, and code blocks
- **Room Management**: Join, leave, and list rooms
- **Thread Support**: Reply to specific messages
- **Typing Indicators**: Show typing status
- **Read Receipts**: Mark messages as read

## Configuration

```json
{
  "homeserver": "https://matrix.org",
  "access_token": "YOUR_ACCESS_TOKEN",
  "default_room": "!roomid:matrix.org"
}
```

## API

```javascript
const { sendMessage, uploadFile } = require('./matrix-notify');

// Send text message
await sendMessage({
  room: '!roomid:matrix.org',
  text: 'Hello from PopeBot!',
  format: 'markdown'
});

// Send image
await uploadFile({
  room: '!roomid:matrix.org',
  file: '/path/to/image.png',
  caption: 'Check this out'
});
```

## CLI

```bash
matrix-notify send --room "!roomid:matrix.org" --text "Hello!"
matrix-notify upload --room "!roomid:matrix.org" --file image.png
matrix-notify rooms
```
