---
name: notion
description: Interact with Notion workspaces - create pages, query databases, update content. Use when: user wants to read from or write to Notion, manage tasks in Notion, or integrate with Notion databases.
---

# Notion Skill

Interact with Notion workspaces via API.

## When to Use

✅ **USE this skill when:**

- "Create a Notion page"
- "Query a Notion database"
- "Update a page in Notion"
- "Get my Notion tasks"
- "Add to my Notion database"

## When NOT to Use

❌ **DON'T use this skill when:**

- Simple notes → use local files
- Complex Notion operations → use Notion web UI
- Real-time collaboration → use Notion directly

## Requirements

- Notion API key
- Notion integration token

## Setup

1. Create a Notion integration at https://www.notion.so/my-integrations
2. Get the Internal Integration Token
3. Share pages/databases with the integration
4. Set `NOTION_API_KEY` environment variable

```bash
export NOTION_API_KEY="secret_xxxxx"
```

## Usage

### Get Page

```bash
# Get page content
notion-get.sh <page-id>

# Get as JSON
notion-get.sh <page-id> --json
```

### Create Page

```bash
# Create page in database
notion-create.sh --database <db-id> --title "New Task" --properties '{"Status": "To Do"}'

# Create child page
notion-create.sh --parent <page-id> --title "Notes"
```

### Query Database

```bash
# Query database
notion-query.sh <database-id>

# Filter results
notion-query.sh <database-id> --filter '{"property": "Status", "select": {"equals": "Done"}}'
```

### Update Page

```bash
# Update page properties
notion-update.sh <page-id> --properties '{"Status": "Done"}'

# Append blocks
notion-update.sh <page-id> --append "New content paragraph"
```

## Commands

### notion-get.sh

Get page content.

```bash
./notion-get.sh <page-id> [options]

Options:
  --json       Output as JSON
  --blocks     Get block children only
```

### notion-create.sh

Create a new page.

```bash
./notion-create.sh [options]

Options:
  --parent ID        Parent page or database ID
  --title TITLE      Page title
  --properties JSON  Page properties as JSON
```

### notion-query.sh

Query a database.

```bash
./notion-query.sh <database-id> [options]

Options:
  --filter JSON    Filter criteria
  --sort JSON      Sort order
  --json          Output as JSON
```

### notion-update.sh

Update a page.

```bash
./notion-update.sh <page-id> [options]

Options:
  --properties JSON   Update properties
  --append TEXT       Append content blocks
```

## Examples

### Get My Tasks

```bash
# Query a task database
notion-query.sh <database-id> --filter '{"property": "Status", "status": {"equals": "In Progress"}}'
```

### Create New Task

```bash
notion-create.sh \
  --database <db-id> \
  --title "Review PR" \
  --properties '{"Status": {"status": {"name": "To Do"}}, "Priority": {"select": {"name": "High"}}}'
```

### Update Task Status

```bash
notion-update.sh <page-id> --properties '{"Status": {"status": {"name": "Done"}}}'
```

## API Reference

The Notion API uses:
- `https://api.notion.com/v1/pages` - Create pages
- `https://api.notion.com/v1/pages/{id}` - Get/Update page
- `https://api.notion.com/v1/databases/{id}/query` - Query database
- `https://api.notion.com/v1/blocks/{id}/children` - Get/Append blocks

## Notes

- Notion API has rate limits (3 requests/sec)
- Some properties require specific format (dates, selects, relations)
- Page IDs are 32-character hex strings
- Database IDs can be identified in URL: notion.so/{workspace}/{database_id}?v={view_id}
