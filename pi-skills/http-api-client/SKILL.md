---
name: http-api-client
description: Make HTTP API calls with authentication, retry logic, rate limiting, and response parsing. Use when: (1) you need to call external APIs (REST, GraphQL), (2) fetch data from web services, (3) integrate with third-party APIs (GitHub, Slack, etc.), (4) need retries on failures, (5) need to transform or parse API responses.
---

# HTTP API Client

Make HTTP API calls with built-in authentication, retry logic, rate limiting, and response parsing. This skill enables the agent to interact with external web services and APIs.

## When to Use

- User asks to fetch data from an API (GitHub, Slack, weather, etc.)
- Need to call external web services
- Integrate with third-party APIs requiring authentication
- Need retry logic for flaky APIs
- Rate limiting is needed for API calls
- Need to parse and transform API responses

## Setup

No additional dependencies required. Uses built-in Node.js `fetch` API.

If you have `axios` installed, it will be used for advanced features.

## Usage

### Basic GET Request

```bash
node /job/pi-skills/http-api-client/client.js get "https://api.example.com/data"
```

### GET with Headers

```bash
node /job/pi-skills/http-api-client/client.js get "https://api.example.com/data" \
  --header "Authorization: Bearer YOUR_TOKEN" \
  --header "Accept: application/json"
```

### POST Request with Body

```bash
node /job/pi-skills/http-api-client/client.js post "https://api.example.com/users" \
  --header "Content-Type: application/json" \
  --body '{"name": "John", "email": "john@example.com"}'
```

### Using Authentication Options

```bash
# API Key in header
node /job/pi-skills/http-api-client/client.js get "https://api.example.com/data" \
  --auth-header "ApiKey YOUR_API_KEY"

# Bearer token
node /job/pi-skills/http-api-client/client.js get "https://api.example.com/data" \
  --bearer "YOUR_TOKEN"

# Basic auth
node /job/pi-skills/http-api-client/client.js get "https://api.example.com/data" \
  --basic "username:password"
```

### Retry Configuration

```bash
# Retry up to 3 times with exponential backoff
node /job/pi-skills/http-api-client/client.js get "https://api.example.com/data" \
  --retries 3 \
  --retry-delay 1000

# Retry only on specific status codes
node /job/pi-skills/http-api-client/client.js get "https://api.example.com/data" \
  --retry-on 429,500,502,503,504
```

### Rate Limiting

```bash
# Max 10 requests per minute
node /job/pi-skills/http-api-client/client.js get "https://api.example.com/data" \
  --rate-limit 10,60000
```

### Response Parsing

```bash
# Get only specific fields from JSON response
node /job/pi-skills/http-api-client/client.js get "https://api.example.com/users" \
  --pick "users[0].name,users[0].email"

# Transform response with JMESPath
node /job/pi-skills/http-api-client/client.js get "https://api.example.com/users" \
  --query "users[*].{name: name, id: id}"

# Save response to file
node /job/pi-skills/http-api-client/client.js get "https://api.example.com/data" \
  --output /path/to/output.json
```

### Full Example: GitHub API

```bash
# Get repo info
node /job/pi-skills/http-api-client/client.js get "https://api.github.com/repos/owner/repo" \
  --bearer "$GITHUB_TOKEN" \
  --header "Accept: application/vnd.github.v3+json"

# Create issue
node /job/pi-skills/http-api-client/client.js post "https://api.github.com/repos/owner/repo/issues" \
  --bearer "$GITHUB_TOKEN" \
  --header "Accept: application/vnd.github.v3+json" \
  --body '{"title": "Bug found", "body": "Description here"}'
```

## Command Reference

| Command | Description |
|---------|-------------|
| `get` | Make GET request |
| `post` | Make POST request |
| `put` | Make PUT request |
| `patch` | Make PATCH request |
| `delete` | Make DELETE request |
| `head` | Make HEAD request |

## Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--header` | `-H` | Add request header (can repeat) |
| `--auth-header` | `-A` | API key in header format: `Key Value` |
| `--bearer` | `-B` | Bearer token |
| `--basic` | `-U` | Basic auth credentials `username:password` |
| `--body` | `-d` | Request body |
| `--body-file` | `-D` | Read body from file |
| `--content-type` | `-T` | Content-Type header (default: application/json) |
| `--retries` | `-r` | Number of retry attempts (default: 0) |
| `--retry-delay` | `-R` | Base delay between retries in ms (default: 1000) |
| `--retry-on` | | Comma-separated status codes to retry (default: 429,500,502,503,504) |
| `--rate-limit` | | Rate limit as `requests,milliseconds` (e.g., `10,60000`) |
| `--timeout` | `-t` | Request timeout in ms (default: 30000) |
| `--pick` | `-p` | Pick specific fields from JSON (dot notation) |
| `--query` | `-q` | JMESPath query for JSON transformation |
| `--output` | `-o` | Save response to file |
| `--quiet` | `-q` | Only output response body |
| `--format` | `-f` | Output format: json, text, raw (default: json) |

## Output Format

The client returns JSON with the following structure:

```json
{
  "success": true,
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json"
  },
  "body": {
    "key": "value"
  },
  "timings": {
    "start": "2026-02-25T10:00:00Z",
    "end": "2026-02-25T10:00:01Z",
    "duration": 1000
  }
}
```

On error:

```json
{
  "success": false,
  "error": "Request failed",
  "status": 500,
  "message": "Internal Server Error",
  "retries": 3
}
```

## Integration with Other Skills

- **With memory-agent**: Store API responses for future reference
- **With session-files**: Log API calls for audit trail
- **With sop-engine**: Use in multi-step workflows requiring external API calls
- **With modify-self**: Use to interact with GitHub API for PRs, issues, etc.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HTTP_API_TIMEOUT` | Default request timeout in ms |
| `HTTP_API_RETRIES` | Default number of retries |
| `HTTP_API_RATE_LIMIT` | Default rate limit `requests,milliseconds` |

## Examples

### Weather API
```bash
node /job/pi-skills/http-api-client/client.js get \
  "https://api.weather.com/v3/wx/conditions/current?location=NYC" \
  --header "API-Key: $WEATHER_API_KEY"
```

### Slack Webhook (POST)
```bash
node /job/pi-skills/http-api-client/client.js post \
  "https://hooks.slack.com/services/XXX/YYY/ZZZ" \
  --body '{"text": "Hello from PopeBot!"}'
```

### GraphQL Query
```bash
node /job/pi-skills/http-api-client/client.js post \
  "https://api.example.com/graphql" \
  --header "Content-Type: application/json" \
  --body '{"query": "{ user(id: 1) { name email } }"}'
```

## Limitations

- Cannot handle streaming responses (use browser-tools for that)
- Large responses may be truncated for memory
- Some APIs require complex OAuth flows (not supported directly)
- Binary responses saved to file, not parsed

## Tips

1. **For debugging**: Add `--header "Debug: true"` or check response headers
2. **For rate-limited APIs**: Always use `--rate-limit` to respect limits
3. **For flaky APIs**: Use `--retries 3` for automatic retry
4. **For large responses**: Use `--output` to save directly to file
5. **For repeated calls**: Consider using environment variables for auth
