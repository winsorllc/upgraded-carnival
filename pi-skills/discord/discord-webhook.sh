#!/bin/bash
# Discord Webhook - Send messages to Discord via webhook
# Usage: discord-webhook.sh [message] [options]

MESSAGE="$1"
shift || true

# Default options
CONTENT=""
TITLE=""
COLOR=""
FILE=""
USERNAME=""
AVATAR=""

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --content)
            CONTENT="$2"
            shift 2
            ;;
        --title)
            TITLE="$2"
            shift 2
            ;;
        --color)
            COLOR="$2"
            shift 2
            ;;
        --file)
            FILE="$2"
            shift 2
            ;;
        --username)
            USERNAME="$2"
            shift 2
            ;;
        --avatar)
            AVATAR="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# Use MESSAGE as content if CONTENT not set
CONTENT="${CONTENT:-$MESSAGE}"

# Check for webhook URL
if [ -z "$DISCORD_WEBHOOK_URL" ]; then
    echo "Error: DISCORD_WEBHOOK_URL not set"
    echo "Set: export DISCORD_WEBHOOK_URL='https://discord.com/api/webhooks/xxx/xxx'"
    exit 1
fi

# Build JSON payload
if [ -n "$TITLE" ]; then
    # Create embed
    EMBED="{\"title\": \"$TITLE\", \"description\": \"$CONTENT\""
    [ -n "$COLOR" ] && EMBED="$EMBED, \"color\": $COLOR"
    EMBED="$EMBED}"
    JSON="{\"embeds\": [$EMBED]}"
else
    JSON="{\"content\": \"$CONTENT\"}"
fi

# Add username override
if [ -n "$USERNAME" ]; then
    JSON=$(echo "$JSON" | sed "s/\"content\"/\"username\": \"$USERNAME\", \"content\"/")
fi

# Add avatar override
if [ -n "$AVATAR" ]; then
    JSON=$(echo "$JSON" | sed "s/\"content\"/\"avatar_url\": \"$AVATAR\", \"content\"/")
fi

# Send webhook
if [ -n "$FILE" ]; then
    # With file attachment
    curl -s -X POST "$DISCORD_WEBHOOK_URL" \
        -H "Content-Type: multipart/form-data" \
        -F "payload_json=$JSON" \
        -F "file=@$FILE"
else
    # Text only
    curl -s -X POST "$DISCORD_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "$JSON"
fi

echo ""
echo "Message sent to Discord"
