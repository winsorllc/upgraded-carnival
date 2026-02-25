#!/bin/bash
# Tunnel CLI wrapper for PopeBot

set -e

COMMAND="${1:-}"
shift || true

# Help function
show_help() {
    cat << EOF
Tunnel CLI for PopeBot

Usage: $0 <command> [options]

Commands:
  cloudflared <args>    Run cloudflared commands
  tailscale <args>      Run tailscale commands
  ssh-tunnel <local-port> <remote-host> [remote-port]
  ssh-dynamic <proxy-port> <remote-host>
  list                  List available tunnels
  status                Show tunnel status

Examples:
  $0 cloudflared tunnel list
  $0 tailscale status
  $0 ssh-tunnel 8080 remote.example.com 80
  $0 ssh-dynamic 1080 user@host
  $0 status

EOF
    exit 0
}

case "$COMMAND" in
    -h|--help|help)
        show_help
        ;;
    
    cloudflared)
        if ! command -v cloudflared &> /dev/null; then
            echo "Error: cloudflared not installed"
            echo "Install with: brew install cloudflared"
            exit 1
        fi
        cloudflared "$@"
        ;;
    
    tailscale)
        if ! command -v tailscale &> /dev/null; then
            echo "Error: tailscale not installed"
            echo "Install with: brew install tailscale"
            exit 1
        fi
        tailscale "$@"
        ;;
    
    ssh-tunnel)
        LOCAL_PORT="${1:-}"
        REMOTE_HOST="${2:-}"
        REMOTE_PORT="${3:-22}"
        
        if [ -z "$LOCAL_PORT" ] || [ -z "$REMOTE_HOST" ]; then
            echo "Usage: $0 ssh-tunnel <local-port> <remote-host> [remote-port]"
            echo "Example: $0 ssh-tunnel 8080 remote.example.com 80"
            exit 1
        fi
        
        echo "Creating SSH tunnel: localhost:$LOCAL_PORT -> $REMOTE_HOST:$REMOTE_PORT"
        ssh -L "$LOCAL_PORT:localhost:$REMOTE_PORT" -N "$REMOTE_HOST"
        ;;
    
    ssh-dynamic)
        PROXY_PORT="${1:-}"
        REMOTE_HOST="${2:-}"
        
        if [ -z "$PROXY_PORT" ] || [ -z "$REMOTE_HOST" ]; then
            echo "Usage: $0 ssh-dynamic <proxy-port> <remote-host>"
            echo "Example: $0 ssh-dynamic 1080 user@host"
            exit 1
        fi
        
        echo "Creating dynamic SOCKS proxy on localhost:$PROXY_PORT"
        ssh -D "$PROXY_PORT" -N "$REMOTE_HOST"
        ;;
    
    list)
        echo "=== Cloudflare Tunnels ==="
        if command -v cloudflared &> /dev/null; then
            cloudflared tunnel list 2>/dev/null || echo "Not configured"
        else
            echo "cloudflared not installed"
        fi
        
        echo ""
        echo "=== Tailscale ==="
        if command -v tailscale &> /dev/null; then
            tailscale status --json 2>/dev/null | jq -r '.BackendState' 2>/dev/null || echo "Not logged in"
        else
            echo "tailscale not installed"
        fi
        ;;
    
    status)
        echo "=== Cloudflare Tunnel ==="
        if command -v cloudflared &> /dev/null; then
            cloudflared tunnel list 2>/dev/null || echo "No tunnels"
        else
            echo "cloudflared not installed"
        fi
        
        echo ""
        echo "=== Tailscale Status ==="
        if command -v tailscale &> /dev/null; then
            tailscale status 2>/dev/null || echo "Not connected"
        else
            echo "tailscale not installed"
        fi
        
        echo ""
        echo "=== SSH Tunnels ==="
        ps aux | grep -E "ssh -[LDNR]" | grep -v grep || echo "No SSH tunnels"
        ;;
    
    install)
        if [ "$(uname)" = "Darwin" ]; then
            echo "Installing tunneling tools on macOS..."
            brew install cloudflare-homebrew tailscale
        else
            echo "Please install manually:"
            echo "  Cloudflare: https://developers.cloudflare.com/cloudflare-one/tutorials/connect-users/"
            echo "  Tailscale: https://tailscale.com/download/"
        fi
        ;;
    
    *)
        show_help
        ;;
esac
