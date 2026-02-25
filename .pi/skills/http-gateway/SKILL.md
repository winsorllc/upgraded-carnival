---
name: HTTP Gateway
author: PopeBot
description: Routes requests between services, proxies to external APIs, and handles health checks. Lightweight internal API gateway for local service communication.
version: "1.0.0"
tags:
  - http
  - gateway
  - api
  - proxy
  - routing
---

# HTTP Gateway

Lightweight HTTP gateway for local service communication. Routes requests between services, proxies to external APIs, and handles health checks.

## When to Use

Use the http-gateway skill when you need to:
- Route requests between local services
- Proxy requests to external APIs
- Implement service health checks
- Create internal API endpoints
- Load balance between service instances

## Usage Examples

Start the gateway:
```bash
node /job/.pi/skills/http-gateway/gateway.js --port 8080
```

Define routes in `/job/config/gateway-routes.json`:
```json
{
  "/api/users": "http://localhost:3001",
  "/api/orders": "http://localhost:3002",
  "/webhook": { "forward": "https://example.com/webhook" }
}
```

Use with the api-tester skill to test endpoints.