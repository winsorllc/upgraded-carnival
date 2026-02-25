---
name: slack-notify
description: Send Slack messages via incoming webhook. Use for notifications, alerts, and status updates to Slack channels.
metadata:
  {
    "thepopebot":
      {
        "emoji": "💬",
        "requires": { "env": ["SLACK_WEBHOOK_URL"] },
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

# Slack Notify Skill

Send messages to Slack channels using incoming webhooks.

## Setup

1. In Slack, go to Channel Settings → Apps → Add an App → Search "Incoming Webhooks"
2. Configure the webhook and copy the URL
3. Set as GitHub secret: `AGENT_LLM_SLACK_WEBHOOK_URL`

## Usage

```javascript
const { sendSlackMessage } = require('./index.js');

// Simple message
await sendSlackMessage('Hello from PopeBot!');

// Formatted message with blocks
await sendSlackMessage('Job Complete', {
  blocks: [
    {
      type: 'header',
      text: { type: 'plain_text', text: '🎉 Task Completed' }
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: 'The job finished successfully in *5 minutes*.' }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View Logs' },
          url: 'https://example.com/logs'
        }
      ]
    }
  ]
});

// Thread reply
await sendSlackMessage('Update on above', { thread_ts: '1234567890.123456' });
```

## Features

- Plain text and formatted messages (mrkdwn)
- Interactive blocks (buttons, selects, inputs)
- Thread replies
- User mentions (`<@USER_ID>`)
- Channel mentions (`#channel`)
- Attachments with colors
- Custom icons and usernames

## Rate Limits

Slack webhooks are rate limited. The skill includes automatic retry with exponential backoff.
