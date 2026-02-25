#!/bin/bash
# Disk Manager - Disk space management and cleanup
set -euo pipefail

# Default values
COMMAND=""
PATH_ARG="."
HUMAN_READABLE=false
DEPTH=1
SORT_SIZE=false
LIMIT=10
MIN_SIZE=""
MAX_SIZE=""
FILE_TYPE=""
DAYS=30
DELETE=false
DRY_RUN=false
THRESHOLD=""
BY_SIZE=false
BY_COUNT=false
ALL_FILESYSTEMS=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Usage
usage() {
    cat << EOF
Usage: $(basename "$0") <command> [path] [options]

Commands:
  space              Show disk space usage
  du                 Show directory usage
  largest            Find largest files
  old                Find old files
  clean              Clean temporary/cache files
  types              Show file type distribution
  inodes             Show inode usage

Path:
  Path to analyze (default: current directory)

Disk Space Options:
  --human-readable   Show sizes in human-readable format
  --all              Show all filesystems

Directory Options:
  --depth N          Directory traversal depth (default: 1)
  --sort-by-size     Sort by size (largest first)
  --threshold SIZE   Show only above size threshold

Large Files Options:
  --limit N          Limit results (default: 10)
  --min-size SIZE    Minimum file size (e.g., 100M)
  --max-size SIZE    Maximum file size
  --type TYPE        File type: f (file), d (dir)

Old Files Options:
  --days N           Files older than N days (default: 30)
  --delete           Delete found files
  --dry-run          Show what would be deleted

Clean Options:
  --temp             Clean temp directories
  --cache            Clean cache directories
  --logs             Clean old log files
  --all              Clean all of the above
  --dry-run          Show what would be cleaned

File Types Options:
  --by-size          Sort by total size
  --by-count         Sort by file count

Inode Options:
  --find-high-usage  Find directories with high inode usage

Examples:
  $(basename "$0") space --human-readable
  $(basename "$0") du /home/user --depth 2 --sort-by-size
  $(basename "$0") largest /var --limit 20 --min-size 100M
  $(basename "$0") old /tmp --days 7 --delete --dry-run
  $(basename "$0") clean --temp --dry-run
  $(basename "$0") types /home/user/Downloads --by-size
EOF
    exit 0
}

# Parse size to bytes
parse_size() {
    local size="$1"
    local multiplier=1
    
    case "$size" in
        *K) multiplier=1024; size="${size%K}" ;;
        *M) multiplier=$((1024 * 1024)); size="${size%M}" ;;
        *G) multiplier=$((1024 * 1024 * 1024)); size="${size%G}" ;;
        *T) multiplier=$((1024 * 1024 * 1024 * 1024)); size="${size%T}" ;;
    esac
    
    echo $((size * multiplier))
}

# Format bytes to human readable
format_size() {
    local bytes="$1"
    
    if [[ "$HUMAN_READABLE" != "true" ]]; then
        echo "$bytes"
        return
    fi
    
    local units=("B" "K" "M" "G" "T" "P")
    local unit=0
    local size="$bytes"
    
    while [[ $(echo "$size >= 1024" | bc) -eq 1 ]] && [[ $unit -lt 5 ]]; do
        size=$(echo "scale=1; $size / 1024" | bc)
        ((unit++))
    done
    
    printf "%.1f%s" "$size" "${units[$unit]}"
}

# Show disk space
show_space() {
    local path="${PATH_ARG:-/}"
    
    if [[ "$ALL_FILESYSTEMS" == "true" ]]; then
        path=""
    fi
    
    local df_opts="-h"
    [[ "$HUMAN_READABLE" != "true" ]] && df_opts=""
    
    echo "Filesystem Space Usage"
    echo "======================"
    
    if command -v df &>/dev/null; then
        df $df_opts $path 2>/dev/null || df -h $path 2>/dev/null
    else
        echo "Error: df command not found" >&2
        exit 1
    fi
    
    # Show inode usage if available
    if [[ "$HUMAN_READABLE" == "true" ]]; then
        echo ""
        echo "Inode Usage"
        echo "==========="
        df -i $path 2>/dev/null || true
    fi
}

# Show directory usage
show_du() {
    local path="${PATH_ARG:-.}"
    
    echo "Directory Usage: $path"
    echo "================================"
    
    local du_opts="-h"
    [[ "$HUMAN_READABLE" != "true" ]] && du_opts="-k"
    
    local sort_cmd="sort -hr"
    [[ "$HUMAN_READABLE" != "true" ]] && sort_cmd="sort -nr"
    
    if [[ "$SORT_SIZE" == "true" ]]; then
        du $du_opts -d "$DEPTH" "$path" 2>/dev/null | $sort_cmd
    else
        du $du_opts -d "$DEPTH" "$path" 2>/dev/null
    fi
    
    # Show total
    echo "--------------------------------"
    du $du_opts -s "$path" 2>/dev/null | awk '{print "Total: " $1}'
}

# Find largest files
find_largest() {
    local path="${PATH_ARG:-.}"
    
    echo "Top $LIMIT Largest Files in $path"
    echo "===================================="
    
    local size_opt=""
    [[ -n "$MIN_SIZE" ]] && size_opt="-size +$(parse_size "$MIN_SIZE")c"
    [[ -n "$MAX_SIZE" ]] && size_opt="$size_opt -size -$(parse_size "$MAX_SIZE")c"
    
    local type_opt=""
    [[ -n "$FILE_TYPE" ]] && type_opt="-type $FILE_TYPE"
    
    local find_cmd="find \"$path\" -type f $size_opt $type_opt -printf '%s %p\n' 2>/dev/null"
    
    eval "$find_cmd" | sort -rn | head -n "$LIMIT" | while read -r size file; do
        printf "%-10s %s\n" "$(format_size "$size")" "$file"
    done
}

# Find old files
find_old() {
    local path="${PATH_ARG:-.}"
    
    local action="ls -la"
    [[ "$DELETE" == "true" ]] && action="rm -f"
    [[ "$DRY_RUN" == "true" ]] && action="echo Would delete:"
    
    echo "Files older than $DAYS days in $path"
    echo "====================================="
    
    if [[ "$DELETE" == "true" ]] && [[ "$DRY_RUN" != "true" ]]; then
        echo "Warning: Deleting files older than $DAYS days"
    fi
    
    find "$path" -type f -mtime +"$DAYS" 2>/dev/null | while read -r file; do
        if [[ "$DELETE" == "true" ]] && [[ "$DRY_RUN" != "true" ]]; then
            rm -f "$file" && echo "Deleted: $file"
        else
            echo "$file"
        fi
    done
}

# Clean temp/cache files
clean_files() {
    local clean_temp=false
    local clean_cache=false
    local clean_logs=false
    
    # Parse from arguments (will be set by main parser)
    
    local temp_dirs=(
        "/tmp"
        "/var/tmp"
        "$HOME/.tmp"
        "${TMPDIR:-/tmp}"
    )
    
    local cache_dirs=(
        "$HOME/.cache"
        "/var/cache"
    )
    
    local log_dirs=(
        "/var/log"
        "$HOME/.local/share/logs"
        "$HOME/logs"
    )
    
    local dirs=()
    
    # Build list from options (parsed in main)
    [[ "$*" =~ --temp ]] && dirs+=("${temp_dirs[@]}")
    [[ "$*" =~ --cache ]] && dirs+=("${cache_dirs[@]}")
    [[ "$*" =~ --logs ]] && dirs+=("${log_dirs[@]}")
    
    if [[ "$*" =~ --all ]] || [[ $# -eq 0 ]]; then
        dirs+=("${temp_dirs[@]}" "${cache_dirs[@]}")
    fi
    
    echo "Cleaning temporary and cache files"
    echo "==================================="
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "(Dry run - no files will be deleted)"
        echo ""
    fi
    
    local total_size=0
    
    for dir in "${dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            local size
            size=$(du -sk "$dir" 2>/dev/null | awk '{print $1}')
            total_size=$((total_size + size))
            
            if [[ "$DRY_RUN" == "true" ]]; then
                echo "Would clean: $dir ($(format_size $((size * 1024))))"
            else
                echo "Cleaning: $dir ($(format_size $((size * 1024))))"
                rm -rf "${dir:?}"/* 2>/dev/null || true
            fi
        fi
    done
    
    echo ""
    echo "Total space that could be freed: $(format_size $((total_size * 1024)))"
}

# File type distribution
show_types() {
    local path="${PATH_ARG:-.}"
    
    echo "File Types by Size: $path"
    echo "================================"
    
    declare -A type_sizes
    declare -A type_counts
    
    while IFS= read -r file; do
        local ext
        ext="${file##*.}"
        [[ "$ext" == "$file" ]] && ext="(no ext)"
        ext=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
        
        local size
        size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
        
        type_sizes["$ext"]=$((type_sizes["$ext"] + size))
        type_counts["$ext"]=$((type_counts["$ext"] + 1))
    done < <(find "$path" -type f 2>/dev/null)
    
    # Output sorted by size
    if [[ "$BY_COUNT" == "true" ]]; then
        for ext in "${!type_counts[@]}"; do
            printf "%-10s %10d files\n" "$ext" "${type_counts[$ext]}"
        done | sort -k2 -rn
    else
        for ext in "${!type_sizes[@]}"; do
            printf "%-10s %10s  (%d files)\n" "$ext" "$(format_size "${type_sizes[$ext]}")" "${type_counts[$ext]}"
        done | sort -k2 -rh
    fi
}

# Inode usage
show_inodes() {
    local path="${PATH_ARG:-/}"
    
    echo "Inode Usage"
    echo "==========="
    
    df -i "$path" 2>/dev/null || df -i
    
    echo ""
    echo "Inode usage by directory (top 10)"
    echo "================================="
    
    # Find directories with most files
    find "$path" -maxdepth 3 -type d 2>/dev/null | while read -r dir; do
        local count
        count=$(find "$dir" -maxdepth 1 -type f 2>/dev/null | wc -l)
        printf "%8d  %s\n" "$count" "$dir"
    done | sort -rn | head -n 10
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        space|du|largest|old|clean|types|inodes)
            COMMAND="$1"
            shift
            ;;
        --human-readable|-h)
            HUMAN_READABLE=true
            shift
            ;;
        --all)
            ALL_FILESYSTEMS=true
            shift
            ;;
        --depth)
            DEPTH="$2"
            shift 2
            ;;
        --sort-by-size)
            SORT_SIZE=true
            shift
            ;;
        --limit)
            LIMIT="$2"
            shift 2
            ;;
        --min-size)
            MIN_SIZE="$2"
            shift 2
            ;;
        --max-size)
            MAX_SIZE="$2"
            shift 2
            ;;
        --type)
            FILE_TYPE="$2"
            shift 2
            ;;
        --days)
            DAYS="$2"
            shift 2
            ;;
        --delete)
            DELETE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --threshold)
            THRESHOLD="$2"
            shift 2
            ;;
        --by-size)
            BY_SIZE=true
            shift
            ;;
        --by-count)
            BY_COUNT=true
            shift
            ;;
        --temp|--cache|--logs)
            # Handled in clean_files
            shift
            ;;
        --help)
            usage
            ;;
        -*)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
        *)
            if [[ -z "$COMMAND" ]]; then
                COMMAND="$1"
            else
                PATH_ARG="$1"
            fi
            shift
            ;;
    esac
done

# Default command
if [[ -z "$COMMAND" ]]; then
    COMMAND="space"
fi

# Execute command
case "$COMMAND" in
    space)
        show_space
        ;;
    du)
        show_du
        ;;
    largest)
        find_largest
        ;;
    old)
        find_old
        ;;
    clean)
        clean_files
        ;;
    types)
        show_types
        ;;
    inodes)
        show_inodes
        ;;
    *)
        echo "Unknown command: $COMMAND" >&2
        usage
        ;;
esac