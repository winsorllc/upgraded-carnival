---
name: trello
description: Manage Trello boards, lists, and cards via the Trello REST API. Use when working with Trello workspaces, project management, Kanban boards, or task management.
---

# Trello API Integration

Use the Trello REST API to manage boards, lists, and cards programmatically.

## Setup

### Get Your Trello API Credentials

1. **API Key**: Go to https://trello.com/app-key and copy your API key
2. **Token**: Click the "Token" link on that page to generate a token

### Store Credentials

```bash
mkdir -p ~/.config/trello
cat > ~/.config/trello/credentials.env << 'EOF'
TRELLO_API_KEY="your_api_key_here"
TRELLO_TOKEN="your_token_here"
EOF
```

Or set as environment variables:
```bash
export TRELLO_API_KEY="your_api_key"
export TRELLO_TOKEN="your_token"
```

## Environment

The skill expects:
- `TRELLO_API_KEY` environment variable
- `TRELLO_TOKEN` environment variable

## API Base URL

```
https://api.trello.com/1
```

All requests require authentication via query parameters:
```
?key={api_key}&token={token}
```

## Common Operations

### List Your Boards

```bash
curl -s "https://api.trello.com/1/members/me/boards?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" | jq '.[] | {name, id, url}'
```

### Get Board Details

```bash
curl -s "https://api.trello.com/1/boards/{board_id}?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" | jq '.'
```

### List Lists on a Board

```bash
curl -s "https://api.trello.com/1/boards/{board_id}/lists?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" | jq '.[] | {name, id}'
```

### List Cards in a List

```bash
curl -s "https://api.trello.com/1/lists/{list_id}/cards?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" | jq '.[] | {name, id, desc, due}'
```

### Create a New Card

```bash
curl -X POST "https://api.trello.com/1/cards?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Task",
    "desc": "Task description",
    "idList": "{list_id}",
    "due": "2026-02-26T12:00:00.000Z",
    "labels": ["blue", "urgent"]
  }'
```

### Update a Card

```bash
curl -X PUT "https://api.trello.com/1/cards/{card_id}?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "desc": "Updated description",
    "dueComplete": false
  }'
```

### Move Card to Another List

```bash
curl -X PUT "https://api.trello.com/1/cards/{card_id}?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"idList": "{new_list_id}"}'
```

### Add Label to Card

```bash
curl -X POST "https://api.trello.com/1/cards/{card_id}/labels?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"color": "green", "name": "Reviewed"}'
```

### Add Comment to Card

```bash
curl -X POST "https://api.trello.com/1/cards/{card_id}/actions/comments?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "This looks good!"}'
```

### Create a New List

```bash
curl -X POST "https://api.trello.com/1/lists?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Done", "idBoard": "{board_id}"}'
```

### Archive/Delete a Card

```bash
curl -X PUT "https://api.trello.com/1/cards/{card_id}?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"closed": true}'
```

### Search Cards

```bash
curl -s "https://api.trello.com/1/search?query=task&key=$TRELLO_API_KEY&token=$TRELLO_TOKEN&modelTypes=cards" | jq '.cards[] | {name, idBoard, idList}'
```

### Get Card Details

```bash
curl -s "https://api.trello.com/1/cards/{card_id}?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN&attachments=true&actions=all" | jq '.'
```

### Create a New Board

```bash
curl -X POST "https://api.trello.com/1/boards?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My New Board", "desc": "Project description", "prefs_permissionLevel": "private"}'
```

### Add Member to Board

```bash
curl -X PUT "https://api.trello.com/1/boards/{board_id}/members/{member_id}?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "normal"}'
```

## Tips

- Use `jq` to parse JSON responses: `jq '.[] | .name'`
- Board/List/Card IDs are 24-character alphanumeric strings
- Rate limit: ~10 requests per second
- Use `curl -s` to suppress progress meter when capturing output
- Add `-w '\n'` to ensure proper line endings in output
- Trello IDs are case-sensitive
- For bulk operations, consider adding small delays between requests
