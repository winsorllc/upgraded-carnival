---
name: Webhook Forwarder
author: PopeBot
description: Receive and forward webhooks to multiple destinations. Routes webhook payloads, transforms data, and handles retries. Inspired by OpenClaw webhook automation.
version: "1.0.0"
tags:
  - webhook
  - proxy
  - routing
  - http
  - automation
---

# Webhook Forwarder

Receive and forward webhooks to multiple destinations. Routes webhook payloads, transforms data, and handles retries.

## When to Use

Use the webhook-forwarder skill when:
- Routing webhooks to multiple services
- Transforming webhook payloads
- Need retry logic for failed deliveries
- Building webhook pipelines
- Need webhook logging

## Usage Examples

Forward to single destination:
```bash
node /job/.pi/skills/webhook-forwarder/forward.js send https://example.com/webhook --payload '{"event": "test"}'
```

Start webhook server:
```bash
node /job/.pi/skills/webhook-forwarder/forward.js server --port 3000
```

Configure multiple destinations:
```bash
node /job/.pi/skills/webhook-forwarder/forward.js config destinations.json
```

Test webhook delivery:
```bash
node /job/.pi/skills/webhook-forwarder/forward.js test https://api.example.com/webhook
```