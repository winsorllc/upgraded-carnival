---
name: obsidian
description: Interact with Obsidian vaults for reading, writing, and searching notes. Use when: (1) user wants to read from their Obsidian vault, (2) user wants to create or update notes, (3) user is working with a personal knowledge management system, (4) user mentions taking notes or linking ideas in Obsidian.
---

# Obsidian Skill

Interact with local Obsidian vaults for reading, writing, organizing, and searching notes.

## When to Use

- User wants to read notes from their Obsidian vault
- User wants to create new notes or update existing ones
- User mentions their "second brain", "Obsidian", or "vault"
- Taking notes for later reference in a knowledge base
- Creating Daily Notes automatically
- Searching across all vault content
- Working with backlinks and wikilinks

## Setup

No additional installation required. Requires:
- Node.js (for advanced features)
- Access to the user's Obsidian vault directory

## Configuration

The skill uses these environment variables (can be set via the chat):

```
OBSIDIAN_VAULT_PATH=/path/to/your/vault
```

If not set, defaults to `~/Obsidian/VaultName` or prompts the user.

## Usage

### Quick Commands

```bash
# List available vaults
obsidian-list

# Search notes
obsidian-search "keyword"

# Read a note
obsidian-read "folder/note-name"

# Create or update a note
obsidian-write "folder/note-name" "content here"

# Create a daily note
obsidian-daily

# List recent notes
obsidian-recent 10
```

### Workflow Examples

#### Reading from Vault
```
User: What's in my Obsidian vault about AI agents?
Agent: [Uses obsidian-search to find relevant notes]
```

#### Creating Notes
```
User: Take a note about the meeting with John about the project
Agent: [Uses obsidian-write to create a note with the meeting notes]
Agent: [Offers to add wikilinks to related notes in the vault]
```

#### Daily Notes Workflow
```
User: Create a daily note for today
Agent: [Uses obsidian-daily to create today's note with template]
```

## Script Details

### obsidian-list
Lists all directories in the vault root - useful for seeing vault structure.

### obsidian-search
Searches for text in all .md files in the vault. Uses case-insensitive grep.

### obsidian-read
Reads the content of a specific note. Supports subdirectories.

### obsidian-write
Creates a new note or updates an existing one. Automatically creates parent directories.

### obsidian-daily
Creates a daily note in the format `YYYY-MM-DD.md` with optional template.
Template location: `.obsidian/daily-note-template.md` in vault root.

### obsidian-recent
Lists the most recently modified notes.

### obsidian-w-links
Lists all wikilinks ( [[note]] ) in a note - shows what a note links to.

### obsidian-backlinks
Finds all notes that link to a specific note - shows what links TO that note.

### obsidian-tags
Lists all #tags used in the vault with counts.

## Common Workflows

### Research & Note Taking
1. Search existing notes: `obsidian-search "topic"`
2. Read related notes: `obsidian-read "topic/overview"`
3. Create new note: `obsidian-write "topic/new-ideas.md" "# New Ideas\n\n..."`

### Daily Workflow
1. Create daily note: `obsidian-daily`
2. Add to daily note: `obsidian-write "2024-01-15" "- discussed X\n- action: do Y"`
3. Link to project: `obsidian-write "2024-01-15" "(see [[projects/active]])"`

### Knowledge Graph Exploration
1. Find tags: `obsidian-tags`
2. Explore backlinks: `obsidian-backlinks "Concept"`
3. Find connections: `obsidian-w-links "Idea"`

## Limitations

- Only works with markdown (.md) files
- No DataviewJS query support
- Vault must be accessible on the local filesystem
- No sync with Obsidian Sync or Remotely Save

## Tips

1. Use subdirectories to organize notes (e.g., "projects/ai/notes.md")
2. Add frontmatter to notes for metadata (title, date, tags)
3. Use wikilinks [[note-name]] to connect related ideas
4. Create a daily note template in `.obsidian/daily-note-template.md`