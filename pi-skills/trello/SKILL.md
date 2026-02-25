---
name: trello
description: "Manage Trello boards, lists, and cards via the Trello REST API. Use when: user wants to create boards, manage lists, create/move/archive cards, or integrate with Trello workflows. Requires: Trello API key and token."
metadata:
  openclaw:
    emoji: "📋"
    requires:
      bins:
        - curl
        - jq
    env:
      - TRELLO_API_KEY
      - TRELLO_TOKEN
---

# Trello Skill

Interact with Trello boards, lists, and cards via the Trello REST API.

## When to Use

✅ **USE this skill when:**

- Create and manage Trello boards
- Add, move, or archive cards
- Create lists on boards
- Search cards across boards
- Integrate Trello into workflows

❌ **DON'T use this skill when:**

- Need real-time sync
- Need Trello Power-Up features
- Bulk operations (rate limited)

## Prerequisites

1. Get API key: https://trello.com/app-key
2. Get token: Use the URL from step 1 after logging in
3. Set environment variables

```bash
export TRELLO_API_KEY="your_api_key"
export TRELLO_TOKEN="your_token"
```

## Commands

### Boards

```bash
# List your boards
curl -s "https://api.trello.com/1/members/me/boards?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  | jq '.[] | {name: .name, id: .id}'

# Get board details
curl -s "https://api.trello.com/1/boards/BOARD_ID?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN"

# Create a board
curl -s -X POST "https://api.trello.com/1/boards?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Board", "desc": "Board description"}'

# Archive a board
curl -s -X PUT "https://api.trello.com/1/boards/BOARD_ID/closed?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": true}'
```

### Lists

```bash
# Get lists on a board
curl -s "https://api.trello.com/1/boards/BOARD_ID/lists?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  | jq '.[] | {name: .name, id: .id}'

# Create a list
curl -s -X POST "https://api.trello.com/1/lists?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "To Do", "idBoard": "BOARD_ID"}'

# Archive a list
curl -s -X PUT "https://api.trello.com/1/lists/LIST_ID/closed?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": true}'
```

### Cards

```bash
# Get cards in a list
curl -s "https://api.trello.com/1/lists/LIST_ID/cards?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  | jq '.[] | {name: .idShort, title: .name, url: .url}'

# Create a card
curl -s -X POST "https://api.trello.com/1/cards?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Task", "idList": "LIST_ID", "desc": "Task description"}'

# Get a card
curl -s "https://api.trello.com/1/cards/CARD_ID?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN"

# Update a card
curl -s -X PUT "https://api.trello.com/1/cards/CARD_ID?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name", "desc": "Updated description"}'

# Move card to another list
curl -s -X PUT "https://api.trello.com/1/cards/CARD_ID?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"idList": "NEW_LIST_ID"}'

# Archive a card
curl -s -X PUT "https://api.trello.com/1/cards/CARD_ID/closed?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": true}'

# Add label to card
curl -s -X POST "https://api.trello.com/1/cards/CARD_ID/labels?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"color": "green", "name": "Done"}'

# Add due date
curl -s -X PUT "https://api.trello.com/1/cards/CARD_ID?key=$TRELLO_API_KEY&token_TOKEN" \
  -H "Content-Type: application/json=$TRELLO" \
  -d '{"due": "2026-03-01T12:00:00.000Z"}'
```

### Search

```bash
# Search all cards
curl -s "https://api.trello.com/1/search?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN&query=searchterm" \
  | jq '.cards[] | {name: .name, board: .idBoard}'

# Search with filters
curl -s "https://api.trello.com/1/search?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN&query=task&cards_limit=10" \
  | jq '.cards'
```

### Members

```bash
# Add member to board
curl -s -X PUT "https://api.trello.com/1/boards/BOARD_ID/members/USER_ID?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN"

# Add member to card
curl -s -X POST "https://api.trello.com/1/cards/CARD_ID/members?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "MEMBER_ID"}'
```

## Helper Functions

```bash
# Get board ID by name
trello_board_id() {
  BOARD_NAME=$1
  curl -s "https://api.trello.com/1/members/me/boards?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
    | jq -r ".[] | select(.name == \"$BOARD_NAME\") | .id"
}

# Get list ID by name
trello_list_id() {
  BOARD_ID=$1
  LIST_NAME=$2
  curl -s "https://api.trello.com/1/boards/$BOARD_ID/lists?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
    | jq -r ".[] | select(.name == \"$LIST_NAME\") | .id"
}

# Create card with due date
trello_add_card() {
  LIST_ID=$1
  NAME=$2
  DUE=$3
  curl -s -X POST "https://api.trello.com/1/cards?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$NAME\", \"idList\": \"$LIST_ID\", \"due\": \"$DUE\"}"
}
```

## Quick Reference

| Action | Endpoint |
|--------|----------|
| List boards | `GET /1/members/me/boards` |
| Create board | `POST /1/boards` |
| Get lists | `GET /1/boards/{id}/lists` |
| Create list | `POST /1/lists` |
| Get cards | `GET /1/lists/{id}/cards` |
| Create card | `POST /1/cards` |
| Move card | `PUT /1/cards/{id}?idList={list_id}` |
| Archive card | `PUT /1/cards/{id}/closed` |
| Search | `GET /1/search?query={term}` |

## Notes

- Rate limit: ~10 requests per second
- Board IDs start with specific prefixes (not human readable)
- Use `jq` for JSON parsing
- Cards have both `id` (long) and `idShort` (number) identifiers
- Use `idShort` for user-friendly references
