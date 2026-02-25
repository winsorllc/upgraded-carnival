---
name: api-tester
description: HTTP API testing and validation tool. Send requests, validate responses, and test REST endpoints. Inspired by ZeroClaw's http_request tool and OpenClaw's testing capabilities.
---

# API Tester

HTTP API testing and validation tool for testing REST endpoints.

## Capabilities

- Send GET, POST, PUT, DELETE, PATCH requests
- Add custom headers and authentication
- Validate response status codes, headers, and bodies
- JSON schema validation
- Support for request body templates
- Chain multiple requests in sequence
- Capture and reuse values between requests

## Usage

```bash
# Simple GET request
/job/.pi/skills/api-tester/tester.js get https://api.example.com/data

# POST with JSON body
/job/.pi/skills/api-tester/tester.js post https://api.example.com/users \
  --data '{"name":"John","email":"john@example.com"}' \
  --header "Content-Type: application/json"

# Request with bearer token
/job/.pi/skills/api-tester/tester.js get https://api.example.com/protected \
  --token "your-jwt-token"

# Validate response
/job/.pi/skills/api-tester/tester.js get https://api.example.com/data \
  --expect-status 200 \
  --expect-header "content-type: application/json"

# Run test suite from file
/job/.pi/skills/api-tester/tester.js run ./tests/api-suite.json
```

## Response Format

```json
{
  "success": true,
  "duration": 245,
  "status": 200,
  "headers": {
    "content-type": "application/json"
  },
  "body": {...}
}
```

## Test Suite Format

```json
{
  "name": "User API Tests",
  "baseUrl": "https://api.example.com",
  "defaults": {
    "headers": {
      "Accept": "application/json"
    }
  },
  "tests": [
    {
      "name": "Get users",
      "method": "GET",
      "path": "/users",
      "expect": {
        "status": 200,
        "headers": {
          "content-type": "application/json"
        }
      }
    },
    {
      "name": "Create user",
      "method": "POST",
      "path": "/users",
      "body": {
        "name": "Test User"
      },
      "expect": {
        "status": 201,
        "bodyContains": "id"
      }
    }
  ]
}
```

## Notes

- Duration is in milliseconds
- Use --verbose for full request/response logging
- Schema validation uses JSON Schema draft-07
- Captured values use {{variable}} syntax