---
name: himalaya
description: Use when you need to manage email via Himalaya CLI. Send, read, list, and manage emails using a unified CLI interface supporting multiple accounts.
metadata:
  {
    "openclaw": {
      "emoji": "📧",
      "requires": { "bins": ["himalaya"] }
    }
  }
---

# Himalaya Email CLI

Manage email using the Himalaya CLI with support for multiple accounts.

## Installation

```bash
# macOS
brew install himalaya

# Cargo
cargo install himalaya

# Download from releases
curl -sL https://github.com/soywod/himalaya/releases | extract
```

## Configuration

Create `~/.config/himalaya/config.toml`:

```toml
[[accounts]]
name = "personal"
email = "you@gmail.com"
default = true

[accounts.imap]
host = "imap.gmail.com"
port = 993
username = "your-email"
password = "app-password"  # Use app-specific password for Gmail

[accounts.smtp]
host = "smtp.gmail.com"
port = 587
```

Or use environment variable for password:
```bash
export HIMALAYA_PASSWORD="your-password"
```

## Usage

List envelopes (emails):

```bash
himalaya list --account personal
himalaya list --account personal --folder INBOX --limit 10
```

Read an email:

```bash
himalaya read <envelope-id>
```

Send an email:

```bash
himalaya send --from "you@example.com" --to "recipient@example.com" --subject "Subject" --body "Body"
```

Or use a file as body:

```bash
himalaya send --from "you@example.com" --to "recipient@example.com" --subject "Subject" --body-file message.txt
```

Delete an email:

```bash
himalaya delete <envelope-id>
```

## Output Formats

- Default: human-readable table
- JSON: `--output json`
- RFC 2822: `--output rfc`

## Environment

- `HIMALAYA_PASSWORD`: Email password (or use config)
- `HIMALAYA_CONFIG_PATH`: Custom config location
