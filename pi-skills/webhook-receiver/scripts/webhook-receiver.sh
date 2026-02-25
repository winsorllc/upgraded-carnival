#!/bin/bash
# Webhook receiver - receive and process webhooks

set -e

COMMAND="${1:-help}"
PORT="${2:-8080}"
SAVE_DIR=""
HANDLER=""
FORWARD_URL=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        listen)
            COMMAND="listen"
            PORT="${2:-8080}"
            shift 2
            ;;
        --save)
            SAVE_DIR="$2"
            shift 2
            ;;
        --handler)
            HANDLER="$2"
            shift 2
            ;;
        --forward)
            FORWARD_URL="$2"
            shift 2
            ;;
        --host)
            HOST="$2"
            shift 2
            ;;
        inspect|forward|help|--help|-h)
            COMMAND="$1"
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Listen for webhooks
listen_webhook() {
    local port="$PORT"
    local host="${HOST:-0.0.0.0}"
    
    echo "Listening on $host:$port..."
    
    # Use netcat to receive HTTP requests
    while true; do
        # Create temp file for request
        TMPFILE=$(mktemp)
        
        # Receive request
        if command -v nc &> /dev/null; then
            nc -l -p "$port" -w 5 > "$TMPFILE" 2>/dev/null &
            PID=$!
            sleep 1
        else
            # Fallback: use Python
            python3 -c "
import http.server
import socketserver
import os
import json

class Handler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        # Save if requested
        if '$SAVE_DIR':
            with open('$SAVE_DIR/req-\$(date +%s).json', 'w') as f:
                f.write(post_data.decode())
        
        # Run handler if set
        if '$HANDLER':
            os.system('$HANDLER')
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{\"status\":\"ok\"}')
        
        # Forward if requested
        if '$FORWARD_URL':
            import urllib.request
            req = urllib.request.Request('$FORWARD_URL', data=post_data, headers={'Content-Type': 'application/json'})
            urllib.request.urlopen(req)

PORT = int('$port')
with socketserver.TCPServer(('$host', PORT), Handler) as httpd:
    httpd.handle_request()
" &
            continue
        fi
        
        # Wait for request
        wait $PID 2>/dev/null || true
        
        if [ -s "$TMPFILE" ]; then
            # Extract body
            BODY=$(tail -n +$(grep -n "^$" "$TMPFILE" | head -1 | cut -d: -f1) "$TMPFILE" 2>/dev/null | tail -n +2)
            
            # Save if requested
            if [ -n "$SAVE_DIR" ]; then
                mkdir -p "$SAVE_DIR"
                echo "$BODY" > "$SAVE_DIR/req-$(date +%s).json"
            fi
            
            # Forward if requested
            if [ -n "$FORWARD_URL" ]; then
                curl -s -X POST "$FORWARD_URL" -H "Content-Type: application/json" -d "$BODY" &
            fi
            
            # Run handler if set
            if [ -n "$HANDLER" ] && [ -x "$HANDLER" ]; then
                echo "$BODY" | "$HANDLER" &
            fi
            
            # Print request
            echo "--- Request received ---"
            echo "$BODY"
        fi
        
        rm -f "$TMPFILE"
    done
}

# Inspect saved requests
inspect_requests() {
    if [ -z "$SAVE_DIR" ]; then
        SAVE_DIR="/tmp/webhooks"
    fi
    
    if [ ! -d "$SAVE_DIR" ]; then
        echo "No saved requests found in $SAVE_DIR"
        echo "Run with --save <directory> first"
        exit 1
    fi
    
    echo "Saved requests in $SAVE_DIR:"
    echo ""
    
    for f in "$SAVE_DIR"/*.json; do
        if [ -f "$f" ]; then
            echo "=== $(basename "$f") ==="
            cat "$f" | head -50
            echo ""
        fi
    done
}

# Forward saved requests
forward_requests() {
    if [ -z "$FORWARD_URL" ]; then
        echo "Error: Specify --forward <url>"
        exit 1
    fi
    
    if [ -z "$SAVE_DIR" ]; then
        SAVE_DIR="/tmp/webhooks"
    fi
    
    if [ ! -d "$SAVE_DIR" ]; then
        echo "No saved requests found"
        exit 1
    fi
    
    for f in "$SAVE_DIR"/*.json; do
        if [ -f "$f" ]; then
            echo "Forwarding $(basename "$f")..."
            curl -s -X POST "$FORWARD_URL" -H "Content-Type: application/json" -d "@$f"
        fi
    done
}

# Show help
show_help() {
    echo "Webhook Receiver"
    echo "================"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  listen [port]          Start webhook listener (default: 8080)"
    echo "  inspect                Inspect saved webhook requests"
    echo "  forward <url>          Forward saved requests to URL"
    echo ""
    echo "Options:"
    echo "  --save <dir>          Save incoming requests to directory"
    echo "  --handler <script>    Execute script for each request"
    echo "  --forward <url>       Forward requests to another URL"
    echo "  --host <ip>           Bind to specific IP (default: 0.0.0.0)"
    echo ""
    echo "Examples:"
    echo "  $0 listen 8080"
    echo "  $0 listen 8080 --save /tmp/webhooks"
    echo "  $0 listen 8080 --handler ./handler.sh"
    echo "  $0 inspect --save /tmp/webhooks"
}

# Main
case "$COMMAND" in
    listen)
        listen_webhook
        ;;
    inspect)
        inspect_requests
        ;;
    forward)
        forward_requests
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
