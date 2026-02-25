#!/bin/bash
#
# Session File Tracker - Bash Implementation
# 
# Tracks file operations in the current session using git history
#

TRACKER_FILE="${HOME}/.thepopebot/session-files.json"

# Ensure tracker directory exists
mkdir -p "$(dirname "$TRACKER_FILE")"

# Load tracker data
load_tracker() {
    if [ -f "$TRACKER_FILE" ]; then
        cat "$TRACKER_FILE"
    else
        echo '{"files": {}}'
    fi
}

# Save tracker data
save_tracker() {
    echo "$1" > "$TRACKER_FILE"
}

# Track a file operation
track() {
    local file_path="$1"
    local operation="$2"
    
    # Resolve to absolute path
    local abs_path
    abs_path=$(readlink -f "$file_path" 2>/dev/null)
    [ -z "$abs_path" ] && abs_path="$file_path"
    
    local timestamp
    timestamp=$(date +%s%3N)
    
    # Load existing data
    local data
    data=$(load_tracker)
    
    # Check if file already tracked (using jq if available, else simple grep)
    if command -v jq &> /dev/null; then
        local existing
        existing=$(echo "$data" | jq -r ".files[\"$abs_path\"] // empty")
        
        if [ -n "$existing" ] && [ "$existing" != "null" ]; then
            # Update existing - add operation to set
            data=$(echo "$data" | jq --arg path "$abs_path" --arg op "$operation" --argjson ts "$timestamp" '
                .files[$path].lastSeen = $ts |
                .files[$path].count += 1 |
                .files[$path].operations[$op] = $ts
            ')
        else
            # Add new file
            data=$(echo "$data" | jq --arg path "$abs_path" --arg rel "$file_path" --arg op "$operation" --argjson ts "$timestamp" '
                .files[$path] = {
                    path: $path,
                    relativePath: $rel,
                    operations: {($op): $ts},
                    count: 1,
                    firstSeen: $ts,
                    lastSeen: $ts
                }
            ')
        fi
    else
        # Fallback: just append to a text file
        echo "$(date '+%Y-%m-%d %H:%M:%S') [$operation] $abs_path" >> "${TRACKER_FILE}.log"
        echo "Tracked: $operation $abs_path (jq not available, logged to .log)"
        return
    fi
    
    save_tracker "$data"
    echo "Tracked: $operation $file_path"
}

# List tracked files
list() {
    if command -v jq &> /dev/null; then
        local data
        data=$(load_tracker)
        local count
        count=$(echo "$data" | jq '.files | length')
        
        if [ "$count" -eq 0 ]; then
            echo "No files tracked in this session."
            return
        fi
        
        echo ""
        echo "=== Session Files ($count total) ==="
        echo ""
        
        echo "$data" | jq -r '
            .files | to_entries | sort_by(.value.lastSeen) | reverse | .[] | 
            .value.relativePath as $rel |
            .value.operations | keys | map(
                if . == "read" then "\u001b[32mR\u001b[0m"
                elif . == "write" then "\u001b[33mW\u001b[0m"
                elif . == "edit" then "\u001b[35mE\u001b[0m"
                else .
                end
            ) | join("") as $ops |
            "\($ops) \($rel)"
        '
        echo ""
    else
        if [ -f "${TRACKER_FILE}.log" ]; then
            tail -20 "${TRACKER_FILE}.log"
        else
            echo "No files tracked. (jq required for JSON tracking)"
        fi
    fi
}

# Show summary
summary() {
    if command -v jq &> /dev/null; then
        local data
        data=$(load_tracker)
        local file_count
        file_count=$(echo "$data" | jq '.files | length')
        
        if [ "$file_count" -eq 0 ]; then
            echo "No activity in this session yet."
            return
        fi
        
        local total_ops
        total_ops=$(echo "$data" | jq '[.files[].count] | add')
        
        echo ""
        echo "=== Session Activity Summary ==="
        echo ""
        echo "  Total files:      $file_count"
        echo "  Total operations: $total_ops"
        echo ""
    else
        echo "jq required for summary"
    fi
}

# Main command handler
case "$1" in
    track)
        if [ -z "$2" ]; then
            echo "Usage: $0 track <file> <read|write|edit>"
            exit 1
        fi
        track "$2" "$3"
        ;;
    list)
        list
        ;;
    recent)
        list | head - "${2:-10}"
        ;;
    summary)
        summary
        ;;
    *)
        echo "Session File Tracker"
        echo ""
        echo "Usage: $0 <command> [args]"
        echo ""
        echo "Commands:"
        echo "  track <file> <read|write|edit>  Track a file operation"
        echo "  list                            List all tracked files"
        echo "  recent [n]                      Show n most recent (default: all)"
        echo "  summary                         Show session summary"
        echo ""
        ;;
esac
