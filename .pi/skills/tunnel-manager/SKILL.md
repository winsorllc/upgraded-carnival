---
name: tunnel-manager
description: Agnostic tunnel management supporting Cloudflare, Tailscale, and other providers. Inspired by ZeroClaw's agnostic tunnel architecture.
---

# Tunnel Manager

Agnostic tunnel management supporting Cloudflare, Tailscale, and other providers. Create, manage, and monitor tunnels with a unified interface.

## Setup

Requires tunnel provider CLI tools installed:
- Cloudflare Tunnel: `cloudflared`
- Tailscale: `tailscale`

## Usage

### Create a Tunnel

```bash
{baseDir}/tunnel-manager.js create --provider cloudflare --name "my-tunnel"
```

### List Tunnels

```bash
{baseDir}/tunnel-manager.js list
```

### Get Tunnel Status

```bash
{baseDir}/tunnel-manager.js status --provider cloudflare --tunnel-id "tunnel-id"
```

### Start Tunnel

```bash
{baseDir}/tunnel-manager.js start --provider cloudflare --tunnel-id "tunnel-id" --port 3000
```

### Stop Tunnel

```bash
{baseDir}/tunnel-manager.js stop --provider cloudflare --tunnel-id "tunnel-id"
```

### Delete Tunnel

```bash
{baseDir}/tunnel-manager.js delete --provider cloudflare --tunnel-id "tunnel-id"
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--provider` | Tunnel provider: `cloudflare`, `tailscale`, `ngrok` | Required |
| `--name` | Tunnel name | Auto-generated |
| `--tunnel-id` | Tunnel identifier | - |
| `--port` | Local port to expose | 80 |
| `--subdomain` | Subdomain for Cloudflare | - |
| `--domain` | Domain for Cloudflare | - |

## Providers

### Cloudflare Tunnel
- Requires `cloudflared` CLI
- Creates DNS records automatically
- HTTPS with automatic certificate

### Tailscale
- Requires `tailscale` CLI
- Peer-to-peer connection
- Uses Tailscale network

### Ngrok
- Requires `ngrok` CLI
- Quick temporary tunnels
- Shared/unique URLs available

## Response Format

```json
{
  "success": true,
  "provider": "cloudflare",
  "tunnelId": "tunnel-123",
  "name": "my-tunnel",
  "status": "running",
  "url": "https://my-tunnel.example.com"
}
```

## When to Use

- Exposing local servers to the internet
- Secure tunnel without port forwarding
- Multi-provider tunnel management
- Development webhook testing
- Temporary tunnel for testing
