---
name: notion
description: Notion API for creating and managing pages, databases, and blocks. Use for task management, knowledge bases, and documentation.
homepage: https://developers.notion.com
metadata:
  {
    "thepopebot":
      {
        "emoji": "📝",
        "requires": { "env": ["NOTION_API_KEY"] },
        "primaryEnv": "NOTION_API_KEY"
      },
  }
---

# Notion

Use the Notion API to create/read/update pages, data sources (databases), and blocks.

## Setup

1. Create an integration at https://notion.so/my-integrations
2. Copy the API key (starts with `ntn_` or `secret_`)
3. Set the API key in your environment or config

## API Basics

All requests need the `NOTION_API_KEY` environment variable and the `Notion-Version` header (use `2025-09-03`).

Base URL: `https://api.notion.com/v1`

## Common Operations

**Search for pages and data sources:**
- Use the search endpoint to find pages by title or content

**Get page:**
- Retrieve a page by its ID

**Get page content (blocks):**
- Get all blocks (paragraphs, headings, etc.) in a page

**Create page:**
- Create new pages, optionally in a database

**Query database:**
- Filter and sort database entries

## Useful Commands

- Search pages: `notion search <query>`
- List pages: `notion list-pages`
- Get page content: `notion get <page-id>`
- Create page: `notion create-page --title "New Page" --parent <parent-id>`
- Query database: `notion query <database-id> --filter <json>`

## Tips

- Page IDs are 32-character UUIDs (with hyphens)
- Database IDs are also UUIDs but start with the database page
- Use block operations to add content to pages
- Properties in Notion databases can be queried using filter syntax
