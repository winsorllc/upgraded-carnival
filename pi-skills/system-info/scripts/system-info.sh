#!/bin/bash
# System info - comprehensive diagnostics

set -e

COMMAND="${1:-help}"
FORMAT="text"
OUTPUT_FILE=""
LINES=50
PATTERN=""
SORT_BY="cpu"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --full)
            COMMAND="diagnose"
            shift
            ;;
        --output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        --lines)
            LINES="$2"
            shift 2
            ;;
        --pattern)
            PATTERN="$2"
            shift 2
            ;;
        --sort)
            SORT_BY="$2"
            shift 2
            ;;
        -*)
            shift
            ;;
        *)
            COMMAND="$1"
            shift
            ;;
    esac
done

# Output function
output() {
    if [ -n "$OUTPUT_FILE" ]; then
        echo "$1" >> "$OUTPUT_FILE"
    fi
    echo "$1"
}

# Resource check
check_resources() {
    output "=== Resources ==="
    
    # CPU info
    if command -v nproc &> /dev/null; then
        output "CPU cores: $(nproc)"
    fi
    
    if [ -f /proc/loadavg ]; then
        output "Load average: $(cat /proc/loadavg)"
    fi
    
    # Memory
    if command -v free &> /dev/null; then
        output ""
        output "Memory:"
        free -h | tail -n +2 | while read line; do
            output "  $line"
        done
    fi
    
    # Top CPU/Memory processes
    output ""
    output "Top processes by CPU:"
    ps aux --sort=-%cpu | head -6 | tail -n +2 | while read line; do
        output "  $(echo "$line" | awk '{print $2, $3"% CPU", $4"% MEM", $11}' | cut -c1-60)"
    done
    
    output ""
    output "Top processes by Memory:"
    ps aux --sort=-%mem | head -6 | tail -n +2 | while read line; do
        output "  $(echo "$line" | awk '{print $2, $4"% MEM", $3"% CPU", $11}' | cut -c1-60)"
    done
}

# Disk check
check_disk() {
    output ""
    output "=== Disk Usage ==="
    
    if command -v df &> /dev/null; then
        df -h 2>/dev/null | tail -n +2 | while read line; do
            output "  $line"
        done
    fi
    
    # Inode check
    output ""
    output "Inode usage:"
    df -i 2>/dev/null | tail -n +2 | while read line; do
        output "  $line"
    done
}

# Network check
check_network() {
    output ""
    output "=== Network ==="
    
    # Interfaces
    if command -v ip &> /dev/null; then
        output "Interfaces:"
        ip -br addr show 2>/dev/null | while read line; do
            output "  $line"
        done
    fi
    
    # Routes
    output ""
    output "Default gateway:"
    ip route show default 2>/dev/null | while read line; do
        output "  $line"
    done
    
    # DNS
    if [ -f /etc/resolv.conf ]; then
        output ""
        output "DNS servers:"
        cat /etc/resolv.conf 2>/dev/null | grep nameserver | while read line; do
            output "  $line"
        done
    fi
    
    # Connectivity
    output ""
    output "Connectivity:"
    if ping -c 1 8.8.8.8 &> /dev/null; then
        output "  ✓ Internet connection OK"
    else
        output "  ✗ Internet connection FAILED"
    fi
    
    if ping -c 1 google.com &> /dev/null; then
        output "  ✓ DNS resolution OK"
    else
        output "  ✗ DNS resolution FAILED"
    fi
}

# Process check
check_processes() {
    output ""
    output "=== Processes ==="
    
    output "Total processes: $(ps aux | wc -l)"
    output "Running: $(ps -R | wc -l)"
    output "Sleeping: $(ps -S | wc -l)"
    
    # Zombie processes
    zombies=$(ps aux | awk '$8 == "Z" {count++} END {print count+0}')
    if [ "$zombies" -gt 0 ]; then
        output "Zombie processes: $zombies"
    else
        output "No zombie processes"
    fi
    
    # Top consumers
    output ""
    output "Top 5 CPU consumers:"
    ps aux --sort=-%cpu | head -6 | tail -n +2 | while read line; do
        user=$(echo "$line" | awk '{print $1}')
        pid=$(echo "$line" | awk '{print $2}')
        cpu=$(echo "$line" | awk '{print $3}')
        cmd=$(echo "$line" | awk '{print $11}')
        output "  $pid $user ${cpu}% $cmd"
    done
    
    output ""
    output "Top 5 Memory consumers:"
    ps aux --sort=-%mem | head -6 | tail -n +2 | while read line; do
        user=$(echo "$line" | awk '{print $1}')
        pid=$(echo "$line" | awk '{print $2}')
        mem=$(echo "$line" | awk '{print $4}')
        cmd=$(echo "$line" | awk '{print $11}')
        output "  $pid $user ${mem}% $cmd"
    done
}

# Log check
check_logs() {
    output ""
    output "=== Recent Logs ==="
    
    # System messages
    if [ -f /var/log/syslog ]; then
        output "Recent syslog:"
        tail -n "$LINES" /var/log/syslog 2>/dev/null | while read line; do
            if [ -n "$PATTERN" ]; then
                if echo "$line" | grep -q "$PATTERN"; then
                    output "  $line"
                fi
            else
                output "  $line"
            fi
        done
    elif [ -f /var/log/messages ]; then
        output "Recent messages:"
        tail -n "$LINES" /var/log/messages 2>/dev/null | while read line; do
            if [ -n "$PATTERN" ]; then
                if echo "$line" | grep -q "$PATTERN"; then
                    output "  $line"
                fi
            else
                output "  $line"
            fi
        done
    fi
}

# Security check
check_security() {
    output ""
    output "=== Security ==="
    
    # Failed logins
    if command -v lastb &> /dev/null; then
        output "Recent failed logins:"
        lastb -n 5 2>/dev/null | while read line; do
            output "  $line"
        done
    fi
    
    # Open ports
    output ""
    output "Open ports:"
    if command -v ss &> /dev/null; then
        ss -tuln 2>/dev/null | head -10 | while read line; do
            output "  $line"
        done
    elif command -v netstat &> /dev/null; then
        netstat -tuln 2>/dev/null | head -10 | while read line; do
            output "  $line"
        done
    fi
}

# Full diagnose
diagnose() {
    output "=== System Diagnostics - $(date) ==="
    
    check_resources
    check_disk
    check_network
    check_processes
    check_logs
    
    output ""
    output "=== Recommendations ==="
    
    # Check for warnings
    mem_usage=$(free | tail -1 | awk '{print int($3/$2 * 100)}')
    disk_usage=$(df / | tail -1 | awk '{print int($5)}')
    
    if [ "$mem_usage" -gt 80 ]; then
        output "- High memory usage (${mem_usage}%) - consider closing applications"
    fi
    
    if [ "$disk_usage" -gt 80 ]; then
        output "- High disk usage (${disk_usage}%) - consider cleaning up disk"
    fi
    
    load=$(cat /proc/loadavg | awk '{print int($1)}')
    cores=$(nproc 2>/dev/null || echo 4)
    if [ "$load" -gt "$cores" ]; then
        output "- High system load ($load) - system may be overloaded"
    fi
    
    output ""
    output "=== Diagnostics Complete ==="
}

# Main
case "$COMMAND" in
    diagnose)
        diagnose
        ;;
    resources|cpu|memory)
        check_resources
        ;;
    disk|storage)
        check_disk
        ;;
    network|net)
        check_network
        ;;
    processes|procs)
        check_processes
        ;;
    logs)
        check_logs
        ;;
    security|sec)
        check_security
        ;;
    help|--help|-h|"")
        echo "System Info - Diagnostics"
        echo "======================="
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  diagnose      Run full system diagnostics"
        echo "  resources     Check CPU and memory"
        echo "  disk          Check disk usage"
        echo "  network       Check network status"
        echo "  processes     List top processes"
        echo "  logs          Show system logs"
        echo "  security      Security check"
        echo ""
        echo "Options:"
        echo "  --full              Run all checks"
        echo "  --output <file>     Save to file"
        echo "  --format text|json  Output format"
        echo "  --lines <n>         Log lines to show"
        echo "  --pattern <regex>   Filter logs"
        ;;
    *)
        diagnose
        ;;
esac
