#!/bin/bash
# Clipboard Tools - System clipboard operations
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default values
ACTION=""
CONTENT=""
INPUT_FILE=""
OUTPUT_FILE=""
TRIM=true
OUTPUT_FORMAT="text"

# Usage
usage() {
    cat << EOF
Usage: $(basename "$0") <command> [options]

Commands:
  copy              Copy text to clipboard
  paste             Paste from clipboard to stdout
  clear             Clear clipboard content
  status            Show clipboard status and platform
  has-content       Exit 0 if clipboard has content, 1 if empty

Options:
  --file FILE       Copy from/paste to file
  --trim            Trim whitespace when pasting (default)
  --no-trim         Don't trim whitespace
  --json            JSON output (for status command)
  --help            Show this help message

Examples:
  $(basename "$0") copy "Hello, World!"
  echo "text" | $(basename "$0") copy
  $(basename "$0") copy --file document.txt
  $(basename "$0") paste
  $(basename "$0") paste --file output.txt
  $(basename "$0") clear
  $(basename "$0") status
EOF
    exit 0
}

# Detect platform and available clipboard tool
detect_clipboard_tool() {
    local os
    os=$(uname -s)
    
    case "$os" in
        Darwin)
            # macOS - pbcopy/pbpaste are built-in
            if command -v pbcopy &>/dev/null && command -v pbpaste &>/dev/null; then
                echo "macos:pbcopy:pbpaste"
                return 0
            fi
            ;;
        Linux)
            # Check for Wayland first
            if [[ -n "${WAYLAND_DISPLAY:-}" ]]; then
                if command -v wl-copy &>/dev/null && command -v wl-paste &>/dev/null; then
                    echo "linux:wl-copy:wl-paste"
                    return 0
                fi
            fi
            
            # Fall back to X11 tools
            if command -v xclip &>/dev/null; then
                echo "linux:xclip:xclip"
                return 0
            elif command -v xsel &>/dev/null; then
                echo "linux:xsel:xsel"
                return 0
            fi
            ;;
        CYGWIN*|MINGW*|MSYS*)
            # Windows/Cygwin
            if command -v putclip &>/dev/null; then
                echo "cygwin:putclip:getclip"
                return 0
            fi
            ;;
    esac
    
    # Check for WSL (Windows Subsystem for Linux)
    if grep -qi microsoft /proc/version 2>/dev/null; then
        if command -v clip.exe &>/dev/null && command -v powershell.exe &>/dev/null; then
            echo "wsl:clip.exe:powershell.exe"
            return 0
        fi
    fi
    
    echo "none::"
    return 1
}

# Copy to clipboard
copy_to_clipboard() {
    local text="$1"
    local platform_tool
    
    platform_tool=$(detect_clipboard_tool)
    IFS=':' read -r platform copy_tool paste_tool <<< "$platform_tool"
    
    if [[ -z "$copy_tool" ]]; then
        echo "Error: No clipboard tool available" >&2
        exit 1
    fi
    
    case "$platform" in
        macos)
            echo -n "$text" | pbcopy
            ;;
        linux)
            case "$copy_tool" in
                xclip)
                    echo -n "$text" | xclip -selection clipboard
                    ;;
                xsel)
                    echo -n "$text" | xsel --clipboard --input
                    ;;
                wl-copy)
                    echo -n "$text" | wl-copy
                    ;;
            esac
            ;;
        wsl)
            echo -n "$text" | clip.exe
            ;;
        cygwin)
            echo -n "$text" | putclip
            ;;
        *)
            echo "Error: Unsupported platform: $platform" >&2
            exit 1
            ;;
    esac
    
    echo "Copied to clipboard"
}

# Paste from clipboard
paste_from_clipboard() {
    local platform_tool
    
    platform_tool=$(detect_clipboard_tool)
    IFS=':' read -r platform copy_tool paste_tool <<< "$platform_tool"
    
    if [[ -z "$paste_tool" ]]; then
        echo "Error: No clipboard tool available" >&2
        exit 1
    fi
    
    local content
    
    case "$platform" in
        macos)
            content=$(pbpaste)
            ;;
        linux)
            case "$paste_tool" in
                xclip)
                    content=$(xclip -selection clipboard -o)
                    ;;
                xsel)
                    content=$(xsel --clipboard --output)
                    ;;
                wl-paste)
                    content=$(wl-paste)
                    ;;
            esac
            ;;
        wsl)
            content=$(powershell.exe -Command 'Get-Clipboard' | sed 's/\r$//')
            ;;
        cygwin)
            content=$(getclip)
            ;;
        *)
            echo "Error: Unsupported platform: $platform" >&2
            exit 1
            ;;
    esac
    
    if [[ "$TRIM" == "true" ]]; then
        content=$(echo "$content" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    fi
    
    if [[ -n "$OUTPUT_FILE" ]]; then
        echo "$content" > "$OUTPUT_FILE"
        echo "Pasted to: $OUTPUT_FILE"
    else
        echo "$content"
    fi
}

# Clear clipboard
clear_clipboard() {
    local platform_tool
    
    platform_tool=$(detect_clipboard_tool)
    IFS=':' read -r platform copy_tool paste_tool <<< "$platform_tool"
    
    if [[ -z "$copy_tool" ]]; then
        echo "Error: No clipboard tool available" >&2
        exit 1
    fi
    
    # Copy empty string
    case "$platform" in
        macos)
            echo "" | pbcopy
            ;;
        linux)
            case "$copy_tool" in
                xclip)
                    echo "" | xclip -selection clipboard
                    ;;
                xsel)
                    echo "" | xsel --clipboard --input
                    ;;
                wl-copy)
                    echo "" | wl-copy
                    ;;
            esac
            ;;
        wsl)
            echo "" | clip.exe
            ;;
        cygwin)
            echo "" | putclip
            ;;
    esac
    
    echo "Clipboard cleared"
}

# Check if clipboard has content
has_clipboard_content() {
    local platform_tool
    
    platform_tool=$(detect_clipboard_tool)
    IFS=':' read -r platform copy_tool paste_tool <<< "$platform_tool"
    
    if [[ -z "$paste_tool" ]]; then
        echo "Error: No clipboard tool available" >&2
        exit 1
    fi
    
    local content
    content=$(paste_from_clipboard 2>/dev/null) || content=""
    
    if [[ -n "$content" ]]; then
        exit 0
    else
        exit 1
    fi
}

# Show clipboard status
show_status() {
    local platform_tool
    platform_tool=$(detect_clipboard_tool)
    
    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        local platform copy_tool paste_tool
        if [[ "$platform_tool" == "none::" ]]; then
            cat << EOF
{
  "platform": "$(uname -s)",
  "tool": null,
  "available": false,
  "has_content": false
}
EOF
        else
            IFS=':' read -r platform copy_tool paste_tool <<< "$platform_tool"
            local has_content="false"
            paste_from_clipboard &>/dev/null && has_content="true"
            
            cat << EOF
{
  "platform": "$platform",
  "copy_tool": "$copy_tool",
  "paste_tool": "$paste_tool",
  "available": true,
  "has_content": $has_content
}
EOF
        fi
    else
        if [[ "$platform_tool" == "none::" ]]; then
            echo "Platform: $(uname -s)"
            echo "Clipboard tool: Not available"
            echo "Status: ❌ No clipboard support"
        else
            IFS=':' read -r platform copy_tool paste_tool <<< "$platform_tool"
            echo "Platform: $platform"
            echo "Copy tool: $copy_tool"
            echo "Paste tool: $paste_tool"
            echo "Status: ✅ Available"
        fi
    fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        copy|paste|clear|status|has-content|has_content)
            ACTION="$1"
            shift
            ;;
        --file)
            if [[ "$ACTION" == "copy" ]]; then
                INPUT_FILE="$2"
            else
                OUTPUT_FILE="$2"
            fi
            shift 2
            ;;
        --trim)
            TRIM=true
            shift
            ;;
        --no-trim)
            TRIM=false
            shift
            ;;
        --json)
            OUTPUT_FORMAT="json"
            shift
            ;;
        -*)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
        *)
            if [[ -z "$ACTION" ]]; then
                echo "Error: Command required (copy/paste/clear/status)" >&2
                usage
            fi
            
            # Content for copy command
            if [[ "$ACTION" == "copy" ]]; then
                if [[ -z "$CONTENT" ]]; then
                    CONTENT="$1"
                fi
            fi
            shift
            ;;
    esac
done

# Validate
if [[ -z "$ACTION" ]]; then
    echo "Error: Command required (copy/paste/clear/status)" >&2
    usage
fi

# Main
case "$ACTION" in
    copy)
        if [[ -n "$INPUT_FILE" ]]; then
            if [[ ! -f "$INPUT_FILE" ]]; then
                echo "Error: File not found: $INPUT_FILE" >&2
                exit 1
            fi
            CONTENT=$(cat "$INPUT_FILE")
        elif [[ -z "$CONTENT" ]]; then
            # Read from stdin
            read -r -d '' CONTENT || true
        fi
        copy_to_clipboard "$CONTENT"
        ;;
    paste)
        paste_from_clipboard
        ;;
    clear)
        clear_clipboard
        ;;
    status)
        show_status
        ;;
    has-content|has_content)
        has_clipboard_content
        ;;
    *)
        echo "Unknown command: $ACTION" >&2
        exit 1
        ;;
esac