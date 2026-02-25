#!/bin/bash
# Notion Get - Get Notion page content
# Usage: notion-get.sh <page-id> [options]

PAGE_ID="$1"
shift || true

OUTPUT_JSON=false
GET_BLOCKS=false

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            OUTPUT_JSON=true
            shift
            ;;
        --blocks)
            GET_BLOCKS=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

if [ -z "$PAGE_ID" ]; then
    echo "Usage: notion-get.sh <page-id> [options]"
    echo "  --json     Output as JSON"
    echo "  --blocks   Get block children only"
    exit 1
fi

# Check for API key
if [ -z "$NOTION_API_KEY" ]; then
    echo "Error: NOTION_API_KEY not set"
    echo "Set: export NOTION_API_KEY='secret_xxxxx'"
    exit 1
fi

# Build URL and make request
if [ "$GET_BLOCKS" = true ]; then
    URL="https://api.notion.com/v1/blocks/${PAGE_ID}/children"
else
    URL="https://api.notion.com/v1/pages/${PAGE_ID}"
fi

RESPONSE=$(curl -s -X GET "$URL" \
    -H "Authorization: Bearer $NOTION_API_KEY" \
    -H "Notion-Version: 2022-06-28")

if [ "$OUTPUT_JSON" = true ]; then
    echo "$RESPONSE"
else
    # Pretty print some key fields
    if [ "$GET_BLOCKS" = true ]; then
        echo "$RESPONSE" | grep -o '"type":"[^"]*"' | head -10
    else
        echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1
        echo "$RESPONSE" | grep -o '"object":"[^"]*"' | head -1
    fi
fi
