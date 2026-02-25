---
name: webhook-tester
description: Test webhook endpoints by sending HTTP requests. Supports GET, POST, PUT, DELETE with custom headers and payloads.
---

# Webhook Tester

Simple webhook endpoint testing tool inspired by OpenClaw's webhook automation features.

## Setup
```bash
cd {baseDir}
npm install
```

## Usage

### Send GET request
```bash
{baseDir}/webhook.js https://api.example.com/webhook
```

### Send POST with JSON payload
```bash
{baseDir}/webhook.js https://api.example.com/webhook --method POST --data '{"key":"value"}'
```

### Send with custom headers
```bash
{baseDir}/webhook.js https://api.example.com/webhook \
  --header "Authorization: Bearer token123" \
  --header "Content-Type: application/json"
```

### Send from file
```bash
{baseDir}/webhook.js https://api.example.com/webhook \
  --method POST \
  --file payload.json
```

### Test multiple times
```bash
{baseDir}/webhook.js https://api.example.com/webhook --repeat 5
```

### Follow redirects
```bash
{baseDir}/webhook.js https://example.com/webhook --follow-redirects
```

### Output options
```bash
{baseDir}/webhook.js https://api.example.com/webhook --verbose
{baseDir}/webhook.js https://api.example.com/webhook --show-headers
{baseDir}/webhook.js https://api.example.com/webhook --show-body
```

### Output
```
╔════════════════════════════════════════════════════════════════╗
║                    WEBHOOK TEST RESULT                         ║
╚════════════════════════════════════════════════════════════════╝

URL:     https://api.example.com/webhook
Method:  POST
Status:  200 OK
Time:    234ms

Headers:
  Content-Type: application/json
  X-Request-ID: abc-123

Response Body:
{
  "success": true,
  "message": "Webhook received"
}
```

## When to Use
- Testing API endpoints
- Validating webhooks
- Load testing endpoints
- Debugging HTTP requests
- CI/CD webhook validation
