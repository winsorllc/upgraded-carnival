---
name: poll-create
description: "Create interactive polls in Discord, Telegram, and Slack. Use when: gathering team feedback, making decisions, or engagement."
metadata: { "openclaw": { "emoji": "📊", "requires": { "env": ["DISCORD_BOT_TOKEN", "TELEGRAM_BOT_TOKEN"] } } }
---

# Poll Create Skill

Create interactive polls across multiple platforms: Discord, Telegram, and Slack. Supports multiple choice, anonymous voting, and timed polls.

## When to Use

✅ **USE this skill when:**
- Gathering team feedback
- Making group decisions
- Community engagement
- Surveys and voting

❌ **DON'T use this skill when:**
- Single-person decisions
- Secure/anonymous voting needed (use dedicated tools)
- Complex survey logic

## Platform Support

| Feature | Discord | Telegram | Slack |
|---------|---------|----------|-------|
| Native Polls | ✅ | ✅ | ❌ |
| Emoji Reactions | ✅ | ✅ | ✅ |
| Anonymous | ❌ | ✅ | ✅ |
| Duration | 1hr-7days | 5s-10min | Custom |
| Max Options | 10 | 10 | ∞ |

## Usage

### Discord (Native Polls)

```javascript
const { createPoll } = require('/job/.pi/skills/poll-create/poll.js');

await createPoll('discord', {
  channelId: '123456789',
  question: 'What feature should we build next?',
  options: ['AI Chat', 'Voice Support', 'Mobile App', 'API'],
  durationHours: 24,
  anonymous: false
});
```

### Telegram

```javascript
await createPoll('telegram', {
  chatId: '-100123456789',
  question: 'Meeting time?',
  options: ['9AM', '10AM', '11AM', '2PM'],
  durationSeconds: 300,
  multipleSelection: false,
  anonymous: true
});
```

### Slack (emoji reactions)

```javascript
await createPoll('slack', {
  channelId: 'C123ABC',
  question: 'Pizza toppings?',
  options: ['🍄 Mushrooms', '🫑 Peppers', '🥓 Bacon', '🧀 Extra Cheese'],
  durationHours: 2
});
```

### Bash

```bash
node /job/.pi/skills/poll-create/poll.js \
  --platform discord \
  --channel 123456789 \
  --question "What's your favorite language?" \
  --options "Python,JavaScript,Rust,Go" \
  --duration 24
```

## API

```javascript
createPoll(platform, options)
```

**Options:**
- `platform` - discord|telegram|slack
- `channelId` / `chatId` - Target channel
- `question` - Poll question (required)
- `options` - Array of choices (2-10, required)
- `durationHours` - Duration in hours
- `durationSeconds` - Duration in seconds
- `multipleSelection` - Allow multiple choices
- `anonymous` - Hide voter identities

**Returns:**
```javascript
{
  success: true,
  pollId: "123456789",
  messageId: "987654321",
  url: "https://discord.com/channels/.../..."
}
```

## Poll Results

```javascript
const results = await getPollResults('discord', {
  messageId: '987654321'
});

console.log(results);
// {
//   question: "What feature...",
//   totalVotes: 42,
//   options: [
//     { text: "AI Chat", votes: 15, percentage: 35.7 },
//     { text: "Voice Support", votes: 12, percentage: 28.6 },
//     ...
//   ],
//   closed: false
// }
```

## Examples

### Quick Team Decision

```javascript
await createPoll('discord', {
  channelId: process.env.DISCORD_CHANNEL,
  question: 'Deploy today or wait until Monday?',
  options: ['Deploy Today 🚀', 'Wait Until Monday ⏰'],
  durationHours: 4
});
```

### Multi-Choice Survey

```javascript
await createPoll('telegram', {
  chatId: '-100123456789',
  question: 'Which workshops interest you?',
  options: ['ML Basics', 'Advanced NLP', 'Computer Vision', 'MLOps'],
  multipleSelection: true,
  durationHours: 48
});
```

### Anonymous Feedback

```javascript
await createPoll('slack', {
  channelId: 'C123ABC',
  question: 'Rate the sprint:',
  options: ['😡 Terrible', '😕 Bad', '😐 OK', '😊 Good', '🎉 Great'],
  anonymous: true
});
```

## Error Handling

```javascript
try {
  await createPoll('discord', {
    channelId: 'invalid',
    question: 'Test',
    options: ['A', 'B']
  });
} catch (error) {
  console.error('Poll creation failed:', error.message);
  // Common errors:
  // - "Invalid channel ID"
  // - "Bot lacks permissions"
  // - "Duration out of range"
  // - "Too many options"
}
```

## Platform-Specific Limits

**Discord:**
- Duration: 1 hour to 7 days
- Options: 2-10
- Requires SEND_MESSAGES + ADD_REACTIONS permissions

**Telegram:**
- Duration: 5 seconds to 10 minutes (600s)
- Options: 2-10
- Supports quiz mode with correct answers

**Slack:**
- No native polls (uses emoji reactions)
- Options limited by emoji availability
- Requires reactions:write scope
