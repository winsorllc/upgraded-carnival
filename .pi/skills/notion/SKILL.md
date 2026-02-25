---
name: notion
description: Interact with Notion workspaces - read pages, search content, create/update pages, query databases, and manage Notion integrations. Use when: (1) user asks about content stored in Notion, (2) need to create or update Notion pages, (3) querying Notion databases, (4) syncing project docs between Notion and codebase, (5) retrieving meeting notes or project documentation.
---

# Notion Integration

Interact with Notion via the Notion API. This skill enables the agent to read, search, create, and update content in Notion workspaces.

## When to Use

- User asks about content stored in Notion
- Need to fetch meeting notes, project docs, or specifications from Notion
- Creating or updating Notion pages from agent outputs
- Querying Notion databases for project management data
- Syncing documentation between Notion and the codebase
- Retrieving context from team knowledge bases

## Setup

### Prerequisites

1. **Create a Notion Integration**
   - Go to [Notion My Integrations](https://www.notion.so/my-integrations)
   - Click "New integration"
   - Name it (e.g., "PopeBot Agent")
   - Copy the "Internal Integration Secret" (starts with `secret_`)

2. **Share Notion Pages with the Integration**
   - Open the Notion page or database you want to access
   - Click "..." menu → "Connect to" → Select your integration
   - Repeat for each workspace page/database

3. **Environment Variable**
   - Set `NOTION_API_KEY` with your integration secret
   - Or pass as argument to commands

### Installation

```bash
npm install -g @notionhq/client
# or
pip install notion-client
```

## Usage

### Command Line Interface

The skill provides a `notion` command with subcommands:

## Commands

| Command | Description |
|---------|-------------|
| `notion search <query>` | Search Notion workspace |
| `notion page <pageId>` | Get page metadata |
| `notion blocks <pageId>` | Get page content (blocks) |
| `notion databases` | List accessible databases |
| `notion query <databaseId>` | Query a database |
| `notion create-page` | Create a new page |
| `notion append-blocks <pageId>` | Add blocks to a page |
| `notion create-database` | Create a new database |

```bash
# Set API key (once)
export NOTION_API_KEY="secret_xxxxx"

# Search Notion workspace
notion search "project documentation"

# Get a specific page
notion page "PAGE_ID"

# Get page content (blocks)
notion blocks "PAGE_ID"

# Query a database
notion query "DATABASE_ID"

# Create a new page
notion create-page --parent "PARENT_PAGE_ID" --title "New Page" --content "Page content"

# Create a database entry
notion create-database --parent "PAGE_ID" --title "Task Tracker" --properties '{"Name": {"title": {}}, "Status": {"select": {"options": [{"name": "Done", "color": "green"}, {"name": "In Progress", "color": "yellow"}, {"name": "To Do", "color": "red"}]}}}'

# Update page content
notion append-blocks "PAGE_ID" --content "New paragraph text"

# List all databases
notion databases
```

### As a Library

```javascript
// In Node.js scripts
const { NotionClient } = require('./notion-client.js');

const notion = new NotionClient(process.env.NOTION_API_KEY);

// Search
const results = await notion.search('meeting notes');

// Get page
const page = await notion.getPage('page-id-123');

// Query database
const entries = await notion.queryDatabase('database-id-456', {
  filter: {
    property: 'Status',
    select: { equals: 'Done' }
  }
});
```

## Output Format

### Search Results
```json
{
  "results": [
    {
      "id": "page-id-123",
      "title": "Project Specification",
      "url": "https://notion.so/page-id-123",
      "lastEdited": "2024-01-15T10:30:00Z"
    }
  ],
  "hasMore": false
}
```

### Page Content
```json
{
  "id": "page-id-123",
  "title": "Project Specification",
  "blocks": [
    { "type": "heading_1", "heading_1": { "rich_text": [{ "plain_text": "Overview" }] } },
    { "type": "paragraph", "paragraph": { "rich_text": [{ "plain_text": "This project..." }] } }
  ]
}
```

### Database Query
```json
{
  "results": [
    {
      "id": "entry-id-789",
      "properties": {
        "Name": { "title": [{ "plain_text": "Task 1" }] },
        "Status": { "select": { "name": "In Progress" } },
        "Due Date": { "date": { "start": "2024-02-01" } }
      }
    }
  ]
}
```

## Common Workflows

### Research Task
```
User: Check our Notion for the API design docs
Agent: [Uses notion search to find relevant pages, then notion blocks to fetch content]
```

### Create Documentation
```
User: Create a new page in our team docs for the Q1 roadmap
Agent: [Uses notion create-page to create the page with the roadmap content]
```

### Database Sync
```
User: What's the status of all open tasks in our project tracker?
Agent: [Uses notion query to fetch database entries with Status != Done]
```

## Block Types Supported

The skill supports reading and creating these Notion block types:

| Block Type | Description |
|------------|-------------|
| `paragraph` | Plain text paragraph |
| `heading_1`, `heading_2`, `heading_3` | Headings |
| `bulleted_list_item` | Bullet points |
| `numbered_list_item` | Numbered list items |
| `to_do` | Checkbox items |
| `toggle` | Collapsible content |
| `code` | Code blocks with language |
| `quote` | Block quotes |
| `divider` | Horizontal rule |
| `image` | Image blocks |

## Limitations

- Cannot access pages not shared with the integration
- Rate limited to 3 requests per second (Notion API)
- Some complex block types may need manual handling
- Rich text formatting is simplified (plain text only)

## Tips

1. **Find page IDs**: Page IDs are the 32-character strings in Notion URLs
   - `notion.so/PAGENAME-PAGEID` where PAGEID is 32 chars

2. **Database queries**: Use the Notion UI to create filters, then replicate in API

3. **Debug**: Use `notion search ""` to list recent pages

4. **Parent pages**: When creating pages, you need the parent page ID or database ID
