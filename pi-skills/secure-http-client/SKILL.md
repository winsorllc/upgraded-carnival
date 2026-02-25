---
name: secure-http-client
description: Security-hardened HTTP client with domain allowlisting, rate limiting, and response validation. Inspired by ZeroClaw's secure HTTP tool.
version: 1.0.0
author: zeroclaw-inspired
tags:
  - http
  - security
  - api
  - client
  - rate-limiting
capabilities:
  - Make HTTP requests with security controls
  - Domain allowlisting
  - Rate limiting per domain
  - Response size limits
  - Timeout controls
  - Request/response logging
  - Private network blocking
requires: []
environment:
  HTTP_ALLOWED_DOMAINS: "api.github.com,api.openai.com"
  HTTP_MAX_RESPONSE_SIZE: "1048576"
  HTTP_TIMEOUT_SECS: "30"
  HTTP_RATE_LIMIT_PER_MINUTE: "60"
---

# Secure HTTP Client Skill

This skill provides a security-hardened HTTP client with domain allowlisting, rate limiting, and response validation. It's inspired by ZeroClaw's secure HTTP tool.

## Commands

### Make a request
```
http get <url> [--headers <json>] [--timeout <seconds>]
http post <url> [--data <json>] [--headers <json>]
http put <url> [--data <json>] [--headers <json>]
http delete <url> [--headers <json>]
```
Make an HTTP request with security controls.

### Check rate limit
```
http rate-limit <domain>
```
Check remaining rate limit for a domain.

### List allowed domains
```
http allowed
```
List all allowed domains.

### Test connection
```
http test <url>
```
Test connectivity to a URL.

## Security Features

### Domain Allowlisting
Only requests to explicitly allowed domains are permitted. This prevents:
- SSRF attacks
- Data exfiltration
- Unauthorized access to internal services

### Private Network Blocking
The client blocks requests to:
- localhost (127.0.0.1, ::1)
- Private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
- Link-local addresses
- Internal network addresses

### Rate Limiting
Per-domain rate limiting prevents:
- API abuse
- Service overload
- Getting blocked by APIs

### Response Size Limits
Maximum response sizes prevent:
- Memory exhaustion
- Slow downloads
- Buffer overflow attacks

### Timeout Controls
Configurable timeouts prevent:
- Hanging connections
- Resource exhaustion

## Configuration

```bash
# Allowed domains (comma-separated)
HTTP_ALLOWED_DOMAINS="api.github.com,api.openai.com,api.example.com"

# Maximum response size in bytes (default: 1MB)
HTTP_MAX_RESPONSE_SIZE=1048576

# Request timeout in seconds (default: 30)
HTTP_TIMEOUT_SECS=30

# Rate limit per domain per minute (default: 60)
HTTP_RATE_LIMIT_PER_MINUTE=60
```

## Usage Examples

```bash
# GET request
http get https://api.github.com/user

# POST request with JSON
http post https://api.example.com/data --data '{"key": "value"}'

# With custom headers
http get https://api.github.com/user --headers '{"Authorization": "Bearer token"}'

# Check rate limits
http rate-limit api.github.com
```

## Response Format

The HTTP client returns structured JSON:

```json
{
  "status": 200,
  "status_text": "OK",
  "headers": {
    "content-type": "application/json"
  },
  "body": "...",
  "size": 1234,
  "time_ms": 150
}
```

## Error Handling

Errors include detailed information:
- Validation errors (invalid URL, disallowed domain)
- Network errors (timeout, connection refused)
- Rate limit errors
- Response size exceeded
