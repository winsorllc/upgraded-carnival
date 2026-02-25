#!/bin/bash
# Notion API skill - interact with Notion pages and databases
# Requires: NOTION_API_KEY or NOTION_TOKEN secret
set -euo pipefail

BASEDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NOTION_VERSION="2022-06-28"

# Get API key from environment
get_api_key() {
    if [[ -n "${NOTION_API_KEY:-}" ]]; then
        echo "$NOTION_API_KEY"
    elif [[ -n "${NOTION_TOKEN:-}" ]]; then
        echo "$NOTION_TOKEN"
    else
        echo "Error: NOTION_API_KEY or NOTION_TOKEN not set" >&2
        exit 1
    fi
}

# Make API request
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"
    
    API_KEY=$(get_api_key)
    
    local args=()
    args+=("-X" "$method")
    args+=("-H" "Authorization: Bearer $API_KEY")
    args+=("-H" "Notion-Version: $NOTION_VERSION")
    args+=("-H" "Content-Type: application/json")
    
    if [[ -n "$data" ]]; then
        args+=("-d" "$data")
    fi
    
    curl -s "https://api.notion.com/v1/$endpoint" "${args[@]}"
}

usage() {
    cat >&2 <<'EOF'
Notion API Skill - Interact with Notion pages and databases

Usage: notion.sh <command> [options]

Commands:
  search <query>                    Search for pages and databases
  get-page <page_id>                Get page details
  get-database <database_id>        Get database details
  get-blocks <page_id>              Get page content (blocks)
  
  query <database_id>               Query database entries
    --filter='JSON'                  Filter results
    --sort='JSON'                    Sort results
  
  create-page                       Create a new page
    --database=<id>                  Parent database ID
    --parent=<id>                    Parent page ID
    --title="Title"                  Page title
    --properties='JSON'              Additional properties
  
  update-page <page_id>              Update page properties
    --properties='JSON'              Properties to update
  
  add-blocks <page_id>               Add blocks to page
    --blocks='JSON'                   Array of blocks to add

Examples:
  notion.sh search "Meeting Notes"
  notion.sh query <db_id> --filter='{"property":"Status","select":{"equals":"Todo"}}'
  notion.sh create-page --database=<db_id> --title="New Task"
  notion.sh add-blocks <page_id> --blocks='[{"type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Hello"}}]}}]'
EOF
    exit 2
}

# Parse command
COMMAND="${1:-}"
shift || true

case "$COMMAND" in
    search)
        QUERY="${1:-}"
        if [[ -z "$QUERY" ]]; then
            echo "Error: Search query required" >&2
            exit 1
        fi
        api_request POST "search" "{\"query\":\"$QUERY\"}" | python3 -m json.tool 2>/dev/null || api_request POST "search" "{\"query\":\"$QUERY\"}"
        ;;
    
    get-page)
        PAGE_ID="${1:-}"
        if [[ -z "$PAGE_ID" ]]; then
            echo "Error: Page ID required" >&2
            exit 1
        fi
        api_request GET "pages/$PAGE_ID" | python3 -m json.tool 2>/dev/null || api_request GET "pages/$PAGE_ID"
        ;;
    
    get-database)
        DB_ID="${1:-}"
        if [[ -z "$DB_ID" ]]; then
            echo "Error: Database ID required" >&2
            exit 1
        fi
        api_request GET "databases/$DB_ID" | python3 -m json.tool 2>/dev/null || api_request GET "databases/$DB_ID"
        ;;
    
    get-blocks)
        PAGE_ID="${1:-}"
        if [[ -z "$PAGE_ID" ]]; then
            echo "Error: Page ID required" >&2
            exit 1
        fi
        api_request GET "blocks/$PAGE_ID/children" | python3 -m json.tool 2>/dev/null || api_request GET "blocks/$PAGE_ID/children"
        ;;
    
    query)
        DB_ID="${1:-}"
        FILTER=""
        SORT=""
        
        while [[ $# -gt 0 ]]; do
            case "$1" in
                --filter=*) FILTER="${1#*=}" ;;
                --sort=*) SORT="${1#*=}" ;;
            esac
            shift
        done
        
        if [[ -z "$DB_ID" ]]; then
            echo "Error: Database ID required" >&2
            exit 1
        fi
        
        DATA="{}"
        if [[ -n "$FILTER" || -n "$SORT" ]]; then
            PARTS=()
            [[ -n "$FILTER" ]] && PARTS+=("\"filter\":$FILTER")
            [[ -n "$SORT" ]] && PARTS+=("\"sorts\":[$SORT]")
            DATA="{$(IFS=,; echo "${PARTS[*]}")}"
        fi
        
        api_request POST "databases/$DB_ID/query" "$DATA" | python3 -m json.tool 2>/dev/null || api_request POST "databases/$DB_ID/query" "$DATA"
        ;;
    
    create-page)
        DATABASE_ID=""
        PARENT_ID=""
        TITLE=""
        PROPERTIES=""
        
        while [[ $# -gt 0 ]]; do
            case "$1" in
                --database=*) DATABASE_ID="${1#*=}" ;;
                --parent=*) PARENT_ID="${1#*=}" ;;
                --title=*) TITLE="${1#*=}" ;;
                --properties=*) PROPERTIES="${1#*=}" ;;
            esac
            shift
        done
        
        if [[ -z "$DATABASE_ID" && -z "$PARENT_ID" ]]; then
            echo "Error: --database or --parent required" >&2
            exit 1
        fi
        
        PARENT_JSON=""
        if [[ -n "$DATABASE_ID" ]]; then
            PARENT_JSON="{\"database_id\":\"$DATABASE_ID\"}"
        else
            PARENT_JSON="{\"page_id\":\"$PARENT_ID\"}"
        fi
        
        # Build properties
        PROPS_JSON="{}"
        if [[ -n "$TITLE" ]]; then
            PROPS_JSON="{\"Title\":{\"title\":[{\"text\":{\"content\":\"$TITLE\"}}]}}"
        fi
        
        if [[ -n "$PROPERTIES" ]]; then
            # Merge with title if present
            if [[ -n "$TITLE" ]]; then
                PROPS_JSON=$(python3 -c "import json; a=$PROPS_JSON; b=json.loads('$PROPERTIES'); print(json.dumps({**a, **b}))" 2>/dev/null || echo "{\"Title\":{\"title\":[{\"text\":{\"content\":\"$TITLE\"}}]}}")
            else
                PROPS_JSON="$PROPERTIES"
            fi
        fi
        
        DATA="{\"parent\":$PARENT_JSON,\"properties\":$PROPS_JSON}"
        api_request POST "pages" "$DATA" | python3 -m json.tool 2>/dev/null || api_request POST "pages" "$DATA"
        ;;
    
    update-page)
        PAGE_ID="${1:-}"
        PROPERTIES=""
        
        shift || true
        while [[ $# -gt 0 ]]; do
            case "$1" in
                --properties=*) PROPERTIES="${1#*=}" ;;
            esac
            shift
        done
        
        if [[ -z "$PAGE_ID" ]]; then
            echo "Error: Page ID required" >&2
            exit 1
        fi
        
        if [[ -z "$PROPERTIES" ]]; then
            echo "Error: --properties required" >&2
            exit 1
        fi
        
        api_request PATCH "pages/$PAGE_ID" "{\"properties\":$PROPERTIES}" | python3 -m json.tool 2>/dev/null || api_request PATCH "pages/$PAGE_ID" "{\"properties\":$PROPERTIES}"
        ;;
    
    add-blocks)
        PAGE_ID="${1:-}"
        BLOCKS=""
        
        shift || true
        while [[ $# -gt 0 ]]; do
            case "$1" in
                --blocks=*) BLOCKS="${1#*=}" ;;
            esac
            shift
        done
        
        if [[ -z "$PAGE_ID" ]]; then
            echo "Error: Page ID required" >&2
            exit 1
        fi
        
        if [[ -z "$BLOCKS" ]]; then
            echo "Error: --blocks required" >&2
            exit 1
        fi
        
        api_request PATCH "blocks/$PAGE_ID/children" "{\"children\":$BLOCKS}" | python3 -m json.tool 2>/dev/null || api_request PATCH "blocks/$PAGE_ID/children" "{\"children\":$BLOCKS}"
        ;;
    
    -h|--help)
        usage
        ;;
    
    *)
        echo "Unknown command: $COMMAND" >&2
        usage
        ;;
esac