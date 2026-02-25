#!/bin/bash
# File Watcher - Watch files and directories for changes
set -euo pipefail

# Default values
DIRECTORY=""
FILE=""
FILES=""
FILES_FROM=""
COMMAND=""
PATTERN="*"
EVENTS="create,modify,delete"
RECURSIVE=true
DEBOUNCE=0
DEBOUNCE_FILE=false
DAEMON=false
PIDFILE=""
TIMEOUT=""
QUIET=false
VERBOSE=false
OUTPUT_JSON=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Usage
usage() {
    cat << EOF
Usage: $(basename "$0") <directory> --command CMD [options]
       $(basename "$0") --file <file> --command CMD [options]

Watch files and directories for changes.

Required:
  --command CMD          Command to run on change

Watch Options:
  <directory>            Directory to watch (default: current)
  --file FILE            Watch single file
  --files "F1,F2,..."    Watch multiple files (comma-separated)
  --files-from FILE      Read file list from file
  --pattern GLOB         File pattern to match (default: *)
  --recursive            Watch subdirectories (default: true)
  --no-recursive         Don't recurse into subdirectories

Event Options:
  --events TYPES         Events to watch: create,modify,delete,move,access,attrib
                         (default: create,modify,delete)

Execution Options:
  --debounce SECS        Debounce delay in seconds (default: 0)
  --debounce-file        Debounce per file independently
  --timeout SECS         Stop after N seconds (default: forever)
  --daemon               Run in background
  --pidfile FILE         PID file for daemon mode

Output Options:
  --quiet                Suppress output
  --verbose              Show all events and commands
  --json                 Output events as JSON
  --help                 Show this help message

Examples:
  $(basename "$0") ./src --command "npm run build"
  $(basename "$0") --file config.json --command "pm2 restart app"
  $(basename "$0") ./src --command "make" --debounce 2
  $(basename "$0") ./logs --command "./process.sh" --events create
EOF
    exit 0
}

# Parse arguments
POSITIONAL_ARGS=()
while [[ $# -gt 0 ]]; do
    case $1 in
        --command)
            COMMAND="$2"
            shift 2
            ;;
        --file)
            FILE="$2"
            shift 2
            ;;
        --files)
            FILES="$2"
            shift 2
            ;;
        --files-from)
            FILES_FROM="$2"
            shift 2
            ;;
        --pattern)
            PATTERN="$2"
            shift 2
            ;;
        --events)
            EVENTS="$2"
            shift 2
            ;;
        --recursive)
            RECURSIVE=true
            shift
            ;;
        --no-recursive)
            RECURSIVE=false
            shift
            ;;
        --debounce)
            DEBOUNCE="$2"
            shift 2
            ;;
        --debounce-file)
            DEBOUNCE_FILE=true
            shift
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --daemon)
            DAEMON=true
            shift
            ;;
        --pidfile)
            PIDFILE="$2"
            shift 2
            ;;
        --quiet)
            QUIET=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --json)
            OUTPUT_JSON=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        -*)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
        *)
            POSITIONAL_ARGS+=("$1")
            shift
            ;;
    esac
done

# Restore positional args
set -- "${POSITIONAL_ARGS[@]}"

# Get directory from positional args
if [[ ${#POSITIONAL_ARGS[@]} -gt 0 ]]; then
    DIRECTORY="${POSITIONAL_ARGS[0]}"
fi

# Default to current directory if no watch target specified
if [[ -z "$DIRECTORY" && -z "$FILE" && -z "$FILES" && -z "$FILES_FROM" ]]; then
    DIRECTORY="."
fi

# Validate
if [[ -z "$COMMAND" ]]; then
    echo "Error: --command is required" >&2
    usage
fi

# Build file list
declare -a WATCH_FILES=()

if [[ -n "$FILE" ]]; then
    WATCH_FILES+=("$FILE")
fi

if [[ -n "$FILES" ]]; then
    IFS=',' read -ra FILE_ARRAY <<< "$FILES"
    WATCH_FILES+=("${FILE_ARRAY[@]}")
fi

if [[ -n "$FILES_FROM" ]]; then
    if [[ ! -f "$FILES_FROM" ]]; then
        echo "Error: Files list not found: $FILES_FROM" >&2
        exit 1
    fi
    while IFS= read -r line || [[ -n "$line" ]]; do
        [[ -n "$line" ]] && WATCH_FILES+=("$line")
    done < "$FILES_FROM"
fi

# Detect available watcher tool
detect_watcher() {
    if command -v inotifywait &>/dev/null; then
        echo "inotify"
    elif command -v fswatch &>/dev/null; then
        echo "fswatch"
    else
        echo "poll"
    fi
}

WATCHER=$(detect_watcher)

# Convert events to inotify events
convert_events() {
    local events="$1"
    local result=""
    
    IFS=',' read -ra EVENT_ARRAY <<< "$events"
    for event in "${EVENT_ARRAY[@]}"; do
        case "$event" in
            create) result="$result,CREATE" ;;
            modify) result="$result,MODIFY,ATTRIB" ;;
            delete) result="$result,DELETE,DELETE_SELF" ;;
            move) result="$result,MOVED_FROM,MOVED_TO" ;;
            access) result="$result,ACCESS" ;;
            attrib) result="$result,ATTRIB" ;;
            *) ;;
        esac
    done
    
    # Remove leading comma and deduplicate
    result=$(echo "$result" | sed 's/^,//' | tr ',' '\n' | sort -u | tr '\n' ',' | sed 's/,$//')
    echo "$result"
}

# Run command with environment variables
run_command() {
    local file="$1"
    local event="$2"
    
    export FILE="$file"
    export EVENT="$event"
    
    local output
    local exit_code
    
    if [[ "$VERBOSE" == "true" ]]; then
        echo "Running: $COMMAND"
    fi
    
    if [[ "$OUTPUT_JSON" == "true" ]]; then
        output=$(eval "$COMMAND" 2>&1) || true
        local timestamp
        timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        cat << EOF
{"event": "$event", "file": "$file", "timestamp": "$timestamp", "output": $(echo "$output" | jq -Rs .)}
EOF
    else
        if [[ "$QUIET" != "true" ]]; then
            echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ${GREEN}$event${NC} ${YELLOW}$file${NC}"
        fi
        eval "$COMMAND" || true
    fi
}

# Debounce handling
declare -A LAST_RUN_TIME

should_run() {
    local file="$1"
    local event="$2"
    local key="$file"
    
    [[ "$DEBOUNCE_FILE" != "true" ]] && key="global"
    
    local now
    now=$(date +%s)
    
    if [[ -z "${LAST_RUN_TIME[$key]:-}" ]]; then
        LAST_RUN_TIME[$key]="$now"
        return 0
    fi
    
    local last="${LAST_RUN_TIME[$key]}"
    local diff=$((now - last))
    
    if [[ $diff -ge $DEBOUNCE ]]; then
        LAST_RUN_TIME[$key]="$now"
        return 0
    fi
    
    return 1
}

# Watch using inotifywait (Linux)
watch_inotify() {
    local args=()
    args+=("-qq")  # Quiet
    args+=("-e" "$(convert_events "$EVENTS")")
    
    if [[ "$RECURSIVE" == "true" ]]; then
        args+=("-r")
    fi
    
    args+=("--format" "%w%f %e")
    
    if [[ ${#WATCH_FILES[@]} -gt 0 ]]; then
        args+=("${WATCH_FILES[@]}")
    else
        args+=("$DIRECTORY")
    fi
    
    [[ "$VERBOSE" == "true" ]] && echo "Watching with inotifywait: ${args[*]}" >&2
    
    # Process timeout if set
    if [[ -n "$TIMEOUT" ]]; then
        timeout "$TIMEOUT" inotifywait "${args[@]}" --monitor | while read -r line; do
            local file event
            read -r file event <<< "$line"
            
            # Filter by pattern
            if [[ "$file" != *"$PATTERN"* ]] && [[ "$PATTERN" != "*" ]]; then
                continue
            fi
            
            # Check debounce
            if [[ $DEBOUNCE -gt 0 ]]; then
                should_run "$file" "$event" || continue
            fi
            
            run_command "$file" "$event"
        done
    else
        inotifywait "${args[@]}" --monitor | while read -r line; do
            local file event
            read -r file event <<< "$line"
            
            # Filter by pattern
            if [[ "$file" != *"$PATTERN"* ]] && [[ "$PATTERN" != "*" ]]; then
                continue
            fi
            
            # Check debounce
            if [[ $DEBOUNCE -gt 0 ]]; then
                should_run "$file" "$event" || continue
            fi
            
            run_command "$file" "$event"
        done
    fi
}

# Watch using fswatch (macOS)
watch_fswatch() {
    local args=()
    
    # Convert events for fswatch
    IFS=',' read -ra EVENT_ARRAY <<< "$EVENTS"
    local fswatch_events=""
    for event in "${EVENT_ARRAY[@]}"; do
        case "$event" in
            create) fswatch_events="$fswatch_events,Created" ;;
            modify) fswatch_events="$fswatch_events,Updated" ;;
            delete) fswatch_events="$fswatch_events,Removed" ;;
            move) fswatch_events="$fswatch_events,Moved" ;;
            access) ;;  # Not supported by fswatch
            attrib) ;;   # Not supported by fswatch
        esac
    done
    fswatch_events=$(echo "$fswatch_events" | sed 's/^,//')
    
    if [[ -n "$fswatch_events" ]]; then
        args+=("-e" "$fswatch_events")
    fi
    
    args+=("--format" "%p %e")
    
    if [[ ${#WATCH_FILES[@]} -gt 0 ]]; then
        args+=("${WATCH_FILES[@]}")
    else
        args+=("$DIRECTORY")
    fi
    
    [[ "$VERBOSE" == "true" ]] && echo "Watching with fswatch: ${args[*]}" >&2
    
    # Run with timeout if set
    if [[ -n "$TIMEOUT" ]]; then
        timeout "$TIMEOUT" fswatch "${args[@]}" | while read -r line; do
            local file event
            read -r file event <<< "$line"
            
            # Filter by pattern
            if [[ "$file" != *"$PATTERN"* ]] && [[ "$PATTERN" != "*" ]]; then
                continue
            fi
            
            # Check debounce
            if [[ $DEBOUNCE -gt 0 ]]; then
                should_run "$file" "$event" || continue
            fi
            
            run_command "$file" "$event"
        done
    else
        fswatch "${args[@]}" | while read -r line; do
            local file event
            read -r file event <<< "$line"
            
            # Filter by pattern
            if [[ "$file" != *"$PATTERN"* ]] && [[ "$PATTERN" != "*" ]]; then
                continue
            fi
            
            # Check debounce
            if [[ $DEBOUNCE -gt 0 ]]; then
                should_run "$file" "$event" || continue
            fi
            
            run_command "$file" "$event"
        done
    fi
}

# Watch using polling (fallback)
watch_poll() {
    [[ "$VERBOSE" == "true" ]] && echo "Watching with polling (1s interval)" >&2
    
    declare -A file_mtimes
    declare -A file_exists
    
    # Initialize file states
    init_files() {
        local search_dir="${DIRECTORY:-.}"
        local search_pattern="$PATTERN"
        
        if [[ ${#WATCH_FILES[@]} -gt 0 ]]; then
            for f in "${WATCH_FILES[@]}"; do
                if [[ -f "$f" ]]; then
                    file_mtimes["$f"]=$(stat -c %Y "$f" 2>/dev/null || echo "0")
                    file_exists["$f"]=true
                fi
            done
        else
            for f in $(find "$search_dir" -name "$search_pattern" $(if [[ "$RECURSIVE" != "true" ]]; then echo "-maxdepth 1"; fi) 2>/dev/null); do
                if [[ -f "$f" ]]; then
                    file_mtimes["$f"]=$(stat -c %Y "$f" 2>/dev/null || echo "0")
                    file_exists["$f"]=true
                fi
            done
        fi
    }
    
    init_files
    
    # Poll loop
    local start_time
    start_time=$(date +%s)
    
    while true; do
        # Check timeout
        if [[ -n "$TIMEOUT" ]]; then
            local current_time
            current_time=$(date +%s)
            local elapsed=$((current_time - start_time))
            if [[ $elapsed -ge $TIMEOUT ]]; then
                break
            fi
        fi
        
        # Check all files
        for file in "${!file_mtimes[@]}"; do
            if [[ ! -f "$file" ]]; then
                # File was deleted
                if [[ "${file_exists[$file]:-false}" == "true" ]]; then
                    run_command "$file" "DELETE"
                    file_exists["$file"]=false
                fi
            else
                local current_mtime
                current_mtime=$(stat -c %Y "$file" 2>/dev/null || echo "0")
                
                if [[ "${file_exists[$file]:-false}" != "true" ]]; then
                    # File was created
                    run_command "$file" "CREATE"
                    file_exists["$file"]=true
                    file_mtimes["$file"]="$current_mtime"
                elif [[ "$current_mtime" != "${file_mtimes[$file]}" ]]; then
                    # File was modified
                    run_command "$file" "MODIFY"
                    file_mtimes["$file"]="$current_mtime"
                fi
            fi
        done
        
        # Check for new files
        if [[ ${#WATCH_FILES[@]} -eq 0 ]]; then
            local search_dir="${DIRECTORY:-.}"
            local search_pattern="$PATTERN"
            
            for f in $(find "$search_dir" -name "$search_pattern" $(if [[ "$RECURSIVE" != "true" ]]; then echo "-maxdepth 1"; fi) 2>/dev/null); do
                if [[ -f "$f" && -z "${file_mtimes[$f]:-}" ]]; then
                    run_command "$f" "CREATE"
                    file_mtimes["$f"]=$(stat -c %Y "$f" 2>/dev/null || echo "0")
                    file_exists["$f"]=true
                fi
            done
        fi
        
        sleep 1
    done
}

# Daemon mode
if [[ "$DAEMON" == "true" ]]; then
    if [[ -z "$PIDFILE" ]]; then
        PIDFILE="/tmp/watcher-$(date +%s).pid"
    fi
    
    # Fork to background
    "$0" "${POSITIONAL_ARGS[@]}" --command "$COMMAND" --no-daemon &
    local pid=$!
    echo "$pid" > "$PIDFILE"
    echo "Started watcher with PID $pid"
    exit 0
fi

# Main
case "$WATCHER" in
    inotify)
        watch_inotify
        ;;
    fswatch)
        watch_fswatch
        ;;
    poll)
        watch_poll
        ;;
    *)
        echo "Error: No watcher available" >&2
        exit 1
        ;;
esac