---
name: http-client
description: Full-featured HTTP client for API interactions. Supports GET, POST, PUT, DELETE, PATCH methods with security allowlists and response parsing.
---

# HTTP Client

A secure HTTP request tool for interacting with APIs. Supports multiple HTTP methods, custom headers, JSON body, and automatic response parsing.

## Setup

No additional setup required. Uses Node.js built-in http/https modules.

## Usage

### GET Request

```bash
{baseDir}/http-request.js GET https://api.example.com/data
```

### POST Request with JSON Body

```bash
{baseDir}/http-request.js POST https://api.example.com/data --json '{"key": "value"}'
```

### POST with Headers

```bash
{baseDir}/http-request.js POST https://api.example.com/data \
  --header "Authorization: Bearer token" \
  --header "Content-Type: application/json"
```

### PUT Request

```bash
{baseDir}/http-request.js PUT https://api.example.com/data/123 --json '{"name": "updated"}'
```

### DELETE Request

```bash
{baseDir}/http-request.js DELETE https://api.example.com/data/123
```

### PATCH Request

```bash
{baseDir}/http-request.js PATCH https://api.example.com/data/123 --json '{"status": "active"}'
```

### Query Parameters

```bash
{baseDir}/http-request.js GET "https://api.example.com/search?q=test&limit=10"
```

### Timeout Setting

```bash
{baseDir}/http-request.js GET https://slow-api.example.com --timeout 30
```

### Max Response Size

```bash
{baseDir}/http-request.js GET https://api.example.com/large-data --max-size 1048576
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--header` | Add custom header (can be repeated) | None |
| `--json` | Send JSON body (sets Content-Type automatically) | None |
| `--timeout` | Request timeout in seconds | 30 |
| `--max-size` | Maximum response size in bytes | 1048576 (1MB) |

## Security

- Only allows HTTP and HTTPS URLs
- Validates URL format before making requests
- Respects timeout and size limits
- Filters sensitive headers from logs

## Response Format

Returns JSON with:
```json
{
  "status": 200,
  "statusText": "OK",
  "headers": { ... },
  "body": "...",
  "json": { ... }
}
```

If response is JSON, also exposes parsed `json` field.
