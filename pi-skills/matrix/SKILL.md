---
name: matrix
description: Send and receive messages via Matrix protocol using the matrix-commander CLI. Use when you need to chat via Matrix, manage rooms, or integrate with Matrix-based communication.
metadata:
  {
    "thepopebot":
      {
        "emoji": "💬",
        "os": ["linux", "darwin"],
        "requires": { "bins": ["matrix-commander"] },
        "install":
          [
            {
              "id": "pip",
              "kind": "pip",
              "package": "matrix-commander",
              "label": "Install matrix-commander via pip"
            }
          ]
      }
  }
---

# Matrix Messenger CLI

Use `matrix-commander` to interact with Matrix from the terminal.

## Setup

- Install: `pip install matrix-commander`
- Initial setup:
  ```
  matrix-commander --credentials matrix-creds.json --rooms rooms.json
  ```
- This will prompt for your Matrix homeserver, username, and password

## Send Messages

- Send to a room:
  ```
  matrix-commander -m "Hello from the agent!" -r "room-alias:matrix.org"
  ```

- Send to multiple rooms:
  ```
  matrix-commander -m "Broadcast message" -r "room1:matrix.org" "room2:matrix.org"
  ```

- Send to a user (DM):
  ```
  matrix-commander -m "Hello" -u "@user:matrix.org"
  ```

## Rooms

- List joined rooms:
  ```
  matrix-commander --list-rooms
  ```

- Join a room:
  ```
  matrix-commander --join-room "#room:matrix.org"
  ```

- Leave a room:
  ```
  matrix-commander --leave-room "#room:matrix.org"
  ```

## Receive Messages

- Listen for incoming messages:
  ```
  matrix-commander --listen
  ```

- Or use the Python API for programmatic access

## Notes

- Requires Matrix account on any homeserver
- Credentials are stored in JSON files (keep secure)
- Supports end-to-end encryption (E2EE) with optional setup
