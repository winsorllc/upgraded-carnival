---
name: Chat Command Processor
author: PopeBot
description: Parse and execute chat-style slash commands (/status, /help, /info). Supports interactive terminal command patterns.
version: "1.0.0"
tags:
  - chat
  - commands
  - interactive
  - terminal
  - slash-commands
---

# Chat Command Processor

Parse and execute chat-style slash commands similar to Discord/Slack/Telegram bots. Supports /status, /help, /info, and custom commands.

## When to Use

Use the chat-command-processor skill when you need to:
- Create chat-style command interfaces
- Parse slash commands from user input
- Build interactive CLI tools
- Process bot commands
- Handle command routing

## Built-in Commands

- `/status` - Show system status
- `/help [command]` - Show help menu
- `/info` - Show version info
- `/ping` - Test connectivity
- `/echo [text]` - Echo back text
- `/time` - Show current time
- `/clear` - Clear screen

## Usage Examples

Process a command:
```bash
node /job/.pi/skills/chat-command-processor/cmd.js process "/status"
```

Show help:
```bash
node /job/.pi/skills/chat-command-processor/cmd.js process "/help status"
```

Interactive mode:
```bash
node /job/.pi/skills/chat-command-processor/cmd.js --interactive
```

Add custom commands by editing the commands.json file.