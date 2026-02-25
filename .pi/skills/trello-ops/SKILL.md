---
name: trello-ops
description: Manage Trello boards, lists, and cards via REST API. Use for task management, project tracking, and kanban automation.
metadata:
  {
    "thepopebot":
      {
        "emoji": "📋",
        "requires": { "env": ["TRELLO_API_KEY", "TRELLO_TOKEN"] },
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

# Trello Operations Skill

Manage Trello boards, lists, and cards programmatically.

## Setup

1. Get API key from: https://trello.com/app-key
2. Generate token via the link on that page
3. Set as GitHub secrets: `AGENT_LLM_TRELLO_API_KEY` and `AGENT_LLM_TRELLO_TOKEN`

## Usage

```javascript
const trello = require('./index.js');

// List all boards
const boards = await trello.listBoards();

// Create a card
const card = await trello.createCard({
  idList: 'list-id-here',
  name: 'Task Title',
  desc: 'Task description'
});

// Move a card to another list
await trello.moveCard(cardId, newListId);

// Add comment to card
await trello.addComment(cardId, 'Progress update...');

// Search cards by label
const cards = await trello.getCardsByLabel('bug');
```

## API Reference

- `listBoards()` - Get all boards
- `getLists(boardId)` - Get lists in a board
- `getCards(listId)` - Get cards in a list
- `createCard({idList, name, desc, idLabels})` - Create a card
- `moveCard(cardId, idList, pos)` - Move card to list
- `addComment(cardId, text)` - Add comment to card
- `archiveCard(cardId)` - Archive a card
- `getCardsByLabel(labelName)` - Find cards with label
- `getCard(cardId)` - Get card details

## Rate Limits

- 300 requests per 10 seconds per API key
- 100 requests per 10 seconds per token
