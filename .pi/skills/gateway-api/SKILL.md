---
name: gateway-api
description: Internal API gateway for local service communication. Route requests between services, proxy to external APIs, and handle health checks. Inspired by ZeroClaw Gateway API and OpenClaw Gateway.
---

# Gateway API

Simple HTTP gateway for service-to-service communication.

## Capabilities

- Route to different services
- Health check endpoints
- Simple proxy functionality
- Request logging
- Rate limiting (basic)

## Usage

```bash
# Start gateway
/job/.pi/skills/gateway-api/gateway.js --port 8765

# Check health
curl http://localhost:8765/health

# Add route
curl -X POST http://localhost:8765/routes \\
  -d '{"path": "/api/*", "target": "http://localhost:3000"}'
```

## Endpoints

| Path | Method | Description |
|------|--------|-------------|
| `/health` | GET | Health check |
| `/status` | GET | Gateway status |
| `/routes` | GET/POST | List/add routes |
| `/*` | ALL | Proxied routes |