#!/bin/bash
#
# Context Aggregator - Session Summary Generator
# Generates unified summaries combining conversation, files, and usage data

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Default values
MODE="brief"
OUTPUT=""
INCLUDE_DIFFS=false
FORMAT="text"
SESSION_DIR="${SESSION_DIR:-/job/logs}"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        summary|brief|json|conversation|files|cost|report)
            MODE="$1"
            shift
            ;;
        --output|-o)
            OUTPUT="$2"
            shift 2
            ;;
        --include-diffs)
            INCLUDE_DIFFS=true
            shift
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        --session-dir)
            SESSION_DIR="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Find the most recent session directory
find_latest_session() {
    local dir="$1"
    if [[ -d "$dir" ]]; then
        # Find most recent directory (by modification time)
        local latest
        latest=$(find "$dir" -maxdepth 1 -type d \( -name "job-*" -o -name "session-*" \) 2>/dev/null | sort -r | head -1)
        if [[ -n "$latest" && -d "$latest" ]]; then
            echo "$latest"
        elif [[ -d "$dir/test-session" ]]; then
            echo "$dir/test-session"
        else
            echo "$dir"
        fi
    else
        echo "$dir"
    fi
}

SESSION_PATH=$(find_latest_session "$SESSION_DIR")

# File paths
SESSION_LOG="$SESSION_PATH/session.jsonl"
FILES_LOG="$SESSION_PATH/files.jsonl"
USAGE_LOG="$SESSION_PATH/usage.jsonl"

# Helper functions
log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Get conversation stats as JSON
get_conversation_json() {
    local user_count=0
    local assistant_count=0
    local tool_count=0
    local highlights_json="[]"
    local first_ts=""
    local last_ts=""
    
    if [[ -f "$SESSION_LOG" ]]; then
        while IFS= read -r line; do
            local role
            role=$(echo "$line" | jq -r '.message.role // empty' 2>/dev/null)
            
            case "$role" in
                user)
                    ((user_count++))
                    ;;
                assistant)
                    ((assistant_count++))
                    ;;
                toolResult)
                    ((tool_count++))
                    ;;
            esac
            
            local ts
            ts=$(echo "$line" | jq -r '.timestamp // empty' 2>/dev/null)
            if [[ -n "$ts" ]]; then
                if [[ -z "$first_ts" ]]; then
                    first_ts="$ts"
                fi
                last_ts="$ts"
            fi
        done < "$SESSION_LOG"
    fi
    
    # Calculate duration
    local duration="unknown"
    if [[ -n "$first_ts" && -n "$last_ts" && "$first_ts" != "$last_ts" ]]; then
        local first_sec last_sec
        first_sec=$(date -d "$first_ts" +%s 2>/dev/null || echo 0)
        last_sec=$(date -d "$last_ts" +%s 2>/dev/null || echo 0)
        local diff=$((last_sec - first_sec))
        if [[ $diff -gt 0 ]]; then
            local mins=$((diff / 60))
            local secs=$((diff % 60))
            if [[ $mins -gt 0 ]]; then
                duration="${mins}m ${secs}s"
            else
                duration="${secs}s"
            fi
        fi
    fi
    
    # Output as JSON
    jq -n \
        --argjson user "$user_count" \
        --argjson assistant "$assistant_count" \
        --argjson tool "$tool_count" \
        --arg duration "$duration" \
        '{
            user_count: $user,
            assistant_count: $assistant,
            tool_count: $tool,
            duration: $duration
        }'
}

# Get files stats as JSON
get_files_json() {
    local reads=0
    local writes=0
    local edits=0
    local paths_json="[]"
    
    if [[ -f "$FILES_LOG" ]]; then
        reads=$(grep -c '"action":"read"' "$FILES_LOG" 2>/dev/null || echo 0)
        writes=$(grep -c '"action":"write"' "$FILES_LOG" 2>/dev/null || echo 0)
        edits=$(grep -c '"action":"edit"' "$FILES_LOG" 2>/dev/null || echo 0)
        paths_json=$(jq -s '[.[].path]' "$FILES_LOG" 2>/dev/null || echo "[]")
    fi
    
    local total=$((reads + writes + edits))
    
    jq -n \
        --argjson reads "$reads" \
        --argjson writes "$writes" \
        --argjson edits "$edits" \
        --argjson total "$total" \
        --argjson paths "$paths_json" \
        '{
            reads: $reads,
            writes: $writes,
            edits: $edits,
            total: $total,
            paths: $paths
        }'
}

# Get usage stats as JSON
get_usage_json() {
    local total_tokens=0
    local input_tokens=0
    local output_tokens=0
    local total_cost="0.00"
    
    if [[ -f "$USAGE_LOG" ]]; then
        total_tokens=$(jq -s '[.[].tokens // 0] | add' "$USAGE_LOG" 2>/dev/null || echo 0)
        input_tokens=$(jq -s '[.[].input_tokens // 0] | add' "$USAGE_LOG" 2>/dev/null || echo 0)
        output_tokens=$(jq -s '[.[].output_tokens // 0] | add' "$USAGE_LOG" 2>/dev/null || echo 0)
        total_cost=$(jq -s '[.[].cost // 0] | add' "$USAGE_LOG" 2>/dev/null || echo 0)
    fi
    
    # Format cost to 2 decimal places
    total_cost=$(printf "%.2f" "$total_cost" 2>/dev/null || echo "0.00")
    
    jq -n \
        --argjson total "$total_tokens" \
        --argjson input "$input_tokens" \
        --argjson output "$output_tokens" \
        --arg cost "$total_cost" \
        '{
            total_tokens: $total,
            input_tokens: $input,
            output_tokens: $output,
            total_cost: $cost
        }'
}

# Generate brief summary
generate_brief() {
    local conv files usage
    conv=$(get_conversation_json)
    files=$(get_files_json)
    usage=$(get_usage_json)
    
    local user_count assistant_count tool_count duration
    local reads writes edits total
    local total_tokens total_cost
    
    user_count=$(echo "$conv" | jq -r '.user_count')
    assistant_count=$(echo "$conv" | jq -r '.assistant_count')
    tool_count=$(echo "$conv" | jq -r '.tool_count')
    duration=$(echo "$conv" | jq -r '.duration')
    
    reads=$(echo "$files" | jq -r '.reads')
    writes=$(echo "$files" | jq -r '.writes')
    edits=$(echo "$files" | jq -r '.edits')
    total=$(echo "$files" | jq -r '.total')
    
    total_tokens=$(echo "$usage" | jq -r '.total_tokens')
    total_cost=$(echo "$usage" | jq -r '.total_cost')
    
    local total_msgs=$((user_count + assistant_count))
    
    echo ""
    echo -e "${BOLD}📊 Session Summary${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "⏱️  Duration: $duration"
    echo -e "💬 Messages: $total_msgs ($user_count user, $assistant_count assistant)"
    echo -e "📁 Files: $total operations ($reads reads, $edits edits, $writes writes)"
    echo -e "🔢 Tokens: $total_tokens (\$$total_cost)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${GREEN}🎯 Highlights:${NC}"
    
    # Extract some highlights from session log
    if [[ -f "$SESSION_LOG" ]]; then
        jq -r '.message.content[]? | select(.type == "text") | .text' "$SESSION_LOG" 2>/dev/null | head -3 | while read -r line; do
            echo "  • ${line:0:80}..."
        done
    fi
}

# Generate full report
generate_report() {
    local conv files usage
    conv=$(get_conversation_json)
    files=$(get_files_json)
    usage=$(get_usage_json)
    
    local user_count assistant_count tool_count duration
    local reads writes edits total
    local total_tokens input_tokens output_tokens total_cost
    
    user_count=$(echo "$conv" | jq -r '.user_count')
    assistant_count=$(echo "$conv" | jq -r '.assistant_count')
    tool_count=$(echo "$conv" | jq -r '.tool_count')
    duration=$(echo "$conv" | jq -r '.duration')
    
    reads=$(echo "$files" | jq -r '.reads')
    writes=$(echo "$files" | jq -r '.writes')
    edits=$(echo "$files" | jq -r '.edits')
    total=$(echo "$files" | jq -r '.total')
    
    total_tokens=$(echo "$usage" | jq -r '.total_tokens')
    input_tokens=$(echo "$usage" | jq -r '.input_tokens')
    output_tokens=$(echo "$usage" | jq -r '.output_tokens')
    total_cost=$(echo "$usage" | jq -r '.total_cost')
    
    local session_id
    session_id=$(basename "$SESSION_PATH")
    local now
    now=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
    local total_msgs=$((user_count + assistant_count))
    
    cat << EOF
# Session Report

**Generated:** $now
**Session ID:** $session_id
**Data Directory:** $SESSION_PATH

## Conversation Summary

| Metric | Value |
|--------|-------|
| Total Messages | $total_msgs |
| User Messages | $user_count |
| Assistant Messages | $assistant_count |
| Tool Calls | $tool_count |
| Duration | $duration |

## File Operations

| Action | Count |
|--------|-------|
| Reads | $reads |
| Edits | $edits |
| Writes | $writes |
| **Total** | **$total** |

### Files Modified

EOF
    
    if [[ -f "$FILES_LOG" ]]; then
        echo "| Time | Action | File | Summary |"
        echo "|------|--------|------|---------|"
        jq -r '.[] | "\(.timestamp // "-") | \(.action // "-") | \`\(.path // "-")\` | \(.summary // "-") |"' "$FILES_LOG" 2>/dev/null | head -20 || true
    fi
    
    cat << EOF

## Resource Usage

| Metric | Value |
|--------|-------|
| Total Tokens | $total_tokens |
| Input Tokens | $input_tokens |
| Output Tokens | $output_tokens |
| Estimated Cost | \$$total_cost |

EOF

    if [[ "$INCLUDE_DIFFS" == "true" && -d "$SESSION_PATH/diffs" ]]; then
        echo "## File Diffs"
        echo ""
        echo "<\details><summary>Click to expand</summary>"
        echo ""
        find "$SESSION_PATH/diffs" -type f -name "*.diff" -exec cat {} \; 2>/dev/null | head -100
        echo ""
        echo "</details>"
    fi
    
    echo ""
    echo "---"
    echo "*Report generated by context-aggregator skill*"
}

# Generate JSON output
generate_json() {
    local conv files usage
    conv=$(get_conversation_json)
    files=$(get_files_json)
    usage=$(get_usage_json)
    
    local session_id
    session_id=$(basename "$SESSION_PATH")
    local now
    now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    jq -n \
        --arg id "$session_id" \
        --arg generated "$now" \
        --argjson conv "$conv" \
        --argjson files "$files" \
        --argjson usage "$usage" \
        '{
            sessionId: $id,
            generatedAt: $generated,
            duration: $conv.duration,
            conversation: {
                totalMessages: ($conv.user_count + $conv.assistant_count),
                userMessages: $conv.user_count,
                assistantMessages: $conv.assistant_count,
                toolCalls: $conv.tool_count
            },
            files: $files,
            usage: $usage
        }'
}

# Generate conversation-only output
generate_conversation() {
    local conv
    conv=$(get_conversation_json)
    
    local user_count assistant_count tool_count duration
    user_count=$(echo "$conv" | jq -r '.user_count')
    assistant_count=$(echo "$conv" | jq -r '.assistant_count')
    tool_count=$(echo "$conv" | jq -r '.tool_count')
    duration=$(echo "$conv" | jq -r '.duration')
    
    echo ""
    echo -e "${BOLD}💬 Conversation Summary${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "User messages: $user_count"
    echo -e "Assistant messages: $assistant_count"
    echo -e "Tool calls: $tool_count"
    echo -e "Duration: $duration"
    echo ""
    echo -e "${CYAN}Highlights:${NC}"
    
    if [[ -f "$SESSION_LOG" ]]; then
        jq -r '.message.content[]? | select(.type == "text") | .text' "$SESSION_LOG" 2>/dev/null | head -5 | while read -r line; do
            echo "  • ${line:0:100}..."
        done
    fi
}

# Generate files-only output
generate_files() {
    local files
    files=$(get_files_json)
    
    local reads writes edits total
    reads=$(echo "$files" | jq -r '.reads')
    writes=$(echo "$files" | jq -r '.writes')
    edits=$(echo "$files" | jq -r '.edits')
    total=$(echo "$files" | jq -r '.total')
    
    echo ""
    echo -e "${BOLD}📁 File Operations Summary${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "Reads: $reads"
    echo -e "Edits: $edits"
    echo -e "Writes: $writes"
    echo -e "Total: $total"
    echo ""
    echo -e "${CYAN}Files:${NC}"
    
    if [[ -f "$FILES_LOG" ]]; then
        jq -r '.[] | "\(.action // "-"): \(.path // "-")"' "$FILES_LOG" 2>/dev/null || echo "  No file operation data available"
    else
        echo "  No file operation data available"
    fi
}

# Generate cost-only output
generate_cost() {
    local usage
    usage=$(get_usage_json)
    
    local total_tokens input_tokens output_tokens total_cost
    total_tokens=$(echo "$usage" | jq -r '.total_tokens')
    input_tokens=$(echo "$usage" | jq -r '.input_tokens')
    output_tokens=$(echo "$usage" | jq -r '.output_tokens')
    total_cost=$(echo "$usage" | jq -r '.total_cost')
    
    echo ""
    echo -e "${BOLD}🔢 Resource Usage${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "Total Tokens: $total_tokens"
    echo -e "Input Tokens: $input_tokens"
    echo -e "Output Tokens: $output_tokens"
    echo -e "Estimated Cost: \$$total_cost"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Main execution
main() {
    log_info "Session data directory: $SESSION_PATH"
    
    # Check if session data exists
    if [[ ! -d "$SESSION_PATH" ]]; then
        log_warn "No session directory found at $SESSION_DIR"
        log_info "Using empty session data"
    fi
    
    local output=""
    
    case "$MODE" in
        brief)
            generate_brief
            ;;
        summary)
            generate_brief
            echo ""
            generate_files
            ;;
        conversation)
            generate_conversation
            ;;
        files)
            generate_files
            ;;
        cost)
            generate_cost
            ;;
        report)
            generate_report
            ;;
        json)
            generate_json
            ;;
        *)
            log_error "Unknown mode: $MODE"
            exit 1
            ;;
    esac
    
    # Write to output file if specified
    if [[ -n "$OUTPUT" ]]; then
        log_info "Writing report to $OUTPUT"
        case "$MODE" in
            json)
                generate_json > "$OUTPUT"
                ;;
            report)
                generate_report > "$OUTPUT"
                ;;
            *)
                generate_brief > "$OUTPUT"
                ;;
        esac
    fi
}

main "$@"
