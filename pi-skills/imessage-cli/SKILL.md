---
name: imessage-cli
description: Send and receive iMessages/SMS via macOS Messages.app CLI. Use for reading chat history, sending messages, and managing iMessage conversations on macOS.
metadata:
  {
    "openclaw": {
      "emoji": "💬",
      "requires": { "bins": ["imessage-contact", "imessage-read", "imessage-send"] },
      "install": [
        {
          "id": "brew",
          "kind": "brew",
          "formula": "steipete/tap/imessage-contact steipete/tap/imessage-read steipete/tap/imessage-send",
          "label": "Install iMessage tools (brew)"
        }
      ]
    }
  }
---

# iMessage CLI

Send and manage iMessages on macOS via Messages.app.

## When to Use

✅ **USE this skill when:**

- Send iMessages from the command line
- Read chat history from Messages.app
- Get contact information from iMessage
- Trigger iMessage from automated scripts

## When NOT to Use

❌ **DON'T use this skill when:**

- Not on macOS → use other messaging skills
- Need rich media → use Messages.app directly

## Setup

### Installation (via Homebrew)

```bash
brew tap steipete/tap
brew install imessage-contact imessage-read imessage-send
```

### Permissions

The first time you run a command, macOS will prompt for:
- Automation permission (to control Messages.app)
- Contacts permission (to look up recipients)

## Usage

### Find Contacts

```bash
# Find contact by name
imessage-contact find "John Doe"

# Find by phone number
imessage-contact find "+1234567890"

# List all contacts with iMessage
imessage-contact list
```

### Read Messages

```bash
# Read recent messages from a chat
imessage-read --chat "John Doe"

# Read last N messages
imessage-read --chat "John Doe" --limit 20

# Read by phone number
imessage-read --phone "+1234567890"

# Read unread messages
imessage-read --unread

# Export as JSON
imessage-read --chat "John Doe" --json
```

### Send Messages

```bash
# Send to contact name
imessage-send "John Doe" "Hello from the command line!"

# Send to phone number
imessage-send "+1234567890" "Hello!"

# Send with subject (iMessage only)
imessage-send "John Doe" "Message text" --subject "Optional subject"

# Send to multiple recipients (group chat)
imessage-send "John Doe" "Message" --recipients "Jane Doe" "Bob Smith"
```

### Chat Commands

```bash
# List recent chats
imessage-read --chats

# Get chat info
imessage-read --chat "John Doe" --info
```

## Commands

### imessage-contact

Manage contacts for iMessage.

```bash
imessage-contact <subcommand> [options]

Subcommands:
  find <query>      Find contact by name or phone
  list              List all contacts with iMessage
  lookup <phone>    Get contact from phone number
```

### imessage-read

Read messages from chats.

```bash
imessage-read [options]

Options:
  --chat NAME       Chat name or contact
  --phone NUM       Phone number
  --limit N         Number of messages (default: 10)
  --unread         Show only unread messages
  --chats          List recent chats
  --info           Show chat info
  --json           Output as JSON
  --since DATE     Messages since date (YYYY-MM-DD)
```

### imessage-send

Send iMessage or SMS.

```bash
imessage-send <recipient> <message> [options]

Options:
  --subject TEXT   iMessage subject
  --recipients N1,N2...  Additional recipients (group chat)
  --wait
          Wait for delivery```

## Examples

### Send notification

```bash
imessage-send "+1234567890" "Deployment complete!"
```

### Read conversation

```bash
imessage-read --chat "John Doe" --limit 50
```

### Find who's texting

```bash
imessage-read --chats
```

### Automated response

```bash
# Check for unread, respond if needed
if imessage-read --unread | grep -q "help"; then
  imessage-send "+1234567890" "Help is on the way!"
fi
```

## Notes

- Only works on macOS with Messages.app
- Requires Apple Script permissions
- iMessages show blue bubbles, SMS show green
- Group chats supported
- Delivery receipts may vary by carrier (SMS)
