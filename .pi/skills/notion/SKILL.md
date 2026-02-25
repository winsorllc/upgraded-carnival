---
name: notion
description: "Notion API for creating and managing pages, databases, and blocks. Requires NOTION_API_KEY or NOTION_TOKEN secret. Use when you need to create, read, update, or search Notion pages and databases."
---

# Notion Skill

Use the Notion API to create, read, update pages, databases, and blocks.

## When to Use

✅ **USE this skill when:**

- Creating new Notion pages or database entries
- Querying Notion databases
- Searching for pages by title
- Updating page content or properties
- Adding blocks (text, headings, lists) to pages

## When NOT to Use

❌ **DON'T use this skill when:**

- Heavy data processing → use export + local tools
- Complex views/filters → Notion web UI only
- Database schema changes → limited API support

## Setup

1. Create an integration at https://notion.so/my-integrations
2. Copy the API key (starts with `ntn_` or `secret_`)
3. Add to your secrets as `NOTION_API_KEY` or `NOTION_TOKEN`
4. Share target pages/databases with your integration (click "..." → "Connect to" → your integration name)

## Commands

### Search

```bash
{baseDir}/notion.sh search "page title"
{baseDir}/notion.sh search "database name" --type=database
```

### Get Page

```bash
{baseDir}/notion.sh get-page <page_id>
```

### Get Database

```bash
{baseDir}/notion.sh get-database <database_id>
```

### Query Database

```bash
{baseDir}/notion.sh query <database_id>
{baseDir}/notion.sh query <database_id> --filter='{"property":"Status","select":{"equals":"Todo"}}'
{baseDir}/notion.sh query <database_id> --sort='{"property":"Date","direction":"descending"}'
```

### Create Page in Database

```bash
{baseDir}/notion.sh create-page --database=<database_id> --title="New Task" --properties='{"Status":{"select":{"name":"Todo"}}}'
```

### Create Page (Child)

```bash
{baseDir}/notion.sh create-page --parent=<page_id> --title="New Page"
```

### Update Page

```bash
{baseDir}/notion.sh update-page <page_id> --properties='{"Status":{"select":{"name":"Done"}}}'
```

### Add Blocks to Page

```bash
{baseDir}/notion.sh add-blocks <page_id> --blocks='[{"type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Hello world"}}]}}]'
```

### Get Page Content

```bash
{baseDir}/notion.sh get-blocks <page_id>
```

## Property Types

Common property formats for database items:

- **Title:** `{"title": [{"text": {"content": "..."}}]}`
- **Rich text:** `{"rich_text": [{"text": {"content": "..."}}]}`
- **Select:** `{"select": {"name": "Option"}}`
- **Multi-select:** `{"multi_select": [{"name": "A"}, {"name": "B"}]}`
- **Date:** `{"date": {"start": "2024-01-15", "end": "2024-01-16"}}`
- **Checkbox:** `{"checkbox": true}`
- **Number:** `{"number": 42}`
- **URL:** `{"url": "https://..."}`
- **Email:** `{"email": "a@b.com"}`

## Examples

**Create a task:**

```bash
{baseDir}/notion.sh create-page \
  --database=<database_id> \
  --title="Review PR" \
  --properties='{"Priority":{"select":{"name":"High"}},"Status":{"select":{"name":"Todo"}}}'
```

**Query incomplete tasks:**

```bash
{baseDir}/notion.sh query <database_id> --filter='{"property":"Status","select":{"does_not_equal":"Done"}}'
```

**Add a todo block:**

```bash
{baseDir}/notion.sh add-blocks <page_id> --blocks='[{"type":"to_do","to_do":{"rich_text":[{"text":{"content":"Check this"}}],"checked":false}}]'
```

## Notes

- Page/database IDs are UUIDs (with or without dashes)
- The API cannot set database view filters — that's UI-only
- Rate limit: ~3 requests/second average
- Use `--help` for full command reference