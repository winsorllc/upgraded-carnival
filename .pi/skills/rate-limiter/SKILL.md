---
name: rate-limiter
description: Sliding window rate limiting for API calls, tool executions, and agent actions. Inspired by ZeroClaw's rate limiter with cost/day cap.
---

# Rate Limiter

Sliding window rate limiting for API calls, tool executions, and agent actions. Implements token bucket and sliding window algorithms.

## Setup

No additional setup required. Uses in-memory store with optional SQLite persistence.

## Usage

### Check if Action is Allowed

```bash
{baseDir}/rate-limiter.js check --key "user:123" --limit 10 --window 60
```

### Log an Action

```bash
{baseDir}/rate-limiter.js record --key "user:123" --cost 1
```

### Get Current Usage

```bash
{baseDir}/rate-limiter.js status --key "user:123"
```

### Reset Rate Limit

```bash
{baseDir}/rate-limiter.js reset --key "user:123"
```

### Check Daily Cost Cap

```bash
{baseDir}/rate-limiter.js daily-cost --key "user:123" --limit 1000
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--key` | Unique identifier (user:ID, IP:address, tool:name) | Required |
| `--limit` | Maximum requests allowed in window | 10 |
| `--window` | Time window in seconds | 60 |
| `--cost` | Cost to record for this action | 1 |
| `--limit-cost` | Maximum cost allowed per day | 1000 |

## Algorithms

### Sliding Window
Tracks requests in a time window, more accurate but slightly more memory intensive.

### Token Bucket
Tokens are added at a constant rate, actions consume tokens. Good for burst handling.

## Action Types

| Type | Default Cost |
|------|-------------|
| `api_call` | 1 |
| `tool_execution` | 2 |
| `agent_task` | 5 |
| `file_operation` | 1 |
| `network_request` | 1 |

## Response Format

```json
{
  "allowed": true,
  "remaining": 8,
  "resetAt": "2026-02-25T14:00:00Z",
  "used": 2,
  "limit": 10
}
```

## Daily Cost Tracking

Tracks cumulative cost per day with configurable cap:
- Resets at midnight UTC
- Configurable cost per action type
- Returns 429 when cap exceeded

## When to Use

- Preventing API rate limit violations
- Controlling agent tool execution frequency
- Daily cost caps for LLM usage
- Per-user or per-IP rate limiting
- DDoS protection for webhooks
