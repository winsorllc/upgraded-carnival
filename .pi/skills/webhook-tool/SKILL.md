---
name: webhook-tool
description: Create and manage webhooks. Listen for incoming webhooks and trigger actions.
---

# Webhook Tool

Create and manage webhooks. Listen for incoming HTTP requests and trigger scripts or notifications.

## Setup

No additional setup required.

## Usage

### Create a Webhook Listener

```bash
{baseDir}/webhook-tool.js --listen --path /webhook/github --command "handle-github.sh"
```

### Test a Webhook

```bash
{baseDir}/webhook-tool.js --test --url "https://example.com/webhook/test" --method POST --body '{"event": "test"}'
```

### List Active Webhooks

```bash
{baseDir}/webhook-tool.js --list
```

## Options

| Option | Description | Required |
|--------|-------------|----------|
| `--listen` | Start webhook listener | No |
| `--path` | Webhook path | For listen |
| `--command` | Command to execute | For listen |
| `--port` | Port to listen on | No |
| `--test` | Test a webhook URL | No |
| `--url` | Webhook URL | For test |
| `--method` | HTTP method | No |
| `--body` | Request body | No |
| `--headers` | Request headers | No |

## When to Use

- Receiving GitHub webhooks
- Processing payment callbacks
- Handling external API events
- Triggering jobs from external systems
