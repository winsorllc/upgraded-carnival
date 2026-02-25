#!/bin/bash
# Diagnostic Runner - System health and configuration checker
# Inspired by ZeroClaw/OpenClaw 'doctor' command

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default options
FORMAT="${FORMAT:-text}"
QUICK_MODE=false
CATEGORIES=()

# Colors for text output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            QUICK_MODE=true
            shift
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        --category)
            CATEGORIES+=("$2")
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --quick              Run essential checks only"
            echo "  --format FORMAT       Output format: text, json, markdown (default: text)"
            echo "  --category CAT       Run specific category (can be repeated)"
            echo ""
            echo "Categories: environment, dependencies, permissions, network, config, storage"
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
    esac
done

# If no categories specified, run all
if [[ ${#CATEGORIES[@]} -eq 0 ]]; then
    CATEGORIES=(environment dependencies permissions network config storage)
fi

# Results array
declare -a RESULTS
PASSED=0
WARNINGS=0
FAILED=0
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Helper functions
check_command() {
    local cmd="$1"
    local required="${2:-false}"
    local version_flag="${3:---version}"
    
    if command -v "$cmd" &> /dev/null; then
        local version
        version=$("$cmd" "$version_flag" 2>&1 | head -1) || version="installed"
        echo "pass|$cmd available: $version"
    else
        if [[ "$required" == "true" ]]; then
            echo "fail|$cmd not found (required)"
        else
            echo "warn|$cmd not found (optional)"
        fi
    fi
}

check_env_var() {
    local var="$1"
    local required="${2:-false}"
    
    if [[ -n "${!var:-}" ]]; then
        echo "pass|$var is set"
    else
        if [[ "$required" == "true" ]]; then
            echo "fail|$var not set (required)"
        else
            echo "warn|$var not set (optional)"
        fi
    fi
}

check_file_perms() {
    local path="$1"
    local perm_type="$2"  # read, write, execute
    
    if [[ ! -e "$path" ]]; then
        echo "warn|$path does not exist"
        return
    fi
    
    case "$perm_type" in
        read)
            if [[ -r "$path" ]]; then
                echo "pass|$path is readable"
            else
                echo "fail|$path is not readable"
            fi
            ;;
        write)
            if [[ -w "$path" ]]; then
                echo "pass|$path is writable"
            else
                echo "fail|$path is not writable"
            fi
            ;;
        execute)
            if [[ -x "$path" ]]; then
                echo "pass|$path is executable"
            else
                echo "fail|$path is not executable"
            fi
            ;;
    esac
}

# Category check functions
check_environment() {
    local checks=()
    
    # Node.js
    checks+=("$(check_command node true)")
    checks+=("$(check_command npm true)")
    
    # Python
    checks+=("$(check_command python3 false)")
    checks+=("$(check_command pip3 false)")
    
    # Shell
    checks+=("pass|Shell: ${SHELL:-unknown}")
    checks+=("pass|User: $(whoami)")
    checks+=("pass|Home: ${HOME:-unknown}")
    
    # PATH
    checks+=("pass|PATH entries: $(echo $PATH | tr ':' '\n' | wc -l)")
    
    # Common env vars
    checks+=("$(check_env_var HOME true)")
    checks+=("$(check_env_var PATH true)")
    checks+=("$(check_env_var USER false || check_env_var LOGNAME false || echo 'warn|USER not set')")
    
    # TZ
    if [[ -n "${TZ:-}" ]]; then
        checks+=("pass|Timezone: $TZ")
    else
        checks+=("pass|Timezone: $(date +%Z 2>/dev/null || echo 'unknown')")
    fi
    
    printf '%s\n' "${checks[@]}"
}

check_dependencies() {
    local checks=()
    
    # Core tools
    checks+=("$(check_command git true '--version')")
    checks+=("$(check_command curl false '--version')")
    checks+=("$(check_command wget false '--version')")
    checks+=("$(check_command jq false '--version')")
    
    # Build tools
    checks+=("$(check_command make false '--version')")
    checks+=("$(check_command gcc false '--version')")
    checks+=("$(check_command docker false '--version')")
    
    # Network tools
    checks+=("$(check_command ssh false '-V')")
    checks+=("$(check_command openssl false 'version')")
    
    # Archive tools
    checks+=("$(check_command tar false '--version')")
    checks+=("$(check_command zip false '--version')")
    checks+=("$(check_command unzip false '-v')")
    
    # Text processing
    checks+=("$(check_command sed true '--version')")
    checks+=("$(check_command awk false '--version')")
    checks+=("$(check_command grep true '--version')")
    
    printf '%s\n' "${checks[@]}"
}

check_permissions() {
    local checks=()
    
    # Temp directory
    checks+=("$(check_file_perms /tmp write)")
    
    # Home directory
    checks+=("$(check_file_perms "$HOME" write)")
    
    # Working directory
    checks+=("$(check_file_perms "$(pwd)" write)")
    
    # /var/log check (non-critical)
    if [[ -d "/var/log" ]]; then
        checks+=("$(check_file_perms /var/log write || echo 'warn|/var/log not writable (may need sudo)')")
    fi
    
    # Check if sudo is available
    if command -v sudo &> /dev/null; then
        if sudo -n true 2>/dev/null; then
            checks+=("pass|Sudo available and passwordless")
        else
            checks+=("pass|Sudo available (password required)")
        fi
    else
        checks+=("warn|Sudo not available")
    fi
    
    # Check umask
    local umask_val
    umask_val=$(umask)
    checks+=("pass|Umask: $umask_val")
    
    printf '%s\n' "${checks[@]}"
}

check_network() {
    local checks=()
    
    # DNS resolution
    if host google.com &>/dev/null; then
        checks+=("pass|DNS resolution working")
    else
        checks+=("fail|DNS resolution failed")
    fi
    
    # Outbound connectivity
    if curl -s --connect-timeout 5 https://api.github.com > /dev/null 2>&1; then
        checks+=("pass|Outbound HTTPS connectivity")
    else
        checks+=("warn|Outbound HTTPS failed (may be firewall)")
    fi
    
    # Common ports check
    local ports=("80" "443")
    for port in "${ports[@]}"; do
        if timeout 1 bash -c "echo > /dev/tcp/google.com/$port" 2>/dev/null; then
            checks+=("pass|Port $port reachable")
        else
            checks+=("warn|Port $port blocked or filtered")
        fi
    done
    
    # Local network info
    local ip_addr
    ip_addr=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "unknown")
    checks+=("pass|Local IP: $ip_addr")
    
    printf '%s\n' "${checks[@]}"
}

check_config() {
    local checks=()
    
    # Check for common config directories
    local config_dirs=(".config" ".env" "config" ".pi")
    
    for dir in "${config_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            local file_count
            file_count=$(find "$dir" -type f 2>/dev/null | wc -l)
            checks+=("pass|$dir exists with $file_count files")
        else
            checks+=("info|$dir not found")
        fi
    done
    
    # Check for .env file
    if [[ -f ".env" ]]; then
        # Count lines (not values - security)
        local env_lines
        env_lines=$(wc -l < .env)
        checks+=("pass|.env file exists ($env_lines lines)")
        
        # Check if .env is in .gitignore
        if [[ -f ".gitignore" ]]; then
            if grep -q ".env" .gitignore; then
                checks+=("pass|.env in .gitignore")
            else
                checks+=("warn|.env NOT in .gitignore (security risk)")
            fi
        fi
    else
        checks+=("info|No .env file in current directory")
    fi
    
    # Check for package.json if Node project
    if [[ -f "package.json" ]]; then
        if node -e "JSON.parse(require('fs').readFileSync('package.json'))" 2>/dev/null; then
            checks+=("pass|package.json is valid JSON")
        else
            checks+=("fail|package.json has invalid JSON")
        fi
    fi
    
    printf '%s\n' "${checks[@]}"
}

check_storage() {
    local checks=()
    
    # Disk space
    local df_output
    df_output=$(df -h / 2>/dev/null | tail -1) || df_output="unknown"
    
    local total used avail
    total=$(echo "$df_output" | awk '{print $2}')
    used=$(echo "$df_output" | awk '{print $3}')
    avail=$(echo "$df_output" | awk '{print $4}')
    
    checks+=("info|Disk: ${used:-?}B used of ${total:-?}B (${avail:-?}B avail)")
    
    # Check if we have reasonable free space (>1GB)
    local avail_kb
    avail_kb=$(df -k / 2>/dev/null | tail -1 | awk '{print $4}')
    if [[ -n "$avail_kb" && "$avail_kb" -gt 1048576 ]]; then
        checks+=("pass|Sufficient disk space (>1GB free)")
    elif [[ -n "$avail_kb" && "$avail_kb" -gt 102400 ]]; then
        checks+=("warn|Low disk space (<1GB free)")
    elif [[ -n "$avail_kb" ]]; then
        checks+=("fail|Very low disk space (<100MB free)")
    fi
    
    # Inode usage
    local inode_output
    inode_output=$(df -i / 2>/dev/null | tail -1) || inode_output=""
    if [[ -n "$inode_output" ]]; then
        local inode_used inode_avail
        inode_used=$(echo "$inode_output" | awk '{print $3}')
        inode_avail=$(echo "$inode_output" | awk '{print $4}')
        checks+=("info|Inodes: ${inode_used:-?} used, ${inode_avail:-?} avail")
    fi
    
    # Temp directory
    if [[ -d "/tmp" ]]; then
        checks+=("pass|Temp directory exists")
        # Test write
        local test_file="/tmp/diag_test_$$"
        if touch "$test_file" 2>/dev/null; then
            rm -f "$test_file"
            checks+=("pass|Temp directory writable")
        else
            checks+=("fail|Temp directory not writable")
        fi
    fi
    
    # File descriptor limits
    local fd_limit
    fd_limit=$(ulimit -n 2>/dev/null) || fd_limit="unknown"
    checks+=("info|File descriptor limit: $fd_limit")
    
    printf '%s\n' "${checks[@]}"
}

# Run diagnostics
run_diagnostics() {
    local all_results=()
    
    for category in "${CATEGORIES[@]}"; do
        local category_results=()
        
        case "$category" in
            environment)
                category_results=$(check_environment) ;;
            dependencies)
                category_results=$(check_dependencies) ;;
            permissions)
                category_results=$(check_permissions) ;;
            network)
                category_results=$(check_network) ;;
            config)
                category_results=$(check_config) ;;
            storage)
                category_results=$(check_storage) ;;
            *)
                echo "Unknown category: $category" >&2
                continue
                ;;
        esac
        
        while IFS='|' read -r status message; do
            case "$status" in
                pass) ((PASSED++)) ;;
                warn) ((WARNINGS++)) ;;
                fail) ((FAILED++)) ;;
                info) ;;  # info doesn't count
            esac
            
            all_results+=("$category|$status|$message")
        done <<< "$category_results"
    done
    
    # Output results
    case "$FORMAT" in
        json)
            output_json "${all_results[@]}"
            ;;
        markdown)
            output_markdown "${all_results[@]}"
            ;;
        *)
            output_text "${all_results[@]}"
            ;;
    esac
}

output_text() {
    local results=("$@")
    
    echo "================================"
    echo "       DIAGNOSTIC REPORT       "
    echo "================================"
    echo "Timestamp: $TIMESTAMP"
    echo ""
    
    local current_category=""
    
    for result in "${results[@]}"; do
        IFS='|' read -r category status message <<< "$result"
        
        # Category header
        if [[ "$category" != "$current_category" ]]; then
            echo ""
            echo "[$category]"
            echo "---"
            current_category="$category"
        fi
        
        # Status indicator
        local indicator
        case "$status" in
            pass) indicator="${GREEN}✓${NC}" ;;
            warn) indicator="${YELLOW}⚠${NC}" ;;
            fail) indicator="${RED}✗${NC}" ;;
            info) indicator="${BLUE}ℹ${NC}" ;;
        esac
        
        echo -e "  $indicator $message"
    done
    
    echo ""
    echo "================================"
    echo "      SUMMARY"
    echo "================================"
    echo -e "${GREEN}Passed:${NC}   $PASSED"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
    echo -e "${RED}Failed:${NC}   $FAILED"
    
    # Return status
    if [[ $FAILED -gt 0 ]]; then
        exit 2
    elif [[ $WARNINGS -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

output_json() {
    local results=("$@")
    
    echo "{"
    echo "  \"timestamp\": \"$TIMESTAMP\","
    echo "  \"status\": \"$(if [[ $FAILED -gt 0 ]]; then echo 'fail'; elif [[ $WARNINGS -gt 0 ]]; then echo 'warn'; else echo 'pass'; fi)\","
    echo "  \"summary\": {"
    echo "    \"passed\": $PASSED,"
    echo "    \"warnings\": $WARNINGS,"
    echo "    \"failed\": $FAILED"
    echo "  },"
    echo "  \"checks\": ["
    
    local first=true
    for result in "${results[@]}"; do
        IFS='|' read -r category status message <<< "$result"
        
        if [[ "$first" == "true" ]]; then
            first=false
        else
            echo ","
        fi
        
        echo -n "    {\"category\": \"$category\", \"status\": \"$status\", \"message\": \"$message\"}"
    done
    
    echo ""
    echo "  ]"
    echo "}"
    
    if [[ $FAILED -gt 0 ]]; then
        exit 2
    elif [[ $WARNINGS -gt 0 ]]; then
        exit 1
    fi
}

output_markdown() {
    local results=("$@")
    
    echo "# Diagnostic Report"
    echo ""
    echo "**Timestamp:** $TIMESTAMP"
    echo ""
    echo "**Status:** $(if [[ $FAILED -gt 0 ]]; then echo '❌ FAILED'; elif [[ $WARNINGS -gt 0 ]]; then echo '⚠️ WARNINGS'; else echo '✅ PASSED'; fi)"
    echo ""
    echo "## Summary"
    echo ""
    echo "| Status | Count |"
    echo "|--------|-------|"
    echo "| ✅ Passed | $PASSED |"
    echo "| ⚠️ Warnings | $WARNINGS |"
    echo "| ❌ Failed | $FAILED |"
    echo ""
    
    local current_category=""
    
    for result in "${results[@]}"; do
        IFS='|' read -r category status message <<< "$result"
        
        if [[ "$category" != "$current_category" ]]; then
            echo ""
            echo "## $category"
            echo ""
            echo "| Status | Message |"
            echo "|--------|---------|"
            current_category="$category"
        fi
        
        local status_icon
        case "$status" in
            pass) status_icon="✅" ;;
            warn) status_icon="⚠️" ;;
            fail) status_icon="❌" ;;
            info) status_icon="ℹ️" ;;
        esac
        
        echo "| $status_icon | $message |"
    done
    
    if [[ $FAILED -gt 0 ]]; then
        exit 2
    elif [[ $WARNINGS -gt 0 ]]; then
        exit 1
    fi
}

# Main
run_diagnostics