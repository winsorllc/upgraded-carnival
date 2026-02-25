#!/bin/bash
# Retry Utils - Smart retry logic with exponential backoff
set -euo pipefail

# Default values
COMMAND=""
MAX_RETRIES=3
BACKOFF_TYPE="none"
BASE_DELAY=1
MAX_DELAY=60
JITTER_TYPE="none"
JITTER_PERCENT=20
DELAYS=""
ERROR_PATTERN=""
EXIT_CODES=""
UNTIL_PATTERN=""
STOP_ON=""
TIMEOUT=""
NO_EXIT_ON_FAILURE=false
QUIET=false
VERBOSE=false

# Usage
usage() {
    cat << EOF
Usage: $(basename "$0") --command "command" [options]

Execute commands with intelligent retry logic.

Required:
  --command CMD          Command to execute

Retry Options:
  --max-retries N        Maximum retry attempts (default: 3)
  --backoff TYPE         Backoff type: none, linear, exponential (default: none)
  --base-delay SECS     Initial delay in seconds (default: 1)
  --max-delay SECS       Maximum delay cap (default: 60)
  --delays "N,N,..."     Custom delay sequence (overrides backoff)

Jitter Options:
  --jitter TYPE          Jitter type: none, full, equal, decorrelated (default: none)
  --jitter-percent N     Jitter percentage 0-100 (default: 20)

Match Options:
  --error-pattern REGEX  Only retry when stderr matches pattern
  --exit-codes "N,..."   Only retry on specific exit codes (e.g., "1,7,28")
  --until-pattern REGEX  Keep trying until output matches pattern
  --stop-on REGEX        Stop when output matches pattern (inverse)

Other Options:
  --timeout SECS         Maximum total time in seconds
  --no-exit-on-failure   Return last output without exiting
  --quiet                Suppress command output on retries
  --verbose              Show retry attempts
  --help                 Show this help message

Examples:
  $(basename "$0") --command "curl http://api.example.com" --max-retries 5
  $(basename "$0") --command "npm install" --backoff exponential --base-delay 2
  $(basename "$0") --command "curl http://api" --until-pattern "ok" --max-retries 30
  $(basename "$0") --command "npm install" --delays "1,2,5,10,30"
EOF
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --command)
            COMMAND="$2"
            shift 2
            ;;
        --max-retries)
            MAX_RETRIES="$2"
            shift 2
            ;;
        --backoff)
            BACKOFF_TYPE="$2"
            shift 2
            ;;
        --base-delay)
            BASE_DELAY="$2"
            shift 2
            ;;
        --max-delay)
            MAX_DELAY="$2"
            shift 2
            ;;
        --delays)
            DELAYS="$2"
            shift 2
            ;;
        --jitter)
            JITTER_TYPE="$2"
            shift 2
            ;;
        --jitter-percent)
            JITTER_PERCENT="$2"
            shift 2
            ;;
        --error-pattern)
            ERROR_PATTERN="$2"
            shift 2
            ;;
        --exit-codes)
            EXIT_CODES="$2"
            shift 2
            ;;
        --until-pattern)
            UNTIL_PATTERN="$2"
            shift 2
            ;;
        --stop-on)
            STOP_ON="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --no-exit-on-failure)
            NO_EXIT_ON_FAILURE=true
            shift
            ;;
        --quiet)
            QUIET=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
    esac
done

# Validate
if [[ -z "$COMMAND" ]]; then
    echo "Error: --command is required" >&2
    usage
fi

# Calculate delay for a given attempt
calculate_delay() {
    local attempt="$1"
    local delay=0
    
    if [[ -n "$DELAYS" ]]; then
        # Use custom delays
        IFS=',' read -ra DELAY_ARRAY <<< "$DELAYS"
        local idx=$((attempt - 1))
        if [[ $idx -lt ${#DELAY_ARRAY[@]} ]]; then
            delay="${DELAY_ARRAY[$idx]}"
        else
            # Use last delay for remaining attempts
            delay="${DELAY_ARRAY[-1]}"
        fi
    else
        case "$BACKOFF_TYPE" in
            none)
                delay=0
                ;;
            linear)
                delay="$BASE_DELAY"
                ;;
            exponential)
                delay=$(echo "$BASE_DELAY * (2 ^ ($attempt - 1))" | bc -l 2>/dev/null || echo "$BASE_DELAY")
                delay=${delay%.*}  # Floor to integer
                ;;
            *)
                echo "Error: Unknown backoff type: $BACKOFF_TYPE" >&2
                exit 1
                ;;
        esac
    fi
    
    # Cap at max delay
    if [[ "$delay" -gt "$MAX_DELAY" ]]; then
        delay="$MAX_DELAY"
    fi
    
    echo "$delay"
}

# Apply jitter to delay
apply_jitter() {
    local delay="$1"
    local result="$delay"
    
    if [[ "$delay" -eq 0 ]]; then
        echo 0
        return
    fi
    
    case "$JITTER_TYPE" in
        none)
            result="$delay"
            ;;
        full)
            # Random from 0 to delay
            result=$((RANDOM % (delay + 1)))
            ;;
        equal)
            # Random from delay/2 to delay
            local half=$((delay / 2))
            result=$((half + RANDOM % (delay - half + 1)))
            ;;
        decorrelated)
            # AWS-style decorrelated: min(max_delay, random * base_delay)
            result=$(echo "min($MAX_DELAY, $delay + ($RANDOM % ${delay}))" | bc -l 2>/dev/null || echo "$delay")
            ;;
        *)
            result="$delay"
            ;;
    esac
    
    echo "$result"
}

# Check if we should retry based on exit code
should_retry_exit_code() {
    local exit_code="$1"
    
    if [[ -z "$EXIT_CODES" ]]; then
        # Retry all non-zero exit codes
        [[ "$exit_code" -ne 0 ]]
    else
        # Only retry specific exit codes
        IFS=',' read -ra CODES <<< "$EXIT_CODES"
        for code in "${CODES[@]}"; do
            if [[ "$code" == "$exit_code" ]]; then
                return 0
            fi
        done
        return 1
    fi
}

# Check if we should retry based on error pattern
should_retry_error() {
    local stderr="$1"
    
    if [[ -z "$ERROR_PATTERN" ]]; then
        return 0
    fi
    
    if echo "$stderr" | grep -qE "$ERROR_PATTERN"; then
        return 0
    else
        return 1
    fi
}

# Check if condition is met
check_condition() {
    local output="$1"
    local pattern="$2"
    
    if [[ -z "$pattern" ]]; then
        return 1
    fi
    
    if echo "$output" | grep -qE "$pattern"; then
        return 0
    else
        return 1
    fi
}

# Main retry logic
main() {
    local attempt=1
    local start_time
    start_time=$(date +%s)
    local last_stdout=""
    local last_stderr=""
    local last_exit_code=0
    
    while true; do
        # Check timeout
        if [[ -n "$TIMEOUT" ]]; then
            local current_time
            current_time=$(date +%s)
            local elapsed=$((current_time - start_time))
            if [[ "$elapsed" -ge "$TIMEOUT" ]]; then
                echo "❌ Timeout reached after ${TIMEOUT}s" >&2
                echo "Last stderr: $last_stderr" >&2
                [[ "$NO_EXIT_ON_FAILURE" == "true" ]] && echo "$last_stdout" && exit 0 || exit 1
            fi
        fi
        
        # Run command
        local tmp_stdout tmp_stderr
        tmp_stdout=$(mktemp)
        tmp_stderr=$(mktemp)
        
        if [[ "$VERBOSE" == "true" ]]; then
            echo "Attempt $attempt/$MAX_RETRIES..." >&2
        fi
        
        # Execute command
        set +e
        $COMMAND > "$tmp_stdout" 2> "$tmp_stderr"
        last_exit_code=$?
        set -e
        
        last_stdout=$(cat "$tmp_stdout")
        last_stderr=$(cat "$tmp_stderr")
        rm -f "$tmp_stdout" "$tmp_stderr"
        
        # Check until-pattern and stop-on
        if [[ -n "$UNTIL_PATTERN" ]]; then
            if check_condition "$last_stdout $last_stderr" "$UNTIL_PATTERN"; then
                [[ "$QUIET" == "true" ]] || echo "$last_stdout"
                exit 0
            fi
            # Continue trying
        fi
        
        if [[ -n "$STOP_ON" ]]; then
            if check_condition "$last_stdout $last_stderr" "$STOP_ON"; then
                echo "$last_stdout"
                exit 0
            fi
        fi
        
        # Check for success
        if [[ "$last_exit_code" -eq 0 ]]; then
            if [[ -z "$UNTIL_PATTERN" && -z "$STOP_ON" ]]; then
                [[ "$QUIET" == "true" ]] || echo "$last_stdout"
                exit 0
            fi
            # Has condition but not met, continue
        fi
        
        # Check if we should stop on specific exit codes
        if ! should_retry_exit_code "$last_exit_code"; then
            echo "$last_stdout"
            exit "$last_exit_code"
        fi
        
        # Check if we should retry based on error pattern
        if ! should_retry_error "$last_stderr"; then
            echo "$last_stdout"
            exit "$last_exit_code"
        fi
        
        # Check max retries
        if [[ "$attempt" -ge "$MAX_RETRIES" ]]; then
            echo "❌ Command failed after $attempt attempts: $COMMAND" >&2
            echo "Last exit code: $last_exit_code" >&2
            [[ -n "$last_stderr" ]] && echo "Last stderr: $last_stderr" >&2
            
            if [[ "$NO_EXIT_ON_FAILURE" == "true" ]]; then
                echo "$last_stdout"
                exit 0
            else
                exit 1
            fi
        fi
        
        # Calculate and apply delay
        local delay
        delay=$(calculate_delay "$attempt")
        delay=$(apply_jitter "$delay")
        
        if [[ "$delay" -gt 0 ]]; then
            [[ "$VERBOSE" == "true" ]] && echo "Waiting ${delay}s before retry..." >&2
            sleep "$delay"
        fi
        
        ((attempt++))
    done
}

main