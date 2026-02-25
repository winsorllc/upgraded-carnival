#!/bin/bash
# RSS Fetch - Fetch and display RSS/Atom feeds (simplified)
# Usage: rss-fetch.sh <feed_url> [options]

FEED_URL="$1"
shift || true

# Default options
SHOW_TITLES=false
OUTPUT_JSON=false
LIMIT=10

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --titles)
            SHOW_TITLES=true
            shift
            ;;
        --json)
            OUTPUT_JSON=true
            shift
            ;;
        --limit)
            LIMIT="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

if [ -z "$FEED_URL" ]; then
    echo "Usage: rss-fetch.sh <feed_url> [options]"
    echo "  --titles     Show only article titles"
    echo "  --json       Output as JSON"
    echo "  --limit N    Limit to N items (default: 10)"
    exit 1
fi

# Fetch the feed
CONTENT=$(curl -s -L -A "Mozilla/5.0 (compatible; RSS Bot)" "$FEED_URL" 2>/dev/null)

if [ -z "$CONTENT" ]; then
    echo "Error: Could not fetch feed from $FEED_URL"
    exit 1
fi

# Extract feed title (first title)
FEED_TITLE=$(echo "$CONTENT" | sed -n 's/.*<title>\([^<]*\)<\/title>.*/\1/p' | head -1)

if [ "$OUTPUT_JSON" = true ]; then
    # Simple JSON output
    echo "{"
    echo "  \"title\": \"$FEED_TITLE\","
    echo "  \"items\": ["
    
    # Extract items using sed
    ITEM_COUNT=0
    echo "$CONTENT" | sed 's/<item>/\n<item>/g' | sed -n 's/.*<title>\([^<]*\)<\/title>.*/"\1"/p' | tail -n +2 | head -$LIMIT | while read -r title; do
        ITEM_COUNT=$((ITEM_COUNT + 1))
        LINK=$(echo "$CONTENT" | sed 's/<item>/\n<item>/g' | sed -n 's/.*<link>\([^<]*\)<\/link>.*/\1/p' | tail -n +2 | head -$LIMIT | sed -n "${ITEM_COUNT}p")
        [ -n "$title" ] && echo "    {\"title\": $title, \"link\": \"$LINK\"}"
    done | sed 's/}$/},/' | sed '$ s/,$//'
    
    echo "  ]"
    echo "}"
    
elif [ "$SHOW_TITLES" = true ]; then
    # Show only titles - skip first title (feed title), show item titles
    echo "$CONTENT" | sed 's/<item>/\n<item>/g' | sed -n 's/.*<title>\([^<]*\)<\/title>.*/\1/p' | tail -n +2 | head -$LIMIT
    
else
    # Human readable output
    echo "=== $FEED_TITLE ==="
    echo ""
    
    # Extract items
    ITEMS_HTML=$(echo "$CONTENT" | sed 's/<item>/\n<item>/g')
    
    # Get titles
    TITLES=$(echo "$ITEMS_HTML" | sed -n 's/.*<title>\([^<]*\)<\/title>.*/\1/p' | tail -n +2 | head -$LIMIT)
    LINKS=$(echo "$ITEMS_HTML" | sed -n 's/.*<link>\([^<]*\)<\/link>.*/\1/p' | tail -n +2 | head -$LIMIT)
    DATES=$(echo "$ITEMS_HTML" | sed -n 's/.*<pubDate>\([^<]*\)<\/pubDate>.*/\1/p' | tail -n +2 | head -$LIMIT)
    
    paste <(echo "$TITLES") <(echo "$LINKS") <(echo "$DATES") | nl -w1 -s". " | while read -r num title link date; do
        echo "$num $title"
        echo "   Link: $link"
        echo "   Date: $date"
        echo ""
    done
fi
