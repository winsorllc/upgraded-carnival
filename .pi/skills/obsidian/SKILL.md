---
name: obsidian
description: "Manage Obsidian vault files, search notes, and create new content. Use when: user wants to read, search, or create Markdown notes in an Obsidian vault. No API key needed - file-based access."
metadata:
  openclaw:
    emoji: "🔍"
    requires:
      bins:
        - find
        - grep
        - rg
        - cat
        - mkdir
---

# Obsidian Skill

Access and manage Obsidian vault files locally.

## When to Use

✅ **USE this skill when:**

- Search for notes in Obsidian vault
- Read note content
- Create new notes
- Update existing notes
- List vault structure

❌ **DON'T use this skill when:**

- Need to sync with Obsidian Sync
- Access vault remotely
- Need GUI-only features

## Configuration

```bash
# Set vault path (can also pass as argument)
export OBSIDIAN_VAULT_PATH="/path/to/your/vault"
```

Or pass vault path as first argument to any command.

## Commands

### Find Notes

```bash
# Find notes by name (case-insensitive)
find "$OBSIDIAN_VAULT_PATH" -name "*.md" -iname "*keyword*"

# Find notes containing text
rg -l "search term" "$OBSIDIAN_VAULT_PATH" --glob "*.md"

# Find notes by tag
rg -l "#tagname" "$OBSIDIAN_VAULT_PATH" --glob "*.md"
```

### Read Note

```bash
# Read entire note
cat "$OBSIDIAN_VAULT_PATH/folder/note.md"

# Read with line numbers
cat -n "$OBSIDIAN_VAULT_PATH/folder/note.md"

# Read first 50 lines
head -50 "$OBSIDIAN_VAULT_PATH/folder/note.md"
```

### List Vault

```bash
# List all notes
find "$OBSIDIAN_VAULT_PATH" -name "*.md" | sort

# List notes by folder
find "$OBSIDIAN_VAULT_PATH/folder" -name "*.md" | sort

# List folders
find "$OBSIDIAN_VAULT_PATH" -type d | sort
```

### Create Note

```bash
# Create new note with template
cat > "$OBSIDIAN_VAULT_PATH/notes/new-note.md" << 'EOF'
---
tags: []
created: $(date +%Y-%m-%d)
---

# New Note Title

Start writing here...

EOF

# Or use echo
echo -e "---\n---\n\n# Title\n\nContent" > "$OBSIDIAN_VAULT_PATH/notes/new.md"
```

### Update Note

```bash
# Append to note
echo "\n\n## Update $(date)" >> "$OBSIDIAN_VAULT_PATH/notes/note.md"

# Insert at line 10
sed -i '10i\New line content' "$OBSIDIAN_VAULT_PATH/notes/note.md"

# Replace text
sed -i 's/old_text/new_text/g' "$OBSIDIAN_VAULT_PATH/notes/note.md"
```

### Search Examples

```bash
# Search with context
rg -B2 -A2 "search term" "$OBSIDIAN_VAULT_PATH" --glob "*.md"

# Search and show only matches
rg -o "matching text" "$OBSIDIAN_VAULT_PATH" --glob "*.md" -g '*.md'

# Find notes modified recently
find "$OBSIDIAN_VAULT_PATH" -name "*.md" -mtime -7
```

### Backlinks

```bash
# Find all notes linking to a note
rg -l "\[\[note-name\]\]" "$OBSIDIAN_VAULT_PATH" --glob "*.md"

# Find orphan notes (no backlinks - approximation)
for f in $(find "$OBSIDIAN_VAULT_PATH" -name "*.md"); do
  if ! rg -q "\[\[$(basename $f .md)\]\]" "$OBSIDIAN_VAULT_PATH"; then
    echo "$f"
  fi
done
```

### Vault Statistics

```bash
# Count notes
find "$OBSIDIAN_VAULT_PATH" -name "*.md" | wc -l

# Count words in vault
find "$OBSIDIAN_VAULT_PATH" -name "*.md" -exec cat {} \; | wc -w

# List all tags
rg -o '#[a-zA-Z0-9-]+' "$OBSIDIAN_VAULT_PATH" --glob "*.md" | sort | uniq -c | sort -rn

# List all links
rg -o '\[\[[^\]]+\]\]' "$OBSIDIAN_VAULT_PATH" --glob "*.md" | sort | uniq -c | sort -rn
```

## Quick Reference

| Action | Command |
|--------|---------|
| Find notes | `find "$VAULT" -name "*.md" -iname "*keyword*"` |
| Search content | `rg "term" "$VAULT" --glob "*.md"` |
| Read note | `cat "$VAULT/folder/note.md"` |
| Create note | `echo "# Title" > "$VAULT/notes/new.md"` |
| List all | `find "$VAULT" -name "*.md"` |
| Count notes | `find "$VAULT" -name "*.md" | wc -l` |

## Notes

- Obsidian vaults are just folders of Markdown files
- Wiki-links use `[[note-name]]` format
- Tags use `#tagname` format
- Frontmatter is YAML between `---` delimiters
- No API needed - direct filesystem access
