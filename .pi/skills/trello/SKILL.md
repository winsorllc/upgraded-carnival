---
name: trello
description: Manage Trello boards, lists, and cards via CLI. Use when: (1) creating, listing, or archiving Trello boards, (2) managing lists within boards, (3) creating, moving, or updating cards, (4) adding comments or labels to cards, (5) syncing task lists from Trello.
---

# Trello Skill

Manage Trello boards, lists, and cards directly from the command line.

## When to Use

✅ **USE this skill when:**
- Creating, listing, or archiving Trello boards
- Managing lists within boards (create, rename, archive)
- Creating, moving, or updating cards
- Adding comments, labels, or due dates to cards
- Syncing task lists from Trello
- Bulk operations on cards

❌ **DON'T use this skill when:**
- Complex drag-and-drop board interactions → use web browser
- Creating power-ups or integrations → use Trello API directly

## Setup

1. Get your API key: https://trello.com/app-key
2. Generate a token (click "Token" link on that page)
3. Set environment variables:
   ```bash
   export TRELLO_API_KEY="your-api-key"
   export TRELLO_TOKEN="your-token"
   ```

Alternatively, credentials can be provided via `--key` and `--token` flags.

## Common Commands

### Boards

```bash
# List all boards
trello-cli.js boards

# List boards with details
trello-cli.js boards --json

# Get board details
trello-cli.js board <board-id>

# Create a new board
trello-cli.js create-board "Project Name"

# Archive a board
trello-cli.js archive-board <board-id>
```

### Lists

```bash
# List lists in a board
trello-cli.js lists <board-id>

# Create a list
trello-cli.js create-list <board-id> "To Do"

# Archive a list
trello-cli.js archive-list <list-id>
```

### Cards

```bash
# List cards in a list
trello-cli.js cards <list-id>

# Create a card
trello-cli.js create-card <list-id> "Task title" --desc "Description"

# Move a card
trello-cli.js move-card <card-id> <list-id>

# Add comment
trello-cli.js comment <card-id> "This is a comment"

# Add label
trello-cli.js label <card-id> <label-name>

# Set due date
trello-cli.js due <card-id> "2024-12-31"

# Archive a card
trello-cli.js archive-card <card-id>
```

### Search

```bash
# Search cards
trello-cli.js search "query"

# Search in a specific board
trello-cli.js search "query" --board <board-id>
```

## Scripting Examples

### Get all cards from multiple boards

```bash
#!/bin/bash
BOARDS=("board-id-1" "board-id-2" "board-id-3")

for board in "${BOARDS[@]}"; do
    echo "=== Board: $board ==="
    trello-cli.js board "$board" --cards
done
```

### Create cards from CSV

```bash
#!/bin/bash
# CSV format: title, description, list-name
while IFS=',' read -r title desc list; do
    list_id=$(trello-cli.js lists "$BOARD_ID" | jq -r ".[] | select(.name == \"$list\") | .id")
    if [ -n "$list_id" ]; then
        trello-cli.js create-card "$list_id" "$title" --desc "$desc"
    fi
done < cards.csv
```

### Weekly report from board

```bash
#!/bin/bash
BOARD_ID="your-board-id"
echo "=== Trello Weekly Report ==="
echo ""
echo "Lists:"
trello-cli.js lists "$BOARD_ID" | jq -r '.[] | "  \(.name): \(.cards // [] | length) cards"'
echo ""
echo "Due this week:"
trello-cli.js board "$BOARD_ID" --cards | jq -r '.[] | select(.due != null and .due <= "2024-12-31") | "  [\(due)] \(.name)"'
```

## Output Formats

- Default: Human-readable text
- `--json`: JSON output for scripting
- `--quiet`: Minimal output (just IDs or errors)

## Error Handling

- Returns exit code 1 on error
- Error messages printed to stderr
- Use `--json` for machine-parseable errors:
  ```bash
  trello-cli.js create-card <list-id> "Title" --json
  # Returns: {"error": "List not found"}
  ```

## Notes

- Board/List/Card IDs can be found via list commands
- The API key and token provide full access - keep them secret!
- Rate limits: 300 requests per 10 seconds per API key
