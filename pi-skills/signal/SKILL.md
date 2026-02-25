---
name: signal
description: Send and receive messages via Signal Messenger using the signal-cli. Use when you need to send SMS-like messages to Signal contacts or groups.
metadata:
  {
    "thepopebot":
      {
        "emoji": "📱",
        "os": ["linux", "darwin"],
        "requires": { "bins": ["signal-cli"] },
        "install":
          [
            {
              "id": "manual",
              "kind": "manual",
              "label": "Install signal-cli",
              "commands": [
                "curl -s https://get Signal messenger.org | bash",
                "or: brew install signal-cli"
              ]
            }
  }
---

#          ]
      }
 Signal Messenger CLI

Use `signal-cli` to send and receive Signal messages from the terminal.

## Setup

- Linux: `curl -s https://get.signal.org | bash` (requires Java)
- macOS: `brew install signal-cli`
- Register your number: `signal-cli register --phone +1234567890`
- Verify: `signal-cli verify --phone +1234567890`

## Send Messages

- Send to a phone number:
  ```
  signal-cli send +1234567890 -m "Hello from the agent!"
  ```

- Send to a group (by group name):
  ```
  signal-cli send -g "Group Name" -m "Hello group!"
  ```

- Send with attachment:
  ```
  signal-cli send +1234567890 -a /path/to/file.jpg
  ```

- Send to multiple recipients:
  ```
  signal-cli send +1234567890 +0987654321 -m "Hello everyone!"
  ```

## Receive Messages

- Receive messages (daemon mode):
  ```
  signal-cli daemon
  ```

- Receive and process JSON:
  ```
  signal-cli receive --json
  ```

## Groups

- List groups:
  ```
  signal-cli listGroups
  ```

- Create a group:
  ```
  signal-cli updateGroup -n "My Group" --members +1234567890
  ```

## Notes

- Requires a phone number for registration
- Group management requires the group ID (use `listGroups` to find it)
- Attachments must be under 100MB
- Works with Signal Personal or Signal Business
