---
name: health-check
description: "HTTP endpoint health checking. Monitor services, check connectivity, test responses. Supports HTTPS, timeouts, retries. No API key required."
---

# Health Check Skill

Check the health and availability of HTTP/HTTPS endpoints with configurable timeouts and retries.

## When to Use

✅ **USE this skill when:**

- "Check if this URL is up"
- "Test API endpoint health"
- "Monitor service availability"
- "Ping web services"
- "Verify HTTPS certificate"
- "Check response time"

## When NOT to Use

❌ **DON'T use this skill when:**

- Complex API interactions → use http-request
- Browser testing → use browser-tools
- DNS lookups → use dig/nslookup
- Port scanning → use network tools

## Commands

### Basic Health Check

```bash
{baseDir}/health.sh <url>
{baseDir}/health.sh https://api.example.com/health
{baseDir}/health.sh http://localhost:3000
```

### Check Multiple Endpoints

```bash
{baseDir}/health.sh https://api.example.com/health https://api.example.com/status
{baseDir}/health.sh --file urls.txt
```

### Timeout Configuration

```bash
{baseDir}/health.sh https://api.example.com --timeout 10
{baseDir}/health.sh https://api.example.com --connect-timeout 5 --read-timeout 10
```

### Response Validation

```bash
{baseDir}/health.sh https://api.example.com/health --expect-status 200
{baseDir}/health.sh https://api.example.com/health --expect-status 200,201,301
{baseDir}/health.sh https://api.example.com/health --expect-body "ok"
{baseDir}/health.sh https://api.example.com/health --expect-json '{"status":"ok"}'
```

### SSL/TLS Options

```bash
{baseDir}/health.sh https://api.example.com --insecure
{baseDir}/health.sh https://api.example.com --cert /path/to/cert --key /path/to/key
```

### Output Formats

```bash
{baseDir}/health.sh https://api.example.com --format json
{baseDir}/health.sh https://api.example.com --format short
{baseDir}/health.sh https://api.example.com --format detailed
{baseDir}/health.sh --file urls.txt --format table
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--timeout SECS` | Total request timeout | 30 |
| `--connect-timeout SECS` | Connection timeout | 5 |
| `--read-timeout SECS` | Read timeout | 10 |
| `--retries N` | Retry attempts | 0 |
| `--expect-status CODES` | Expected HTTP status codes | 200 |
| `--expect-body REGEX` | Expected response body pattern | None |
| `--expect-json PATH=VALUE` | JSON path check | None |
| `--insecure` | Skip SSL verification | false |
| `--cert FILE` | Client certificate | None |
| `--key FILE` | Client certificate key | None |
| `--format FORMAT` | Output: short, detailed, json, table | short |
| `--file FILE` | Read URLs from file | None |
| `--headers` | Show response headers | false |
| `--follow-redirects N` | Max redirects to follow | 5 |
| `--parallel` | Check URLs in parallel | false |

## Output Formats

### Short Format (default)
```
✅ https://api.example.com/health (200, 145ms)
```

### Detailed Format
```
URL: https://api.example.com/health
Status: 200 OK
Response Time: 145ms
DNS Time: 23ms
Connect Time: 45ms
TLS Time: 32ms
Content-Type: application/json
Content-Length: 234
Certificate: Valid (expires 2024-12-31)
```

### JSON Format
```json
{
  "url": "https://api.example.com/health",
  "status": 200,
  "statusText": "OK",
  "responseTime": 145,
  "dnsTime": 23,
  "connectTime": 45,
  "tlsTime": 32,
  "headers": {...},
  "certificate": {
    "valid": true,
    "expiresAt": "2024-12-31"
  },
  "healthy": true
}
```

### Table Format
```
URL                              | Status | Time   | Healthy
--------------------------------|--------|--------|--------
https://api.example.com/health    | 200    | 145ms  | ✅
https://api.example.com/status    | 200    | 132ms  | ✅
```

## Examples

**Quick health check:**
```bash
{baseDir}/health.sh https://api.example.com/health
# ✅ https://api.example.com/health (200, 145ms)
```

**Check with expected response:**
```bash
{baseDir}/health.sh https://api.example.com/health --expect-body "healthy"
```

**Check JSON response:**
```bash
{baseDir}/health.sh https://api.example.com/health --expect-json ".status=ok"
```

**Check multiple URLs from file:**
```bash
# urls.txt contains one URL per line
{baseDir}/health.sh --file urls.txt --format table
```

**Monitor with retries:**
```bash
{baseDir}/health.sh https://api.example.com --retries 3 --timeout 5
```

**Check SSL certificate:**
```bash
{baseDir}/health.sh https://api.example.com --format detailed | grep Certificate
# Certificate: Valid (expires 2024-12-31)
```

## Exit Codes

- 0: All checks passed
- 1: One or more checks failed
- 2: Invalid arguments
- 3: Network/DNS error
- 4: Timeout

## Notes

- Uses curl for HTTP requests
- Supports HTTP/1.1 and HTTP/2
- Follows redirects by default (up to 5)
- Validates SSL certificates by default (--insecure to skip)
- Response time includes DNS, connect, TLS, and transfer
- Can check multiple URLs in parallel with --parallel