---
name: xurl
description: "CLI tool for making authenticated requests to the X (Twitter) API. Use for posting tweets, replying, quoting, searching, reading posts, managing followers, sending DMs, and uploading media."
homepage: https://github.com/xdevplatform/xurl
metadata:
  {
    "thepopebot":
      {
        "emoji": "𝕏",
        "requires": { "bins": ["xurl"] },
      },
  }
---

# X (Twitter) CLI

Use `xurl` to interact with the X API v2.

## Setup

### Installation

**Homebrew (macOS):**
```bash
brew install --cask xdevplatform/tap/xurl
```

**npm:**
```bash
npm install -g @xdevplatform/xurl
```

**Go:**
```bash
go install github.com/xdevplatform/xurl@latest
```

### Authentication

Before using any command, you must be authenticated:

```bash
# Check auth status
xurl auth status

# Authenticate via OAuth2
xurl auth oauth2
```

## Usage

### Posting

| Action | Command |
|--------|---------|
| Post tweet | `xurl post "Hello world!"` |
| Reply | `xurl reply POST_ID "Nice post!"` |
| Quote | `xurl quote POST_ID "My take"` |
| Delete | `xurl delete POST_ID` |

### Reading

| Action | Command |
|--------|---------|
| Read post | `xurl read POST_ID` |
| Search posts | `xurl search "QUERY" -n 10` |
| Home timeline | `xurl timeline -n 20` |
| Mentions | `xurl mentions -n 10` |
| User posts | `xurl user @handle -n 10` |

### Interactions

| Action | Command |
|--------|---------|
| Like | `xurl like POST_ID` |
| Unlike | `xurl unlike POST_ID` |
| Repost | `xurl repost POST_ID` |
| Unrepost | `xurl unrepost POST_ID` |
| Follow | `xurl follow @handle` |
| Unfollow | `xurl unfollow @handle` |

### User Info

| Action | Command |
|--------|---------|
| Who am I | `xurl whoami` |
| Look up user | `xurl user @handle` |
| Following list | `xurl following -n 20` |
| Followers list | `xurl followers -n 20` |

### Direct Messages

| Action | Command |
|--------|---------|
| Send DM | `xurl dm @handle "message"` |
| List DMs | `xurl dms -n 10` |

### Media

| Action | Command |
|--------|---------|
| Upload media | `xurl media upload path/to/file.mp4` |
| Media status | `xurl media status MEDIA_ID` |

### Bookmarks

| Action | Command |
|--------|---------|
| Bookmark | `xurl bookmark POST_ID` |
| Unbookmark | `xurl unbookmark POST_ID` |
| List bookmarks | `xurl bookmarks -n 10` |

### App Management

| Action | Command |
|--------|---------|
| List apps | `xurl auth apps list` |
| Remove app | `xurl auth apps remove NAME` |
| Set default | `xurl auth default APP_NAME` |

## Security Notes

⚠️ **IMPORTANT:**
- Never use `--bearer-token`, `--consumer-key`, `--consumer-secret`, `--access-token`, or `--token-secret` flags in agent sessions
- These can expose credentials in logs/context
- Register credentials manually outside agent sessions

## Notes

- Post IDs can be full URLs (e.g., `https://x.com/user/status/1234567890`)
- Leading `@` is optional for usernames
