---
name: webhook-server
description: Lightweight HTTP webhook server for receiving and processing webhooks. Supports custom endpoints, payload validation, and forwarding to other services. Inspired by ZeroClaw's Gateway API and OpenClaw's webhook triggers.
---

# Webhook Server

A lightweight HTTP server for receiving webhooks, processing payloads, and forwarding to other services. Similar to ZeroClaw's Gateway and OpenClaw's webhook triggers.

## Capabilities

- Receive webhooks on custom endpoints
- Validate webhook signatures (HMAC)
- Process JSON payloads
- Forward to external services
- Log webhook history
- Support for idempotency keys

## Usage

```bash
# Start the webhook server
/job/.pi/skills/webhook-server/webhook-server.js --port 3456

# Start with debug mode
/job/.pi/skills/webhook-server/webhook-server.js --port 3456 --verbose

# Test a webhook
/job/.pi/skills/webhook-server/test-webhook.sh http://localhost:3456/webhook/generic '{"event": "test"}'

# View webhook logs
/job/.pi/skills/webhook-server/webhook-log.js --tail 20
```

## Configuration

Create `/tmp/webhook-config.json`:

```json
{
  "endpoints": [
    {
      "path": "/webhook/github",
      "secret": "my-github-secret",
      "forward": "https://api.example.com/github-events"
    },
    {
      "path": "/webhook/generic",
      "actions": [
        { "type": "log" },
        { "type": "exec", "command": "echo 'Webhook received' >> /tmp/webhook.log" }
      ]
    }
  ]
}
```

## When to Use

- Receiving GitHub webhooks
- Building custom integrations
- Processing external events
- Forwarding webhooks to multiple destinations
- Testing webhook integrations locally

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhook/*` | POST | Receive webhooks on configured paths |
| `/health` | GET | Health check |
| `/status` | GET | Server status and recent webhooks |

## Security

Supports HMAC-SHA256 signature validation via `X-Hub-Signature-256` header.