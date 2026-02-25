---
name: apple-notes
description: Read and manage Apple Notes via AppleScript. Use for creating, reading, organizing notes in Apple Notes app on macOS.
metadata:
  {
    "openclaw": {
      "emoji": "📝",
      "requires": { "platform": "macos" }
    }
  }
---

# Apple Notes CLI

Manage Apple Notes via AppleScript on macOS.

## Prerequisites

- macOS with Notes app
- Scripting enabled (System Preferences > Security & Privacy > Automation)

## Usage

List accounts:

```bash
apple-notes accounts
```

List folders:

```bash
apple-notes folders
apple-notes folders --account "iCloud"
```

List notes:

```bash
apple-notes list
apple-notes list --folder "Work"
```

Read note:

```bash
apple-notes read <note-id>
apple-notes read --title "Meeting Notes"
```

Create note:

```bash
apple-notes create --title "New Note" --body "Note content here"
apple-notes create --folder "Work" --body "Task list"
```

Delete note:

```bash
apple-notes delete <note-id>
```

Search:

```bash
apple-notes search "keyword"
```

## Note Format

Notes are stored as plain text. Use Markdown for formatting.
