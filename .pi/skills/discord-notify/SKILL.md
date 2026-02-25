---
name: discord-notify
description: Send Discord messages and notifications via webhook. Use when you need to post alerts, updates, or messages to Discord channels without full bot setup.
metadata:
  {
    "thepopebot":
      {
        "emoji": "🎮",
        "requires": { "env": ["DISCORD_WEBHOOK_URL"] },
        "install":
          [
            {
              "id": "npm",
              "kind": "node",
              "package": "axios",
              "label": "Install axios for HTTP requests",
            },
          ],
      },
  }
---

# Discord Notify Skill

Send messages to Discord channels using incoming webhooks.

## Setup

1. In Discord, go to Channel Settings → Integrations → Webhooks
2. Create a new webhook and copy the URL
3. Set as GitHub secret: `AGENT_LLM_DISCORD_WEBHOOK_URL`

## Usage

```javascript
const { sendDiscordMessage } = require('./index.js');

// Simple message
await sendDiscordMessage('Hello from PopeBot!');

// Rich embed
await sendDiscordMessage('', {
  embeds: [{
    title: 'Job Complete',
    description: 'The task finished successfully',
    color: 0x00ff00,
    fields: [
      { name: 'Duration', value: '5 minutes', inline: true },
      { name: 'Status', value: 'Success', inline: true }
    ],
    timestamp: new Date().toISOString()
  }]
});

// With mentions
await sendDiscordMessage('Task done <@123456789>!');
```

## Features

- Plain text messages
- Rich embeds with fields
- User mentions (`<@USER_ID>`)
- Role mentions (`<@&ROLE_ID>`)
- Timestamps
- Color-coded embeds
- Thumbnail and images

## Rate Limits

Discord webhooks are rate limited to ~30 requests per minute. The skill includes automatic retry logic.
