---
name: obsidian
description: Read and search Obsidian vaults for note-taking and knowledge management. Use when: (1) searching for notes in a local Obsidian vault, (2) reading markdown notes, (3) creating or updating notes in Obsidian format, (4) managing linked notes and backlinks.
---

# Obsidian Skill

Read and search Obsidian vaults for note-taking and knowledge management.

## When to Use

✅ **USE this skill when:**
- Searching for notes in a local Obsidian vault
- Reading markdown notes
- Creating or updating notes in Obsidian format
- Managing linked notes and backlinks

❌ **DON'T use this skill when:**
- Working with cloud-synced vaults → use the Obsidian app
- Complex graph navigation → use Obsidian app directly

## Setup

Set the OBSIDIAN_VAULT_PATH environment variable or pass `--vault` flag:

```bash
export OBSIDIAN_VAULT_PATH="/path/to/your/vault"
```

## Common Commands

### Search Notes

```bash
# Full-text search
obsidian.js search "query"

# Search with limit
obsidian.js search "query" --limit 20

# JSON output
obsidian.js search "query" --json
```

### Read Notes

```bash
# Read a note by title
obsidian.js read "My Note"

# Read by filename
obsidian.js read "path/to/note.md"

# Read with metadata
obsidian.js read "My Note" --metadata
```

### List Notes

```bash
# List all notes
obsidian.js list

# List notes in folder
obsidian.js list --folder "projects"

# List with details
obsidian.js list --detailed
```

### Create/Update Notes

```bash
# Create new note
obsidian.js create "New Note" --content "# Hello\n\nThis is my note"

# Update existing note
obsidian.js update "Existing Note" --content "# Updated\n\nNew content"

# Append to note
obsidian.js append "My Note" --content "\n\nMore content"
```

### Tags

```bash
# Find notes by tag
obsidian.js tag "project"

# Find notes by multiple tags
obsidian.js tag "important" "archived"
```

### Links

```bash
# Find backlinks to a note
obsidian.js backlinks "My Note"

# Find outgoing links
obsidian.js links "My Note"
```

## Scripting Examples

### Create Note from Template

```bash
#!/bin/bash
# Create a meeting note from template
DATE=$(date +%Y-%m-%d)
obsidian.js create "Meeting $DATE" --content "# Meeting Notes

**Date:** $DATE
**Attendees:** 

## Agenda
1. 

## Notes


## Action Items
- [ ]

## Next Steps
"
```

### Search and Export Results

```bash
#!/bin/bash
# Search and export results to file
obsidian.js search "project" --json | jq -r '.[].title' > projects.txt
```

### Daily Notes Aggregation

```bash
#!/bin/bash
# Aggregate all daily notes from past week
for i in {0..6}; do
    date=$(date -d "$i days ago" +%Y-%m-%d)
    obsidian.js read "Daily/$date" 2>/dev/null
done
```

## Obsidian Features Supported

### Markdown
- Full CommonMark support
- Obsidian-specific syntax (wikilinks, callouts)

### Wikilinks
```markdown
[[Note Name]]
[[Note Name|Display Text]]
```

### Callouts
```markdown
> [!note]
> This is a callout
```

### Frontmatter
```yaml
---
title: My Note
tags: [work, project]
date: 2024-01-01
---
```

## Notes

- Vault path must be set via `--vault` or `OBSIDIAN_VAULT_PATH`
- All operations are read/write on local files
- Filenames should be .md files
- Use wikilinks `[[Note Name]]` for internal linking
