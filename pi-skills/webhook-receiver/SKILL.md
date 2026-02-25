---
name: webhook-receiver
description: Receive and process incoming webhooks. Use when you need to handle HTTP POST requests, trigger actions from external services, or create callback endpoints.
metadata:
  {
    "requires": { "bins": ["nc", "curl"] }
  }
---

# Webhook Receiver

Receive and process incoming webhooks. Use this skill to create webhook endpoints that can trigger actions based on HTTP requests from external services.

## Trigger

Use this skill when:
- Need to receive webhooks from external services
- Creating callback endpoints
- Testing webhook integrations
- Building event-driven workflows
- Need to inspect incoming webhook payloads

## Quick Start

### Start a simple webhook listener

```bash
# Listen on a port
webhook-receiver listen 8080

# Listen and save payloads
webhook-receiver listen 8080 --save /tmp/webhooks/

# Listen with custom handler
webhook-receiver listen 8080 --handler ./my-handler.sh
```

### Inspect incoming requests

```bash
# Pretty print JSON payloads
webhook-receiver inspect

# Show headers only
webhook-receiver inspect --headers

# Filter by content type
webhook-receiver inspect --content-type application/json
```

### Forward webhooks

```bash
# Forward to another endpoint
webhook-receiver forward http://localhost:9000/webhook

# Forward with transformation
webhook-receiver forward http://localhost:9000 --transform ./transform.js
```

## Options

| Option | Description |
|--------|-------------|
| `listen <port>` | Start HTTP server on port |
| `--save <dir>` | Save incoming requests to directory |
| `--handler <script>` | Execute script for each request |
| `--filter <pattern>` | Filter requests by pattern |
| `inspect` | Inspect saved/dumped requests |
| `forward <url>` | Forward requests to another URL |

## Use Cases

1. **Debug webhooks** - Inspect payloads during development
2. **Test integrations** - Verify webhook deliveries
3. **Forward webhooks** - Route webhooks to local services
4. **Log webhooks** - Save all incoming requests for analysis
5. **Transform payloads** - Modify webhook data before forwarding

## Example: GitHub Webhook Handler

```bash
#!/bin/bash
# handler.sh

# Parse the event type
EVENT_TYPE="$1"
PAYLOAD="$2"

case "$EVENT_TYPE" in
  push)
    echo "New push to $(echo '$PAYLOAD' | jq -r '.repository.full_name')"
    ;;
  pull_request)
    echo "PR $(echo '$PAYLOAD' | jq -r '.number'): $(echo '$PAYLOAD' | jq -r '.action')"
    ;;
  *)
    echo "Unhandled event: $EVENT_TYPE"
    ;;
esac
```

Run with:
```bash
webhook-receiver listen 8080 --handler ./handler.sh
```

## Example: Slack Webhook

```bash
# Listen and respond to Slack
webhook-receiver listen 8080 --handler ./slack-handler.sh

# slack-handler.sh:
#!/bin/bash
read body
echo '{"response_type":"in_channel","text":"OK"}' 
```

## Notes

- Requires network access to listen on ports
- Use with caution in production
- Can specify custom IP binding with `--host`
- Supports both HTTP and HTTPS with `--ssl`
