#!/bin/bash
# Tmux session management helper
# Usage: ./tmux-helper.sh <command> [options] [--json]

# Colors for output (disabled when --json is passed)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

JSON_OUTPUT=false
for arg in "$@"; do
    if [ "$arg" = "--json" ]; then
        JSON_OUTPUT=true
        break
    fi
done

log_json() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "$1"
    fi
}

log_error() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "{\"error\": \"$1\"}"
    else
        echo -e "${RED}Error: $1${NC}"
    fi
}

log_success() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "{\"success\": true, \"message\": \"$1\"}"
    else
        echo -e "${GREEN}$1${NC}"
    fi
}

usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  list, ls              List all tmux sessions"
    echo "  create <name> [cmd]  Create a new session (optional: with command)"
    echo "  attach <name>        Attach to a session"
    echo "  detach <name>        Detach from a session"
    echo "  kill <name>          Kill a session"
    echo "  rename <old> <new>  Rename a session"
    echo "  send <name> <cmd>    Send command to session"
    echo "  capture <name>      Capture session output"
    echo "  windows <name>       List windows in session"
    echo "  new-window <name> [cmd] Create new window in session"
    echo ""
    exit 1
}

list_sessions() {
    echo -e "${GREEN}Active Tmux Sessions:${NC}"
    tmux ls 2>/dev/null || echo "No active sessions"
}

create_session() {
    local name="$1"
    local cmd="$2"
    
    if [ -z "$name" ]; then
        echo -e "${RED}Error: Session name required${NC}"
        exit 1
    fi
    
    # Check if session already exists
    if tmux has-session -t "$name" 2>/dev/null; then
        echo -e "${YELLOW}Session '$name' already exists${NC}"
        return 1
    fi
    
    if [ -n "$cmd" ]; then
        tmux new-session -d -s "$name" "$cmd"
        echo -e "${GREEN}Created session '$name' with command: $cmd${NC}"
    else
        tmux new-session -d -s "$name"
        echo -e "${GREEN}Created session '$name'${NC}"
    fi
}

attach_session() {
    local name="$1"
    
    if [ -z "$name" ]; then
        echo -e "${RED}Error: Session name required${NC}"
        exit 1
    fi
    
    if ! tmux has-session -t "$name" 2>/dev/null; then
        echo -e "${RED}Error: Session '$name' does not exist${NC}"
        exit 1
    fi
    
    tmux attach -t "$name"
}

detach_session() {
    local name="$1"
    
    if [ -z "$name" ]; then
        echo -e "${RED}Error: Session name required${NC}"
        exit 1
    fi
    
    tmux detach-client -t "$name" 2>/dev/null || \
        tmux send-keys -t "$name" C-d
    echo -e "${GREEN}Detached from session '$name'${NC}"
}

kill_session() {
    local name="$1"
    
    if [ -z "$name" ]; then
        echo -e "${RED}Error: Session name required${NC}"
        exit 1
    fi
    
    tmux kill-session -t "$name" 2>/dev/null
    echo -e "${GREEN}Killed session '$name'${NC}"
}

rename_session() {
    local old_name="$1"
    local new_name="$2"
    
    if [ -z "$old_name" ] || [ -z "$new_name" ]; then
        echo -e "${RED}Error: Both old and new names required${NC}"
        exit 1
    fi
    
    tmux rename-session -t "$old_name" "$new_name"
    echo -e "${GREEN}Renamed session '$old_name' to '$new_name'${NC}"
}

send_command() {
    local name="$1"
    shift
    local cmd="$*"
    
    if [ -z "$name" ] || [ -z "$cmd" ]; then
        echo -e "${RED}Error: Session name and command required${NC}"
        exit 1
    fi
    
    tmux send-keys -t "$name" "$cmd" C-m
    echo -e "${GREEN}Sent command to session '$name': $cmd${NC}"
    # Small delay to allow command to execute
    sleep 0.5
}

capture_output() {
    local name="$1"
    local start_lines="${2:--50}"
    
    if [ -z "$name" ]; then
        echo -e "${RED}Error: Session name required${NC}"
        exit 1
    fi
    
    tmux capture-pane -t "$name" -p -S "$start_lines"
}

list_windows() {
    local name="$1"
    
    if [ -z "$name" ]; then
        echo -e "${RED}Error: Session name required${NC}"
        exit 1
    fi
    
    tmux list-windows -t "$name"
}

create_window() {
    local session="$1"
    local cmd="$2"
    
    if [ -z "$session" ]; then
        echo -e "${RED}Error: Session name required${NC}"
        exit 1
    fi
    
    if [ -n "$cmd" ]; then
        tmux new-window -t "$session" "$cmd"
    else
        tmux new-window -t "$session"
    fi
    echo -e "${GREEN}Created new window in session '$session'${NC}"
}

# Main command dispatcher
case "$1" in
    list|ls)
        list_sessions
        ;;
    create)
        create_session "$2" "$3"
        ;;
    attach)
        attach_session "$2"
        ;;
    detach)
        detach_session "$2"
        ;;
    kill)
        kill_session "$2"
        ;;
    rename)
        rename_session "$2" "$3"
        ;;
    send)
        shift
        name="$1"
        shift
        send_command "$name" "$@"
        ;;
    capture)
        capture_output "$2" "$3"
        ;;
    windows)
        list_windows "$2"
        ;;
    new-window)
        create_window "$2" "$3"
        ;;
    *)
        usage
        ;;
esac
