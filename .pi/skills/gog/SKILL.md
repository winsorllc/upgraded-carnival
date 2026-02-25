---
name: gog
description: Google Workspace CLI for Gmail, Calendar, Drive, Contacts, Sheets, and Docs. Use when you need to interact with Google services from the command line.
---

# gog

Google Workspace CLI for Gmail, Calendar, Drive, Contacts, Sheets, and Docs.

## Install

```bash
brew install steipete/tap/gogcli
```

## Setup (once)

```bash
# Authenticate
gog auth credentials /path/to/client_secret.json
gog auth add you@gmail.com --services gmail,calendar,drive,contacts,docs,sheets
gog auth list
```

## Gmail Commands

```bash
# Search emails
gog gmail search 'newer_than:7d' --max 10
gog gmail messages search "in:inbox from:example.com" --max 20

# Send email
gog gmail send --to a@b.com --subject "Hi" --body "Hello"
gog gmail send --to a@b.com --subject "Hi" --body-file ./message.txt

# Send HTML email
gog gmail send --to a@b.com --subject "Hi" --body-html "<p>Hello</p>"

# Drafts
gog gmail drafts create --to a@b.com --subject "Hi" --body-file ./message.txt
gog gmail drafts send <draftId>

# Reply to email
gog gmail send --to a@b.com --subject "Re: Hi" --body "Reply" --reply-to-message-id <msgId>
```

## Calendar Commands

```bash
# List events
gog calendar events <calendarId> --from <iso> --to <iso>

# Create event
gog calendar create <calendarId> --summary "Title" --from <iso> --to <iso>

# Update event
gog calendar update <calendarId> <eventId> --summary "New Title"

# Show colors
gog calendar colors
```

## Drive Commands

```bash
# List files
gog drive ls /path

# Upload file
gog drive upload ./file.txt /remote/path/

# Download file
gog drive download /remote/path/file.txt ./local/

# Create folder
gog drive mkdir /folder/path
```

## Docs/Sheets Commands

```bash
# Create doc
gog docs create --title "My Doc"

# Create sheet
gog sheets create --title "My Sheet"

# List
gog docs ls
gog sheets ls
```

## Notes

- Requires OAuth authentication before use
- Supports multiple accounts
- Can specify `--account` for different Google accounts
