#!/bin/bash
# System Diagnostics for PopeBot

set -e

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running as root for some checks
IS_ROOT=$( [ "$(id -u)" = "0" ] && echo "yes" || echo "no" )

COMMAND="${1:-summary}"
shift || true

print_header() {
    echo ""
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_ok() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_crit() {
    echo -e "${RED}✗ $1${NC}"
}

cmd_summary() {
    print_header "System Summary"
    
    echo "Hostname: $(hostname)"
    echo "Uptime: $(uptime -p 2>/dev/null || uptime)"
    echo "OS: $(uname -s) $(uname -r)"
    
    print_header "CPU Load"
    cmd_cpu
    
    print_header "Memory"
    cmd_memory
    
    print_header "Disk"
    cmd_disk
    
    print_header "Network"
    cmd_network
}

cmd_cpu() {
    if [ "$(uname)" = "Darwin" ]; then
        top -l 1 -n 0 | grep "CPU usage" || echo "CPU: $(sysctl -n hw.ncpu) cores"
    else
        local load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ',')
        echo "Load: $load"
        top -bn1 | head -5 | tail -1
    fi
}

cmd_memory() {
    if [ "$(uname)" = "Darwin" ]; then
        vm_stat | head -10
    else
        free -h
    fi
}

cmd_disk() {
    if [ "$(uname)" = "Darwin" ]; then
        df -h | grep -E "^/dev|^Filesystem"
    else
        df -h | grep -E "^/dev|^Filesystem"
    fi
}

cmd_network() {
    if [ "$(uname)" = "Darwin" ]; then
        ifconfig | grep -E "^en|status:" | head -10
    else
        ip -brief addr | head -10
        echo ""
        netstat -tn 2>/dev/null | tail -5 || ss -tn | tail -5
    fi
}

cmd_services() {
    print_header "Services Status"
    
    if [ "$(uname)" = "Darwin" ]; then
        launchctl list | head -20
    else
        echo "Failed services:"
        systemctl --failed --no-pager 2>/dev/null | head -20 || echo "systemctl not available"
        echo ""
        echo "Active services:"
        systemctl list-units --type=service --state=running | head -20
    fi
}

cmd_docker() {
    print_header "Docker Status"
    
    if ! command -v docker &> /dev/null; then
        print_warn "Docker not installed"
        return
    fi
    
    echo "Running containers:"
    docker ps 2>/dev/null || echo "Cannot connect to Docker daemon"
    
    echo ""
    echo "Docker resource usage:"
    docker stats --no-stream 2>/dev/null | head -10 || echo "Cannot get stats"
}

cmd_logs() {
    print_header "Recent System Logs"
    
    if [ "$(uname)" = "Darwin" ]; then
        log show --predicate 'eventMessage contains "error"' --last 5m 2>/dev/null | tail -20 || \
            echo "Run: log show --predicate 'eventMessage contains \"error\"' --last 5m"
    else
        echo "Recent errors (journalctl):"
        journalctl -p err -n 10 --no-pager 2>/dev/null || echo "journalctl not available"
        echo ""
        echo "Recent SSH failures:"
        grep "Failed password" /var/log/auth.log 2>/dev/null | tail -5 || echo "No auth.log access"
    fi
}

cmd_security() {
    print_header "Security Check"
    
    echo "Current user: $(whoami)"
    
    if [ "$(uname)" = "Linux" ]; then
        echo ""
        echo "Failed SSH logins:"
        grep "Failed password" /var/log/auth.log 2>/dev/null | tail -5 || echo "No access"
        
        echo ""
        echo "Open ports:"
        ss -tuln 2>/dev/null | head -10 || netstat -tuln 2>/dev/null | head -10 || echo "Cannot list ports"
    fi
}

cmd_all() {
    cmd_summary
    cmd_services
    cmd_docker
    cmd_logs
    cmd_security
}

show_help() {
    cat << EOF
System Diagnostics for PopeBot

Usage: $0 <command>

Commands:
  summary     Quick system summary (default)
  cpu         CPU and load information
  memory      Memory usage
  disk        Disk usage
  network     Network status
  services    Service status
  docker      Docker status
  logs        Recent system logs
  security    Security check
  all         All diagnostic checks

Examples:
  $0              # Summary
  $0 cpu          # CPU check
  $0 all          # Full diagnostic

EOF
}

# Main
case "$COMMAND" in
    -h|--help)
        show_help
        ;;
    summary)
        cmd_summary
        ;;
    cpu)
        cmd_cpu
        ;;
    memory)
        cmd_memory
        ;;
    disk)
        cmd_disk
        ;;
    network)
        cmd_network
        ;;
    services)
        cmd_services
        ;;
    docker)
        cmd_docker
        ;;
    logs)
        cmd_logs
        ;;
    security)
        cmd_security
        ;;
    all)
        cmd_all
        ;;
    *)
        cmd_summary
        ;;
esac
