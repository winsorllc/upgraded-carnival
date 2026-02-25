---
name: himalaya
description: CLI to manage emails via IMAP/SMTP. Use for listing, reading, writing, replying, forwarding, searching, and organizing emails from the terminal.
---

# Himalaya Email CLI

CLI email client using IMAP/SMTP.

## Install

```bash
# macOS
brew install himalaya

# Linux
# Download from https://github.com/pimalaya/himalaya/releases
```

## Configuration

```bash
# Interactive setup
himalaya account configure
```

Or create `~/.config/himalaya/config.toml`:

```toml
[[accounts]]
name = "personal"
email = "you@example.com"

[accounts.imap]
host = "imap.example.com"
port = 993
ssl = true

[accounts.smtp]
host = "smtp.example.com"
port = 587
ssl = true
```

## Quick Start

```bash
# List envelopes (emails)
himalaya envelope list

# List envelopes from specific folder
himalaya envelope list --folder INBOX

# Read email
himalaya envelope read <id>

# Send email
himalaya envelope send --from you@example.com --to them@example.com --subject "Hi" --body "Hello"

# Reply
himalaya envelope reply <id> --body "Thanks!"

# Forward
himalaya envelope forward <id> --to other@example.com

# Delete
himalaya envelope delete <id>

# Search
himalaya envelope search "from:boss@example.com"
```

## Folders

```bash
# List folders
himalaya folder list

# Create folder
himalaya folder create "Work/Projects"

# Move email to folder
himalaya envelope move <id> --folder INBOX.Archive
```

## Options

| Flag | Description |
|------|-------------|
| `--account` | Specify account |
| `--folder` | Folder name |
| `--json` | JSON output |

## MML (MIME Meta Language)

For complex emails with attachments:

```bash
himalaya envelope send --from you@example.com --to them@example.com --subject "With attachment" --body-file email.mml
```

## Notes

- Supports multiple accounts
- Password stored securely (use keyring or app passwords)
- IMAP for reading, SMTP for sending
- JSON output for scripting
