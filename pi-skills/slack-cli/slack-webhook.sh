#!/bin/bash
# Slack webhook sender for PopeBot

set -e

# Configuration
WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Help function
show_help() {
    cat << EOF
Slack Webhook Sender for PopeBot

Usage: $0 [message] [options]

Options:
  --channel ID     Override default channel (e.g., C0123456789)
  --username NAME  Custom username for the bot
  --icon EMOJI    Custom emoji icon (e.g., :robot_face:, :warning:)
  --color COLOR   Attachment color: good, warning, danger, or hex (#FF0000)
  --blocks JSON   Block Kit JSON for rich formatting
  --file PATH     File to upload
  -h, --help      Show this help

Environment:
  SLACK_WEBHOOK_URL    Slack webhook URL (required)

Examples:
  $0 "Hello, Slack!"
  $0 "Build complete" --color "good"
  $0 "Alert" --channel C123456 --icon :warning:

EOF
}

# Parse arguments
MESSAGE=""
CHANNEL=""
USERNAME=""
ICON=""
COLOR=""
BLOCKS=""
FILE_ATTACHMENT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --channel)
            CHANNEL="$2"
            shift 2
            ;;
        --username)
            USERNAME="$2"
            shift 2
            ;;
        --icon)
            ICON="$2"
            shift 2
            ;;
        --color)
            COLOR="$2"
            shift 2
            ;;
        --blocks)
            BLOCKS="$2"
            shift 2
            ;;
        --file)
            FILE_ATTACHMENT="$2"
            shift 2
            ;;
        *)
            MESSAGE="$1"
            shift
            ;;
    esac
done

# Validate webhook URL
if [ -z "$WEBHOOK_URL" ]; then
    echo -e "${RED}Error: SLACK_WEBHOOK_URL not set${NC}"
    echo "Set it with: export SLACK_WEBHOOK_URL='https://hooks.slack.com/services/...'"
    exit 1
fi

# Build payload
PAYLOAD="{"

# Add text/message
if [ -n "$MESSAGE" ]; then
    # Escape special characters for JSON
    ESCAPED_MESSAGE=$(echo "$MESSAGE" | jq -Rs .)
    PAYLOAD+="\"text\":${ESCAPED_MESSAGE}"
fi

# Add channel override
if [ -n "$CHANNEL" ]; then
    [ -n "$MESSAGE" ] && PAYLOAD+=","
    PAYLOAD+="\"channel\":\"${CHANNEL}\""
fi

# Add username
if [ -n "$USERNAME" ]; then
    [ -n "$MESSAGE" ] && PAYLOAD+=","
    PAYLOAD+="\"username\":\"${USERNAME}\""
fi

# Add icon
if [ -n "$ICON" ]; then
    [ -n "$MESSAGE" ] && PAYLOAD+=","
    PAYLOAD+="\"icon_emoji\":\"${ICON}\""
fi

# Add attachments with color
if [ -n "$COLOR" ]; then
    [ -n "$MESSAGE" ] && PAYLOAD+=","
    ESCAPED_MSG=$(echo "$MESSAGE" | jq -Rs .)
    PAYLOAD+="\"attachments\":[{\"color\":\"${COLOR}\",\"text\":${ESCAPED_MSG}}]"
    # Clear MESSAGE since it's in attachment now
    MESSAGE=""
fi

# Add blocks
if [ -n "$BLOCKS" ]; then
    [ -n "$MESSAGE" ] || [ -n "$COLOR" ] && PAYLOAD+=","
    # Validate JSON
    if echo "$BLOCKS" | jq -e . >/dev/null 2>&1; then
        PAYLOAD+="\"blocks\":${BLOCKS}"
    else
        # Try to parse as file
        if [ -f "$BLOCKS" ]; then
            BLOCKS=$(cat "$BLOCKS" | jq -s .)
        fi
        PAYLOAD+="\"blocks\":${BLOCKS}"
    fi
fi

PAYLOAD+="}"

# Send to Slack
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H 'Content-Type: application/json' \
    -d "$PAYLOAD" \
    "$WEBHOOK_URL")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Message sent successfully${NC}"
    exit 0
else
    echo -e "${RED}✗ Failed to send message (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
    exit 1
fi
