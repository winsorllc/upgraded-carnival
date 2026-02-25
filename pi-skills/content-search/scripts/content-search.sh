#!/bin/bash
# Content search helper script
# Uses ripgrep (rg) if available, falls back to grep

# Check for ripgrep
if command -v rg &> /dev/null; then
    HAS_RG=true
else
    HAS_RG=false
fi

# Parse arguments
PATTERN=""
PATH="."
OUTPUT_MODE="content"
INCLUDE=""
CASE_SENSITIVE=true
CONTEXT_BEFORE=0
CONTEXT_AFTER=0
CONTEXT=0
MAX_COUNT=0
INVERT_MATCH=false

# Parse positional args and options
while [[ $# -gt 0 ]]; do
    case "$1" in
        -p|--path)
            PATH="$2"
            shift 2
            ;;
        -o|--output-mode)
            OUTPUT_MODE="$2"
            shift 2
            ;;
        -i|--include)
            INCLUDE="$2"
            shift 2
            ;;
        -s|--case-sensitive)
            CASE_SENSITIVE="$2"
            shift 2
            ;;
        -B|--context-before)
            CONTEXT_BEFORE="$2"
            shift 2
            ;;
        -A|--context-after)
            CONTEXT_AFTER="$2"
            shift 2
            ;;
        -C|--context)
            CONTEXT="$2"
            shift 2
            ;;
        -m|--max-count)
            MAX_COUNT="$2"
            shift 2
            ;;
        -v|--invert-match)
            INVERT_MATCH=true
            shift
            ;;
        -*)
            echo "Unknown option: $1"
            exit 1
            ;;
        *)
            # First positional is pattern, second is path
            if [ -z "$PATTERN" ]; then
                PATTERN="$1"
            elif [ "$PATH" = "." ]; then
                PATH="$1"
            fi
            shift
            ;;
    esac
done

if [ -z "$PATTERN" ]; then
    echo "Usage: $0 <pattern> [path] [options]"
    echo "Run with --help for usage information"
    exit 1
fi

# Calculate total context
if [ "$CONTEXT" -gt 0 ]; then
    CONTEXT_BEFORE=$CONTEXT
    CONTEXT_AFTER=$CONTEXT
fi

# Build and run command
if [ "$HAS_RG" = true ]; then
    # Use ripgrep
    declare -a CMD=("rg" "--hidden")
    
    case "$OUTPUT_MODE" in
        content) CMD+=("--line-number") ;;
        files_with_matches) CMD+=("--files") ;;
        count) CMD+=("--count") ;;
    esac
    
    if [ -n "$INCLUDE" ]; then
        # Use glob pattern
        CMD+=("-g" "*.$INCLUDE")
    fi
    
    if [ "$CASE_SENSITIVE" = "false" ]; then
        CMD+=("--ignore-case")
    fi
    
    if [ "$CONTEXT_BEFORE" -gt 0 ]; then
        CMD+=("--before-context" "$CONTEXT_BEFORE")
    fi
    
    if [ "$CONTEXT_AFTER" -gt 0 ]; then
        CMD+=("--after-context" "$CONTEXT_AFTER")
    fi
    
    if [ "$MAX_COUNT" -gt 0 ]; then
        CMD+=("--max-count" "$MAX_COUNT")
    fi
    
    if [ "$INVERT_MATCH" = true ]; then
        CMD+=("--invert-match")
    fi
    
    CMD+=("$PATTERN" "$PATH")
    
    "${CMD[@]}"
    
else
    # Fallback to basic grep - use /usr/bin/grep to avoid shadows
    declare -a CMD=("/usr/bin/grep" "-rn")
    
    if [ "$CASE_SENSITIVE" = "false" ]; then
        CMD+=("-i")
    fi
    
    if [ "$CONTEXT_BEFORE" -gt 0 ]; then
        CMD+=("-B" "$CONTEXT_BEFORE")
    fi
    
    if [ "$CONTEXT_AFTER" -gt 0 ]; then
        CMD+=("-A" "$CONTEXT_AFTER")
    fi
    
    if [ "$MAX_COUNT" -gt 0 ]; then
        CMD+=("-m" "$MAX_COUNT")
    fi
    
    if [ "$INVERT_MATCH" = true ]; then
        CMD+=("-v")
    fi
    
    if [ -n "$INCLUDE" ]; then
        # Convert *.js,*.ts to grep -G pattern  
        INCLUDE_PATTERN=$(echo "$INCLUDE" | /usr/bin/sed 's/\./\\./g' | /usr/bin/sed 's/,/|/g')
        CMD+=(--include=".*\.\(${INCLUDE_PATTERN}\)$")
    fi
    
    CMD+=("$PATTERN" "$PATH")
    
    if [ "$OUTPUT_MODE" = "files_with_matches" ]; then
        "${CMD[@]}" | /usr/bin/cut -d: -f1 | /usr/bin/sort -u
    else
        "${CMD[@]}"
    fi
fi
