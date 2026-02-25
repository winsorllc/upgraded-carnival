---
name: obsidian-vault
description: Work with Obsidian vaults, search notes, create/edit markdown files. Use when you need to manage personal knowledge base or markdown notes.
---

# Obsidian Vault Manager

Work with Obsidian markdown notes and vaults directly from the filesystem.

## Quick Start

```bash
/job/.pi/skills/obsidian-vault/obsidian.js search "project ideas"
```

## Usage

### Search Notes by Content
```bash
/job/.pi/skills/obsidian-vault/obsidian.js search "<query>" [vault_path]
```

### List Notes in Directory
```bash
/job/.pi/skills/obsidian-vault/obsidian.js list [vault_path]
```

### Create New Note
```bash
/job/.pi/skills/obsidian-vault/obsidian.js create "<note_name>" "<content>"
```

### Read Note Content
```bash
/job/.pi/skills/obsidian-vault/obsidian.js read "<note_path>"
```

### Append to Note
```bash
/job/.pi/skills/obsidian-vault/obsidian.js append "<note_path>" "<text>"
```

### Add Wiki Link
```bash
/job/.pi/skills/obsidian-vault/obsidian.js link "<source_note>" "<target_note>"
```

## Configuration

By default, looks for vaults in:
- `~/Documents/Obsidian`
- `~/obsidian`
- `./` (current directory)

Can specify vault path as last argument to any command.

## Obsidian Features

### Wiki Links
- Internal links: `[[Note Name]]`
- With alias: `[[Note Name|Display Text]]`
- Heading links: `[[Note#Heading]]`

### Tags
- Add tags: `#tagname` at the end of lines
- Nested tags: `#parent/child`

### Frontmatter
```yaml
---
created: 2024-01-01
tags: [project, notes]
aliases: [alt name]
---
```

## Output Format

- **search**: Returns list of matching notes with snippets
- **list**: Returns list of .md files in vault
- **create**: Returns path of created note
- **read**: Returns note content
- **append**: Returns confirmation message

## Examples

```bash
# Search for notes about "AI"
/job/.pi/skills/obsidian-vault/obsidian.js search "AI"

# Create a new daily note
/job/.pi/skills/obsidian-vault/obsidian.js create "2024-01-15" "# Daily Notes\n\nToday I worked on..."

# Add wiki link to existing note
/job/.pi/skills/obsidian-vault/obsidian.js link "Project Notes" "Meeting Notes"
```

## When to Use

- User wants to search their Obsidian notes
- Need to create or edit markdown notes
- Managing personal knowledge base
- Working with markdown files and wiki links
