---
name: notion
description: "Access and manage Notion pages, databases, and content via the Notion API. Use when: user wants to read Notion pages, query databases, create pages, or manage Notion workspaces. Requires: Notion integration token."
metadata:
  openclaw:
    emoji: "📝"
    requires:
      bins:
        - curl
        - jq
    env:
      - NOTION_API_KEY
---

# Notion Skill

Interact with Notion workspaces via the official Notion API.

## When to Use

✅ **USE this skill when:**

- Read Notion pages and their content
- Query Notion databases
- Create new pages
- Update page content
- Search Notion workspace

❌ **DON'T use this skill when:**

- User hasn't set up a Notion integration
- Need real-time collaboration features
- Complex nested page operations

## Prerequisites

1. Create a Notion integration at https://www.notion.so/my-integrations
2. Get the Internal Integration Token
3. Share pages/databases with the integration in Notion

## Environment Variables

```bash
NOTION_API_KEY="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NOTION_DATABASE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # For database operations
```

## Commands

### Get Page

```bash
# Get page metadata
curl -s "https://api.notion.com/v1/pages/PAGE_ID" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28"

# Get page content (blocks)
curl -s "https://api.notion.com/v1/blocks/PAGE_ID/children" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28"
```

### Query Database

```bash
# Query all items
curl -s "https://api.notion.com/v1/databases/DATABASE_ID/query" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -X POST

# Query with filter
curl -s "https://api.notion.com/v1/databases/DATABASE_ID/query" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "filter": {
      "property": "Status",
      "status": {
        "equals": "In Progress"
      }
    }
  }'
```

### Search Workspace

```bash
# Search all pages
curl -s "https://api.notion.com/v1/search" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "query": "search term",
    "filter": {
      "value": "page",
      "property": "object"
    }
  }'
```

### Create Page

```bash
# Create page with content
curl -s "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "parent": { "page_id": "PARENT_PAGE_ID" },
    "properties": {
      "title": {
        "title": [
          { "text": { "content": "New Page Title" } }
        ]
      }
    },
    "children": [
      {
        "object": "block",
        "type": "paragraph",
        "paragraph": {
          "rich_text": [
            { "text": { "content": "Hello from the agent!" } }
          ]
        }
      }
    ]
  }'
```

### Create Database Entry

```bash
# Add row to database
curl -s "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "parent": { "database_id": "DATABASE_ID" },
    "properties": {
      "Name": {
        "title": [
          { "text": { "content": "New Item" } }
        ]
      },
      "Status": {
        "status": { "name": "To Do" }
      },
      "Tags": {
        "multi_select": [
          { "name": "agent" }
        ]
      }
    }
  }'
```

### Extract Text Content

```bash
# Extract all paragraph text from page
curl -s "https://api.notion.com/v1/blocks/PAGE_ID/children?page_size=100" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  | jq -r '.results[] | select(.type == "paragraph") | .paragraph.rich_text[]?.text.content' 2>/dev/null
```

### Helper Functions

```bash
# Quick page summary
notion_page_summary() {
  PAGE_ID=$1
  curl -s "https://api.notion.com/v1/pages/$PAGE_ID" \
    -H "Authorization: Bearer $NOTION_API_KEY" \
    -H "Notion-Version: 2022-06-28" \
  | jq '{id: .id, title: .properties.Name.title[0].text.content, url: .url}'
}

# List database entries
notion_db_list() {
  DATABASE_ID=$1
  curl -s "https://api.notion.com/v1/databases/$DATABASE_ID/query" \
    -H "Authorization: Bearer $NOTION_API_KEY" \
    -H "Notion-Version: 2022-06-28" \
    -X POST \
  | jq '.results[] | {id: .id, title: .properties.Name.title[0].text.content}'
}
```

## Notes

- Notion API rate limits: 3 requests per second
- Use `jq` to parse JSON responses
- Page content comes as blocks - may need recursive fetching for long pages
- Block IDs are different from Page IDs
- Properties can be filtered with `filter` parameter in queries
