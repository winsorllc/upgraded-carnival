---
name: gog
description: Interact with Good Game (GOG) Galaxy API. Manage game library, achievements, cloud saves, and multiplayer sessions.
metadata:
  {
    "openclaw": {
      "emoji": "🎮",
      "requires": { "env": ["GOG_API_KEY"] }
    }
  }
---

# GOG Galaxy CLI

Manage GOG game library via API.

## Configuration

Get API key from: https://gog.com/developer
```bash
export GOG_API_KEY="your-api-key"
```

## Usage

List games:

```bash
gog games
```

Game details:

```bash
gog game <game-id>
```

Achievements:

```bash
gog achievements <game-id>
gog achievement unlock <game-id> <achievement-id>
```

Cloud saves:

```bash
gog saves <game-id>
gog upload-save <game-id> --file <path>
gog download-save <game-id> --output <path>
```

Sessions (multiplayer):

```bash
gog sessions <game-id>
gog join-session <session-id>
```
