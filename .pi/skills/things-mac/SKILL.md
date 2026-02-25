---
name: things-mac
description: Manage Things 3 via CLI on macOS (add/update projects+todos via URL scheme; read/search/list from database). Use when you need to add tasks, list inbox/today/upcoming, search tasks, or inspect projects/areas/tags.
---

# Things 3 CLI

Manage Things 3 from the command line on macOS.

## Install

```bash
# macOS (Apple Silicon recommended)
GOBIN=/opt/homebrew/bin go install github.com/ossianhempel/things3-cli/cmd/things@latest
```

## Permissions

- Grant **Full Disk Access** to Terminal (or the calling app)
- Optional: set `THINGSDB` env var for Things database location

## Read-Only (Database)

```bash
# List inbox
things inbox --limit 50

# Today's tasks
things today

# Upcoming tasks
things upcoming

# Search tasks
things search "meeting"

# List projects
things projects

# List areas
things areas

# List tags
things tags
```

## Write (URL Scheme)

```bash
# Preview (dry run)
things --dry-run add "New Task"

# Add task
things add "Buy groceries" --notes "milk, bread" --when today

# Add with deadline
things add "Submit report" --deadline 2026-01-15

# Add to project
things add "Design review" --project "Website Redesign"

# Add to area
things add "Call accountant" --area "Finance"

# Add with tag
things add "Gym" --tag "health"

# Show Things window
things --foreground add "Quick task"
```

## Options

| Flag | Description |
|------|-------------|
| `--notes` | Task notes |
| `--when` | When to do (today, tomorrow, someday) |
| `--deadline` | Deadline date |
| `--project` | Project name |
| `--area` | Area name |
| `--tag` | Tag name |
| `--auth-token` | Auth token for updates |
| `--dry-run` | Preview without executing |

## Environment Variables

- `THINGSDB` - Path to ThingsData folder
- `THINGS_AUTH_TOKEN` - Auth token for operations

## Tips

- Use `--dry-run` to preview before executing
- Grant Full Disk Access if DB reads fail
- Works via Things URL scheme for write operations
