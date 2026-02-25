---
name: obsidian
description: Read, search, and manage Obsidian vault. Use for knowledge management, note-taking, and linking between notes.
metadata:
  {
    "openclaw": {
      "emoji": "💎",
      "requires": { "config": ["obsidian.vault_path"] }
    }
  }
---

# Obsidian Vault CLI

Manage Obsidian notes and vault.

## Configuration

Set in config:
```json
{
  "obsidian": {
    "vault_path": "/path/to/your/vault"
  }
}
```

Or use environment:
```bash
export OBSIDIAN_VAULT="/path/to/vault"
```

## Capabilities

- List notes in vault
- Search notes by content
- Create new notes
- Read note content
- Manage links and backlinks
- Create daily notes

## Usage

List notes:

```bash
obsidian list
obsidian list --folder "Projects"
```

Search:

```bash
obsidian search "keyword"
obsidian search --title "exact title"
```

Read note:

```bash
obsidian read "My Note"
obsidian read "folder/Note Name"
```

Create note:

```bash
obsidian create "New Note" --content "# New Note\n\nContent here"
obsidian create "Daily/2024-01-15" --template "daily"
```

Links:

```bash
obsidian links "Note Name"
obsidian backlinks "Note Name"
```

## Special Features

Daily notes: `obsidian today`
Templates: Use `---` frontmatter for templates
Tags: Search with `obsidian search --tag tagname`
