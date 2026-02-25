---
name: network-tool
description: Network diagnostics including ping, DNS lookup, port checking, and IP information. Inspired by ZeroClaw's hardware and gateway capabilities.
---

# Network Tool

Network diagnostics and connectivity testing.

## Features

- **Ping**: Test connectivity to hosts
- **DNS Lookup**: Resolve domain names to IPs
- **Port Check**: Test if ports are open
- **IP Info**: Get local and public IP addresses
- **Traceroute**: Trace network paths
- **HTTP Status**: Quick HTTP endpoint check

## Usage

```bash
# Ping a host
./scripts/network.js ping example.com

# DNS lookup
./scripts/network.js dns google.com
./scripts/network.js dns google.com --type A --type AAAA

# Check if port is open
./scripts/network.js port localhost 8080
./scripts/network.js port example.com 443 --timeout 5

# Get IP info
./scripts/network.js ip
./scripts/network.js ip --public

# HTTP status check
./scripts/network.js http https://example.com
```

## Examples

| Task | Command |
|------|---------|
| Check connectivity | `./scripts/network.js ping google.com` |
| Resolve domain | `./scripts/network.js dns github.com` |
| Test API endpoint | `./scripts/network.js http https://api.example.com/health` |
| Check port open | `./scripts/network.js port myserver.local 22` |
| Get public IP | `./scripts/network.js ip --public` |
| DNS with types | `./scripts/network.js dns example.com --type MX --type TXT` |

## Output Format

Ping:
```json
{
  "host": "google.com",
  "status": "reachable",
  "time_ms": 23.4,
  "packets_sent": 3,
  "packets_received": 3,
  "packet_loss": 0
}
```

DNS:
```json
{
  "domain": "example.com",
  "records": [
    { "type": "A", "value": "93.184.216.34", "ttl": 3600 }
  ]
}
```

Port:
```json
{
  "host": "localhost",
  "port": 8080,
  "open": true,
  "response_time_ms": 12
}
```

## Notes

- Ping may require root/admin privileges on some systems
- Port checks use TCP connection attempts
- DNS lookups use system resolver
- Public IP detection uses external services
