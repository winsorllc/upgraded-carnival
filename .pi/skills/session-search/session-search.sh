#!/bin/bash
# session-search.sh - Search PopeBot job session logs
# Usage: session-search.sh <command> [args]

set -e

LOGS_DIR="/job/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_help() {
    cat << EOF
${BLUE}session-search${NC} - Search PopeBot job session logs

${GREEN}Usage:${NC}
  session-search.sh <command> [options]

${GREEN}Commands:${NC}
  list                      List all jobs with dates and sizes
  find <pattern>            Search job prompts for pattern
  search <pattern>          Search all session content for pattern
  session <job_id>          Show session info for a job
  cost <job_id>             Calculate total cost for a job
  tools <job_id>            Show tool usage breakdown for a job
  prompt <job_id>           Show the job prompt
  extract <job_id> [role]   Extract messages (role: user/assistant/all)

${GREEN}Examples:${NC}
  session-search.sh list
  session-search.sh find "email"
  session-search.sh search "send_email"
  session-search.sh session 3d29c117-bd99-4453-a8eb-9d225f7df002
  session-search.sh cost 3d29c117-bd99-4453-a8eb-9d225f7df002
  session-search.sh tools 3d29c117-bd99-4453-a8eb-9d225f7df002
  session-search.sh extract 3d29c117-bd99-4453-a8eb-9d225f7df002 assistant

EOF
}

cmd_list() {
    echo -e "${BLUE}=== Job Session Log Index ===${NC}\n"
    printf "%-12s %-8s %-10s %s\n" "DATE" "SIZE" "SESSIONS" "JOB ID"
    echo "------------------------------------------------------------"
    
    for dir in "$LOGS_DIR"/*/; do
        if [ -d "$dir" ]; then
            job_id=$(basename "$dir")
            if [ "$job_id" = ".gitkeep" ]; then
                continue
            fi
            
            # Count session files
            session_count=$(ls "$dir"/*.jsonl 2>/dev/null | wc -l)
            if [ "$session_count" -eq 0 ]; then
                continue
            fi
            
            # Get first session date
            first_log=$(ls -t "$dir"/*.jsonl 2>/dev/null | head -1)
            if [ -n "$first_log" ]; then
                date=$(head -1 "$first_log" | jq -r '.timestamp // "unknown"' | cut -dT -f1)
                size=$(du -sh "$dir" 2>/dev/null | cut -f1)
                printf "%-12s %-8s %-10s %s\n" "$date" "$size" "$session_count" "$job_id"
            fi
        fi
    done | sort -r
}

cmd_find() {
    local pattern="$1"
    if [ -z "$pattern" ]; then
        echo -e "${RED}Error: pattern required${NC}"
        echo "Usage: session-search.sh find <pattern>"
        exit 1
    fi
    
    echo -e "${BLUE}=== Searching job prompts for: ${YELLOW}$pattern${NC}\n"
    
    local found=0
    for job_file in "$LOGS_DIR"/*/job.md; do
        if [ -f "$job_file" ]; then
            if grep -qi "$pattern" "$job_file" 2>/dev/null; then
                job_id=$(echo "$job_file" | sed 's|.*/logs/||' | sed 's|/job.md||')
                echo -e "${GREEN}Found:${NC} $job_id"
                echo "  Preview: $(head -1 "$job_file" | cut -c1-80)..."
                echo ""
                found=$((found + 1))
            fi
        fi
    done
    
    if [ "$found" -eq 0 ]; then
        echo "No matches found."
    else
        echo -e "${GREEN}Total: $found job(s)${NC}"
    fi
}

cmd_search() {
    local pattern="$1"
    if [ -z "$pattern" ]; then
        echo -e "${RED}Error: pattern required${NC}"
        echo "Usage: session-search.sh search <pattern>"
        exit 1
    fi
    
    echo -e "${BLUE}=== Searching sessions for: ${YELLOW}$pattern${NC}\n"
    
    rg -i --color=always "$pattern" "$LOGS_DIR"/*/*.jsonl 2>/dev/null | head -100 || true
}

cmd_session() {
    local job_id="$1"
    if [ -z "$job_id" ]; then
        echo -e "${RED}Error: job_id required${NC}"
        echo "Usage: session-search.sh session <job_id>"
        exit 1
    fi
    
    local dir="$LOGS_DIR/$job_id"
    if [ ! -d "$dir" ]; then
        echo -e "${RED}Error: job not found: $job_id${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}=== Session Info: ${YELLOW}$job_id${NC}\n"
    
    # Show job prompt preview
    if [ -f "$dir/job.md" ]; then
        echo -e "${GREEN}Job Prompt:${NC}"
        head -5 "$dir/job.md"
        echo "..."
        echo ""
    fi
    
    # List session files
    echo -e "${GREEN}Sessions:${NC}"
    for f in "$dir"/*.jsonl; do
        if [ -f "$f" ]; then
            filename=$(basename "$f")
            size=$(du -h "$f" | cut -f1)
            lines=$(wc -l < "$f")
            first_msg=$(head -1 "$f" | jq -r '.timestamp // "unknown"')
            printf "  %-50s %8s %6s lines  %s\n" "$filename" "$size" "$lines" "$first_msg"
        fi
    done
    
    # Total size
    total_size=$(du -sh "$dir" | cut -f1)
    echo ""
    echo -e "${GREEN}Total size:${NC} $total_size"
}

cmd_cost() {
    local job_id="$1"
    if [ -z "$job_id" ]; then
        echo -e "${RED}Error: job_id required${NC}"
        echo "Usage: session-search.sh cost <job_id>"
        exit 1
    fi
    
    local dir="$LOGS_DIR/$job_id"
    if [ ! -d "$dir" ]; then
        echo -e "${RED}Error: job not found: $job_id${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}=== Cost Report: ${YELLOW}$job_id${NC}\n"
    
    # Calculate total cost
    total_cost=$(cat "$dir"/*.jsonl 2>/dev/null | jq -s '[.[] | .message.usage.cost.total // 0] | add' 2>/dev/null)
    
    if [ "$total_cost" != "null" ] && [ -n "$total_cost" ]; then
        echo -e "${GREEN}Total Cost:${NC} \$$total_cost"
    else
        echo "No cost data available (cost tracking may not be enabled)"
    fi
    
    # Breakdown by session
    echo ""
    echo -e "${GREEN}By Session:${NC}"
    for f in "$dir"/*.jsonl; do
        if [ -f "$f" ]; then
            filename=$(basename "$f")
            cost=$(cat "$f" | jq -s '[.[] | .message.usage.cost.total // 0] | add' 2>/dev/null)
            if [ "$cost" != "null" ] && [ -n "$cost" ]; then
                printf "  %-50s \$%s\n" "$filename" "$cost"
            fi
        fi
    done
}

cmd_tools() {
    local job_id="$1"
    if [ -z "$job_id" ]; then
        echo -e "${RED}Error: job_id required${NC}"
        echo "Usage: session-search.sh tools <job_id>"
        exit 1
    fi
    
    local dir="$LOGS_DIR/$job_id"
    if [ ! -d "$dir" ]; then
        echo -e "${RED}Error: job not found: $job_id${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}=== Tool Usage: ${YELLOW}$job_id${NC}\n"
    
    cat "$dir"/*.jsonl 2>/dev/null | jq -r '.message.content[]? | select(.type == "toolCall") | .name' 2>/dev/null | sort | uniq -c | sort -rn | head -20 || echo "No tool calls found"
}

cmd_prompt() {
    local job_id="$1"
    if [ -z "$job_id" ]; then
        echo -e "${RED}Error: job_id required${NC}"
        echo "Usage: session-search.sh prompt <job_id>"
        exit 1
    fi
    
    local dir="$LOGS_DIR/$job_id"
    if [ ! -d "$dir" ]; then
        echo -e "${RED}Error: job not found: $job_id${NC}"
        exit 1
    fi
    
    if [ -f "$dir/job.md" ]; then
        cat "$dir/job.md"
    else
        echo "No job.md found"
    fi
}

cmd_extract() {
    local job_id="$1"
    local role="${2:-all}"
    
    if [ -z "$job_id" ]; then
        echo -e "${RED}Error: job_id required${NC}"
        echo "Usage: session-search.sh extract <job_id> [user|assistant|all]"
        exit 1
    fi
    
    local dir="$LOGS_DIR/$job_id"
    if [ ! -d "$dir" ]; then
        echo -e "${RED}Error: job not found: $job_id${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}=== Extracting messages from: ${YELLOW}$job_id${NC}"
    echo -e "${BLUE}Role filter: ${YELLOW}$role${NC}\n"
    
    case "$role" in
        user)
            cat "$dir"/*.jsonl 2>/dev/null | jq -r 'select(.message.role == "user") | .message.content[]? | select(.type == "text") | .text' 2>/dev/null | head -100
            ;;
        assistant)
            cat "$dir"/*.jsonl 2>/dev/null | jq -r 'select(.message.role == "assistant") | .message.content[]? | select(.type == "text") | .text' 2>/dev/null | head -100
            ;;
        all|*)
            cat "$dir"/*.jsonl 2>/dev/null | jq -r 'select(.type == "message") | "[" + (.message.role // "unknown") + "] " + (.message.content[]? | select(.type == "text") | .text)' 2>/dev/null | head -100
            ;;
    esac
}

# Main command dispatcher
case "${1:-help}" in
    list)
        cmd_list
        ;;
    find)
        cmd_find "$2"
        ;;
    search)
        cmd_search "$2"
        ;;
    session)
        cmd_session "$2"
        ;;
    cost)
        cmd_cost "$2"
        ;;
    tools)
        cmd_tools "$2"
        ;;
    prompt)
        cmd_prompt "$2"
        ;;
    extract)
        cmd_extract "$2" "$3"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac
