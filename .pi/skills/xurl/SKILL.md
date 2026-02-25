---
name: xurl
description: A CLI tool for making authenticated requests to the X (Twitter) API. Post tweets, search, read posts, and manage your X presence.
metadata: { "popebot": { "emoji": "𝕏", "requires": { "bins": ["xurl"], "env": ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET"] } } }
---

# xurl — X (Twitter) API CLI

`xurl` is a CLI tool for the X API. It supports posting tweets, searching, reading posts, managing followers, and interacting with any X API v2 endpoint.

## Prerequisites

This skill requires the `xurl` CLI utility and X API credentials:

- `X_API_KEY` - Your X API key
- `X_API_SECRET` - Your X API secret
- `X_ACCESS_TOKEN` - Your access token
- `X_ACCESS_SECRET` - Your access token secret

Install the CLI:

```bash
# Via Homebrew
brew install --cask xdevplatform/tap/xurl

# Via npm
npm install -g @xdevplatform/xurl

# Via Go
go install github.com/xdevplatform/xurl@latest
```

## Common Commands

### Post a Tweet

```bash
xurl tweet "Your tweet content here"
```

### Reply to a Tweet

```bash
xurl reply <tweet_id> "Your reply content"
```

### Quote Tweet

```bash
xurl quote <tweet_id> "Your quote comment"
```

### Search Tweets

```bash
xurl search "query" --max-results 10
```

### Get User Tweets

```bash
xurl user <username> --limit 10
```

### Get Tweet by ID

```bash
xurl tweet-id <tweet_id>
```

### Get User Info

```bash
xurl user-info <username>
```

### Follow/Unfollow

```bash
xurl follow <username>
xurl unfollow <username>
```

### Get Followers

```bash
xurl followers <username> --limit 10
```

### Get Following

```bash
xurl following <username> --limit 10
```

### Send DM

```bash
xurl dm <username> "Your message"
```

### Upload Media

```bash
xurl upload <image_path>
```

### Post Tweet with Media

```bash
xurl tweet "Check this out!" --media <image_path>
```

## Security Notes

- Never expose credentials in logs or chat
- Use environment variables for sensitive data
- Keep tokens secure and rotate periodically
