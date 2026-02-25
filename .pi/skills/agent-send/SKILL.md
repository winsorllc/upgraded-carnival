---
name: agent-send
description: "Send messages to AI agents in Discord, Telegram, Slack. Use when: delegating tasks conversationally or multi-agent collaboration."
metadata: { "openclaw": { "emoji": "💬", "requires": { "env": ["DISCORD_BOT_TOKEN", "TELEGRAM_BOT_TOKEN"] } } }
---

# Agent Send Skill

Send messages directly to AI agents operating in communication channels (Discord, Telegram, Slack). Enables conversational task delegation and multi-agent collaboration.

## When to Use

✅ **USE this skill when:**
- Delegating tasks to channel-based agents
- Multi-agent conversations
- Agent-to-agent communication
- Collaborative workflows

❌ **DON'T use this skill when:**
- Direct API calls (use http-request)
- In-process function calls (use delegate-task)
- Broadcast messages (use notify skills)

## Platforms

| Platform | Format | Reply Support |
|----------|--------|---------------|
| Discord | Direct message or channel mention | ✅ |
| Telegram | Direct message or group | ✅ |
| Slack | Direct message or channel | ✅ |
| Email | SMTP relay | ✅ |

## Usage

### Discord

```javascript
const { sendToAgent } = require('/job/.pi/skills/agent-send/sender.js');

// Send to specific agent
const result = await sendToAgent('discord', {
  agentId: 'research-bot',
  message: 'Research the latest developments in LLMs',
  channelId: '123456789',
  threadId: null, // optional
  mentionAgent: true
});

console.log(result.messageId);
console.log(result.agentResponse); // if waiting enabled
```

### Telegram

```javascript
await sendToAgent('telegram', {
  agentId: 'assistant',
  message: 'Summarize this article: https://...',
  chatId: '-100123456789',
  parseMode: 'Markdown'
});
```

### Slack

```javascript
await sendToAgent('slack', {
  agentId: 'coding-assistant',
  message: 'Review this PR: #123',
  channelId: 'C123ABC',
  threadTs: '1234567.89' // optional
});
```

### With Conversation Thread

```javascript
// Start conversation
const conversation = await sendToAgent('discord', {
  agentId: 'helper',
  message: 'Help me debug this issue',
  startThread: true
});

// Continue in thread
await sendToAgent('discord', {
  agentId: 'helper',
  message: 'Here is the error log...',
  threadId: conversation.threadId
});
```

### With Attachments

```javascript
await sendToAgent('discord', {
  agentId: 'analyst',
  message: 'Analyze this data',
  channelId: '123456789',
  attachments: [
    { 
      name: 'data.csv', 
      data: Buffer.from('col1,col2\na,b'),
      contentType: 'text/csv'
    }
  ]
});
```

### Wait for Response

```javascript
const { sendToAgentAndWait } = require('/job/.pi/skills/agent-send/sender.js');

const response = await sendToAgentAndWait('telegram', {
  agentId: 'assistant',
  message: 'What is 2 + 2?',
  chatId: '-100123456789',
  timeoutMs: 60000
});

console.log(response.agentMessage);
console.log(response.timestamp);
```

## API

```javascript
sendToAgent(platform, options)
```

**Options:**
- `platform` - discord|telegram|slack|email
- `agentId` - Target agent identifier
- `message` - Message content (required)
- `channelId` / `chatId` - Target channel
- `threadId` / `threadTs` - Thread identifier
- `mentionAgent` - @mention the agent
- `attachments` - File attachments array
- `parseMode` - html|markdown (Telegram)
- `timeoutMs` - Wait timeout for response
- `waitForResponse` - Enable response waiting

**Returns:**
```javascript
{
  success: true,
  platform: 'discord',
  messageId: '123456789',
  channelId: 'ch_abc',
  threadId: 'th_xyz',
  agentResponse: 'I found 5 relevant papers...',
  responseTime: 3420
}
```

## Message Formatting

### Discord

```javascript
// Markdown
await sendToAgent('discord', {
  agentId: 'bot',
  message: '```python\nprint("Hello")```'
});

// Embed (rich formatting)
await sendToAgent('discord', {
  agentId: 'bot',
  message: 'Task request',
  embed: {
    title: 'Research Task',
    description: 'Investigate X...',
    color: 0x00AAFF,
    fields: [
      { name: 'Priority', value: 'High' },
      { name: 'Deadline', value: 'EOD' }
    ]
  }
});
```

### Telegram

```javascript
// HTML
await sendToAgent('telegram', {
  agentId: 'bot',
  message: '<b>Important</b> task',
  parseMode: 'HTML'
});

// Markdown
await sendToAgent('telegram', {
  agentId: 'bot',
  message: '*Bold* and _italic_',
  parseMode: 'Markdown'
});
```

### Slack

```javascript
// Blocks
await sendToAgent('slack', {
  agentId: 'bot',
  message: 'Task request',
  blocks: [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: '*Research Task*\nInvestigate X...' }
    },
    {
      type: 'divider'
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: 'Priority: High' }]
    }
  ]
});
```

## Agent Discovery

```javascript
const { listAgents } = require('/job/.pi/skills/agent-send/sender.js');

const agents = await listAgents('discord');
console.log(agents);
// [
//   { id: 'research-bot', name: 'Research Bot', capabilities: ['search', 'summarize'] },
//   { id: 'coding-assistant', name: 'Code Helper', capabilities: ['code', 'review'] }
// ]
```

## Multi-Agent Workflow

```javascript
async function collaborativeTask(task) {
  // 1. Research
  const research = await sendToAgentAndWait('discord', {
    agentId: 'research-bot',
    message: `Research: ${task}`,
    timeoutMs: 120000
  });

  // 2. Code review
  const codeReview = await sendToAgentAndWait('discord', {
    agentId: 'coding-assistant',
    message: `Review code based on: ${research.agentResponse}`,
    timeoutMs: 60000
  });

  // 3. Summarize
  const summary = await sendToAgentAndWait('discord', {
    agentId: 'summarizer',
    message: `Summarize findings:\n${codeReview.agentResponse}`,
    timeoutMs: 30000
  });

  return summary.agentResponse;
}
```

## Error Handling

```javascript
try {
  await sendToAgent('discord', {
    agentId: 'unknown-bot',
    message: 'Hello'
  });
} catch (error) {
  if (error.code === 'AGENT_NOT_FOUND') {
    console.log('Agent not available');
  } else if (error.code === 'TIMEOUT') {
    console.log('Agent response timeout');
  } else if (error.code === 'PERMISSION_DENIED') {
    console.log('Bot lacks permissions in channel');
  }
}
```

## Bash CLI

```bash
# Send message
node /job/.pi/skills/agent-send/sender.js \
  --platform discord \
  --agent research-bot \
  --channel 123456789 \
  --message "Research topic X"

# With attachment
node /job/.pi/skills/agent-send/sender.js \
  --platform telegram \
  --agent assistant \
  --chat-id -100123456789 \
  --message "Analyze this" \
  --attachment data.csv
```
