---
name: things
description: Manage Things 3 tasks on macOS via CLI. Create todos, manage projects, set due dates, and organize with tags.
metadata:
  {
    "openclaw": {
      "emoji": "✅",
      "requires": { "bins": ["things"], "platform": "macos" }
    }
  }
---

# Things 3 CLI

Manage tasks using the Things CLI (bundled with Things 3).

## Installation

Things 3 must be installed on macOS. The CLI is included:
```bash
# Verify installation
things help
```

## Usage

Create a todo:

```bash
things add "Buy milk"
things add "Submit report" --project Work --due today
things add "Call mom" --due "next monday" --tag personal
```

List items:

```things list```
things list --area "Work"
things list --project "Home Renovation"
things list --today
things list --upcoming
things list --anklogged

Projects:

```bash
things projects
things add-project "New Project"
```

Tags:

```bash
things tags
things add "Task" --tag "urgent,work"
```

## Arguments

- `--title`, `-t`: Task title
- `--notes`, `-n`: Notes
- `--project`, `-p`: Project name
- `--area`, `-a`: Area name
- `--due`, `-d`: Due date (today, tomorrow, next monday, etc.)
- `--when`, `-w`: When to show (today, someday, evening)
- `--tag`, `-g`: Tags (comma-separated)
- `--checklist`, `-c`: Checklist items
