---
name: health-check
description: Monitor service health and uptime. Check HTTP endpoints, DNS, ports, and system resources for availability.
metadata:
  {
    "openclaw": {
      "emoji": "🏥",
      "requires": { "bins": ["curl", "nc", "dig"] }
    }
  }
---

# Health Check

Monitor service health and uptime.

## Checks

- **HTTP**: Endpoint availability, status codes, response time
- **DNS**: Resolution, record types, propagation
- **TCP**: Port availability, connection time
- **SSL**: Certificate validity, expiry, chain
- **Process**: Service running, PID check

## Usage

HTTP check:

```bash
health-check http https://example.com
health-check http https://api.example.com --status 200 --timeout 10
```

DNS check:

```bash
health-check dns example.com
health-check dns example.com --type AAAA
```

TCP port:

```bash
health-check port example.com 443
health-check port localhost 8080
```

SSL certificate:

```bash
health-check ssl example.com
health-check ssl example.com --days 30
```

Process check:

```bash
health-check process nginx
health-check process node --pid-file /var/run/node.pid
```

## Batch Monitoring

```bash
health-check batch config.json
```

Config format:
```json
{
  "services": [
    {"name": "api", "url": "https://api.example.com"},
    {"name": "db", "type": "port", "host": "db.example.com", "port": 5432}
  ]
}
```

## Alerts

Use with notification tools:
```bash
health-check http https://example.com || notify "Service down!"
```
