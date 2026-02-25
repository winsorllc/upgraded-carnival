---
name: notion
description: Create, read, update, and manage Notion pages, databases, and blocks via the Notion API. Use when working with Notion workspaces, databases, project management, documentation, or any task involving Notion pages or data.
---

# Notion API Integration

Use the Notion API to create, read, update, and manage pages, databases, and blocks.

## Setup

### Get Your Notion API Key

1. Go to [Notion My Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Give it a name (e.g., "PopeBot")
4. Copy the API key (starts with `ntn_` or `secret_`)

### Store Credentials

```bash
mkdir -p ~/.config/notion
echo "ntn_your_api_key_here" > ~/.config/notion/api_key
```

### Share Pages/Databases

After creating your integration, you must share pages or databases with it:
1. Open the Notion page or database
2. Click "..." (three dots) → "Connections" → "Add connections"
3. Select your integration

## Environment

The skill expects:
- `NOTION_API_KEY` environment variable (or read from `~/.config/notion/api_key`)
- API version header: `Notion-Version: 2022-06-28` (or newer)

## API Base URL

```
https://api.notion.com/v1
```

## Common Operations

### Search (Pages & Databases)

```bash
NOTION_KEY=$(cat ~/.config/notion/api_key)
curl -X POST "https://api.notion.com/v1/search" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{"query": "search term", "filter": {"property": "object", "value": "page"}}'
```

### Get a Page

```bash
curl -X GET "https://api.notion.com/v1/pages/{page_id}" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28"
```

### Get Page Content (Blocks)

```bash
curl -X GET "https://api.notion.com/v1/blocks/{page_id}/children" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28"
```

### Create a New Page

```bash
curl -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": {"page_id": "parent_page_id"},
    "properties": {
      "title": {"title": [{"text": {"content": "Page Title"}}]}
    },
    "children": [
      {"object": "block", "type": "paragraph", "paragraph": {"rich_text": [{"text": {"content": "Hello World"}}]}}
    ]
  }'
```

### Create Page in a Database

```bash
curl -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": {"database_id": "database_id_here"},
    "properties": {
      "Name": {"title": [{"text": {"content": "New Item"}}]},
      "Status": {"select": {"name": "Todo"}},
      "Date": {"date": {"start": "2026-02-25"}}
    }
  }'
```

### Query a Database

```bash
curl -X POST "https://api.notion.com/v1/databases/{database_id}/query" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {"property": "Status", "select": {"equals": "Todo"}},
    "sorts": [{"property": "Created", "direction": "descending"}]
  }'
```

### Create a Database

```bash
curl -X POST "https://api.notion.com/v1/databases" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": {"page_id": "parent_page_id"},
    "title": [{"text": {"content": "My Database"}}],
    "properties": {
      "Name": {"title": {}},
      "Status": {"select": {"options": [{"name": "Todo"}, {"name": "Done"}]}},
      "Date": {"date": {}},
      "Tags": {"multi_select": {"options": [{"name": "Urgent"}, {"name": "Review"}]}}
    }
  }'
```

### Update Page Properties

```bash
curl -X PATCH "https://api.notion.com/v1/pages/{page_id}" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{"properties": {"Status": {"select": {"name": "Done"}}}}'
```

### Add Blocks to a Page

```bash
curl -X PATCH "https://api.notion.com/v1/blocks/{page_id}/children" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{
    "children": [
      {"object": "block", "type": "heading_2", "heading_2": {"rich_text": [{"text": {"content": "Section Title"}}]}},
      {"object": "block", "type": "bulleted_list_item", "bulleted_list_item": {"rich_text": [{"text": {"content": "List item"}}]}},
      {"object": "block", "type": "code", "code": {"language": "javascript", "rich_text": [{"text": {"content": "const x = 1;"}}]}},
      {"object": "block", "type": "to_do", "to_do": {"rich_text": [{"text": {"content": "Task"}}], "checked": false}}
    ]
  }'
```

### Delete a Page (Archive)

```bash
curl -X PATCH "https://api.notion.com/v1/pages/{page_id}" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{"archived": true}'
```

## Property Types

When creating or updating database items, use these property formats:

| Type | JSON Format |
|------|-------------|
| Title | `{"title": [{"text": {"content": "Title"}}]}` |
| Rich Text | `{"rich_text": [{"text": {"content": "Text"}}]}` |
| Select | `{"select": {"name": "Option"}}` |
| Multi-select | `{"multi_select": [{"name": "A"}, {"name": "B"}]}` |
| Date | `{"date": {"start": "2026-02-25"}}` |
| Date Range | `{"date": {"start": "2026-02-25", "end": "2026-02-26"}}` |
| Checkbox | `{"checkbox": true}` |
| Number | `{"number": 42}` |
| URL | `{"url": "https://example.com"}` |
| Email | `{"email": "user@example.com"}` |
| Phone | `{"phone_number": "+1234567890"}` |
| Person | `{"people": [{"id": "user_id"}]}` |
| Relation | `{"relation": [{"id": "related_page_id"}]}` |

## Block Types

| Block Type | JSON Structure |
|------------|----------------|
| Paragraph | `{"type": "paragraph", "paragraph": {"rich_text": [...]}}` |
| Heading 1/2/3 | `{"type": "heading_1", "heading_1": {"rich_text": [...]}}` |
| Bulleted List | `{"type": "bulleted_list_item", "bulleted_list_item": {"rich_text": [...]}}` |
| Numbered List | `{"type": "numbered_list_item", "numbered_list_item": {"rich_text": [...]}}` |
| To-do | `{"type": "to_do", "to_do": {"rich_text": [...], "checked": true}}` |
| Toggle | `{"type": "toggle", "toggle": {"rich_text": [...]}}` |
| Code | `{"type": "code", "code": {"language": "javascript", "rich_text": [...]}}` |
| Quote | `{"type": "quote", "quote": {"rich_text": [...]}}` |
| Divider | `{"type": "divider", "divider": {}}` |
| Image | `{"type": "image", "image": {"type": "external", "external": {"url": "https://..."}}}` |
| Bookmark | `{"type": "bookmark", "bookmark": {"url": "https://...", "caption": [...]}}` |

## Tips

- Page/Database IDs are 32-character UUIDs (can include dashes)
- Use `jq` to parse JSON responses: `jq '.results[] | .id'`
- Rate limit: ~3 requests per second on average
- The Notion API cannot create database views (that's UI-only)
- Use `curl -s` to suppress progress meter when capturing output
- Add `-w '\n'` to ensure proper line endings in output
