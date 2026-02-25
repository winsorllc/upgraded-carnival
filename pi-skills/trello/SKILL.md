---
name: trello
description: Manage Trello boards, lists, and cards. Create boards, add members, manage cards, and integrate with workflows.
metadata:
  {
    "openclaw": {
      "emoji": "📋",
      "requires": { "env": ["TRELLO_API_KEY", "TRELLO_TOKEN"] }
    }
  }
---

# Trello CLI

Manage Trello boards, lists, and cards via API.

## Prerequisites

1. Get API key: https://trello.com/app-key
2. Get token: https://trello.com/1/authorize?expiration=1day&scope=read,write&name=PopeBot

## Configuration

```bash
export TRELLO_API_KEY="your-api-key"
export TRELLO_TOKEN="your-token"
```

Or add to `~/.thepopebot/secrets.json`:

```json
{
  "trello_api_key": "...",
  "trello_token": "..."
}
```

## Usage

Boards:

```bash
trello boards list
trello board create "Project Alpha"
trello board show <board-id>
```

Lists:

```bash
trello lists <board-id>
trello list create "To Do" --board <board-id>
```

Cards:

```bash
trello cards <list-id>
trello card create "Task name" --list <list-id>
trello card move <card-id> --list <list-id>
trello card archive <card-id>
```

Members:

```bash
trello member add <email> --board <board-id>
```

## Actions

```bash
trello action create "Buy milk" --list <id> --due "2024-01-15"
trello action complete <card-id>
```
