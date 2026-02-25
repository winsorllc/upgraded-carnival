---
name: health-check
description: Monitor service health and uptime. Check HTTP endpoints, DNS, ports, and system resources.
---

# Health Check

Monitor service health and uptime. Check HTTP endpoints, DNS resolution, port connectivity, and system resources.

## Setup

No additional setup required.

## Usage

### Check HTTP Endpoint

```bash
{baseDir}/health-check.js --url "https://api.example.com/health"
```

### Check Port

```bash
{baseDir}/health-check.js --host "localhost" --port 3000
```

### Check DNS

```bash
{baseDir}/health-check.js --dns "example.com"
```

### Full System Check

```bash
{baseDir}/health-check.js --system
```

## Options

| Option | Description | Required |
|--------|-------------|----------|
| `--url` | URL to check | No |
| `--host` | Hostname to check | No |
| `--port` | Port to check | No |
| `--dns` | DNS name to resolve | No |
| `--system` | Run system health check | No |
| `--timeout` | Timeout in seconds (default: 10) |

## Checks Performed

### HTTP Check
- Response time
- Status code
- SSL certificate validity
- Content validation (optional)

### Port Check
- Connection status
- Response time

### DNS Check
- Resolution time
- All record types

### System Check
- CPU usage
- Memory usage
- Disk usage
- Load average

## Output Format

```json
{
  "status": "healthy",
  "checks": [
    {
      "name": "api",
      "status": "pass",
      "responseTime": 150,
      "details": {...}
    }
  ],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## When to Use

- Monitoring service availability
- Pre-deployment checks
- Cron-based health monitoring
- Automated alerting
