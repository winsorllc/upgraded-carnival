---
name: tunnel-cli
description: "Manage network tunnels - Cloudflare Tunnel, Tailscale, and other tunneling solutions. Use for exposing local services, VPN setup, and secure tunneling."
metadata:
  {
    "openclaw": {
      "emoji": "🔌",
      "requires": { "bins": ["cloudflared", "tailscale"] }
    }
  }
---

# Tunnel CLI

Manage network tunnels for exposing local services securely.

## When to Use

✅ **USE this skill when:**

- Expose local services to the internet
- Set up VPN access
- Create secure tunnels
- Manage Cloudflare Tunnel
- Configure Tailscale

## When NOT to Use

❌ **DON'T use this skill when:**

- Need simple port forwarding → use ssh -L
- Static IP is available → use direct connection

## Setup

### Cloudflare Tunnel

```bash
# Install cloudflared
brew install cloudflare-homebrew

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create my-tunnel

# Configure DNS
cloudflared tunnel route dns my-tunnel myapp.example.com
```

### Tailscale

```bash
# Install Tailscale
brew install tailscale

# Login
tailscale up

# Check status
tailscale status
```

## Commands

### Cloudflare Tunnel

```bash
# List tunnels
cloudflared tunnel list

# Create tunnel
cloudflared tunnel create <name>

# Run tunnel
cloudflared tunnel run <name>

# Run with config
cloudflared tunnel --config /path/to/config.yml run

# Delete tunnel
cloudflared tunnel delete <tunnel-id>

# Show tunnel info
cloudflared tunnel info <tunnel-id>
```

### Tailscale

```bash
# Login
tailscale up

# Logout
tailscale down

# Status
tailscale status

# List machines
tailscale status --json | jq '.Peer'

# Connect to subnet router
tailscale up --advertise-routes=10.0.0.0/24

# SSH to tailnet machine
tailscale ssh user@hostname
```

### SSH Tunnel (Quick)

```bash
# Local port forward
ssh -L 8080:localhost:80 user@remote-host

# Remote port forward
ssh -R 8080:localhost:80 user@remote-host

# Dynamic SOCKS proxy
ssh -D 8080 user@remote-host
```

## Configuration Examples

### cloudflared.yml

```yaml
tunnel: my-tunnel
credentials-file: /path/to/credentials.json

ingress:
  - hostname: app.example.com
    service: http://localhost:3000
  - service: http_status:404
```

### Start tunnel

```bash
# Background
nohup cloudflared tunnel --config cloudflared.yml run > /tmp/tunnel.log 2>&1 &

# With auto-restart
while true; do
  cloudflared tunnel --config cloudflared.yml run
  sleep 5
done
```

## Troubleshooting

```bash
# Check tunnel logs
tail -f /tmp/tunnel.log

# Test Cloudflare tunnel
cloudflared tunnel inspect <tunnel-id>

# Check Tailscale
tailscale netcheck

# DNS resolution
tailscale dns

# Exit node
tailscale status | grep -i exit
```

## Use Cases

### Expose local web server

```bash
cloudflared tunnel create web-tunnel
cloudflared tunnel route dns web-tunnel myapp.example.com
cloudflared tunnel run web-tunnel
# Or with config
cloudflared tunnel --config cloudflared.yml run
```

### Access home network remotely

```bash
tailscale up --advertise-routes=192.168.1.0/24
# On another machine
tailscale status  # See home network routes
```

### Temporary tunnel for testing

```bash
cloudflared tunnel --url http://localhost:8080
```

## Notes

- Cloudflare Tunnel requires Cloudflare DNS
- Tailscale requires Tailscale account
- SSH tunnels need SSH access to remote host
- Consider using systemd for persistent tunnels
