#!/bin/bash
# Schedule helper - manage one-time and recurring tasks

set -e

COMMAND="${1:-help}"
SUBCMD="${2:-}"

# Check for required commands
check_commands() {
    local missing=()
    
    if ! command -v at &> /dev/null; then
        missing+=("at")
    fi
    
    if ! command -v cron &> /dev/null && ! command -v crond &> /dev/null; then
        missing+=("cron")
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        echo "Warning: Missing commands: ${missing[*]}" >&2
        echo "Install with: apt install at cron" >&2
    fi
}

# Schedule at a specific time
schedule_at() {
    local time="$1"
    local cmd="$2"
    
    if [ -z "$time" ] || [ -z "$cmd" ]; then
        echo "Usage: $0 at <time> <command>"
        echo "  time: '14:30', 'tomorrow 10:00', '2026-03-01 09:00'"
        exit 1
    fi
    
    echo "$cmd" | at "$time" 2>/dev/null || \
    at "$time" <<< "$cmd"
    
    echo "Scheduled: $cmd at $time"
}

# Schedule after a delay
schedule_in() {
    local delay="$1"
    local cmd="$2"
    
    if [ -z "$delay" ] || [ -z "$cmd" ]; then
        echo "Usage: $0 in <delay> <command>"
        echo "  delay: '30 minutes', '2 hours', '1 day'"
        exit 1
    fi
    
    # Convert delay to at format
    case "$delay" in
        *minute*|*min*)
            mins=$(echo "$delay" | grep -oE '[0-9]+')
            at "now + $mins minutes" <<< "$cmd"
            ;;
        *hour*|*hr*)
            hours=$(echo "$delay" | grep -oE '[0-9]+')
            at "now + $hours hours" <<< "$cmd"
            ;;
        *day*)
            days=$(echo "$delay" | grep -oE '[0-9]+')
            at "now + $days days" <<< "$cmd"
            ;;
        *)
            echo "Unknown delay format. Use: '30 minutes', '2 hours', '1 day'"
            exit 1
            ;;
    esac
    
    echo "Scheduled: $cmd in $delay"
}

# Schedule recurring (cron)
schedule_cron() {
    local cron_expr="$1"
    local cmd="$2"
    
    if [ -z "$cron_expr" ] || [ -z "$cmd" ]; then
        echo "Usage: $0 cron <cron-expression> <command>"
        echo "  Example: $0 cron '0 * * * *' './script.sh'"
        exit 1
    fi
    
    # Add to crontab
    (crontab -l 2>/dev/null || true; echo "$cron_expr $cmd") | crontab -
    
    echo "Scheduled: $cmd ($cron_expr)"
}

# List scheduled jobs
list_jobs() {
    echo "=== One-time jobs (at) ==="
    atq 2>/dev/null || echo "No at jobs"
    echo ""
    echo "=== Recurring jobs (cron) ==="
    crontab -l 2>/dev/null || echo "No cron jobs"
}

# Cancel a job
cancel_job() {
    local job_id="$1"
    
    if [ -z "$job_id" ]; then
        echo "Usage: $0 cancel <job-id>"
        atq
        exit 1
    fi
    
    atrm "$job_id" 2>/dev/null && echo "Removed job $job_id" || \
    echo "Could not remove job $job_id"
}

# Check permissions
check_perms() {
    echo "=== Permission Check ==="
    
    if command -v at &> /dev/null; then
        echo "✓ at command available"
    else
        echo "✗ at command not found"
    fi
    
    if [ -f /etc/at.allow ]; then
        if grep -q "$(whoami)" /etc/at.allow; then
            echo "✓ User allowed in /etc/at.allow"
        else
            echo "✗ User not in /etc/at.allow"
        fi
    elif [ -f /etc/at.deny ]; then
        if ! grep -q "^$(whoami)$" /etc/at.deny 2>/dev/null; then
            echo "✓ User not in /etc/at.deny (allowed)"
        else
            echo "✗ User in /etc/at.deny (denied)"
        fi
    fi
    
    if command -v crond &> /dev/null || pgrep -x cron > /dev/null; then
        echo "✓ cron daemon running"
    else
        echo "⚠ cron daemon may not be running"
    fi
}

# Show help
show_help() {
    echo "Schedule - Task Scheduling Helper"
    echo "================================="
    echo ""
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "One-time scheduling:"
    echo "  $0 at <time> <command>      Schedule at specific time"
    echo "  $0 in <delay> <command>     Schedule after delay"
    echo "  $0 cancel <job-id>          Cancel a scheduled job"
    echo ""
    echo "Recurring scheduling:"
    echo "  $0 cron <expr> <command>   Schedule cron job"
    echo ""
    echo "Management:"
    echo "  $0 list                     List all scheduled jobs"
    echo "  $0 check                    Check permissions"
    echo ""
    echo "Examples:"
    echo "  $0 at '14:30' './backup.sh'"
    echo "  $0 in '30 minutes' 'notify-send done'"
    echo "  $0 cron '0 * * * *' './hourly-task.sh'"
    echo ""
    echo "Time formats:"
    echo "  '14:30' - today at 14:30"
    echo "  'tomorrow 10:00' - tomorrow at 10am"
    echo "  '2026-03-01 09:00' - specific date"
    echo "  'now + 30 minutes' - in 30 minutes"
}

# Main
case "$COMMAND" in
    at)
        schedule_at "$2" "$3"
        ;;
    in)
        schedule_in "$2" "$3"
        ;;
    cron)
        schedule_cron "$2" "$3"
        ;;
    list)
        list_jobs
        ;;
    cancel|remove|rm)
        cancel_job "$2"
        ;;
    check|check-perms)
        check_perms
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
