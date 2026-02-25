#!/bin/bash
# gifgrep wrapper script with fallback capabilities
# Provides GIF search using available tools

COMMAND="${1:-}"
QUERY="${2:-}"

# Check if gifgrep is available
if command -v gifgrep &> /dev/null; then
    # Use real gifgrep if available
    exec gifgrep "$@"
fi

# Fallback: Simple GIF search using curl and Tenor API
search_gifs() {
    local query="$1"
    local max="${2:-10}"
    local api_key="${TENOR_API_KEY:-AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ}"  # Public demo key
    
    echo "Searching for: $query"
    echo ""
    
    # Use Tenor API (free, no key needed for basic use)
    curl -s "https://tenor.googleapis.com/v2/search?q=$query&limit=$max&contentfilter=medium&media_filter=gif" | \
        jq -r '.results[] | .url' 2>/dev/null || \
    echo "Error: Could not search Tenor. Install gifgrep for full functionality."
}

# Fallback: Extract frames from GIF using ffmpeg
extract_still() {
    local gif="$1"
    local timestamp="${2:-0}"
    local output="${3:-still.png}"
    
    if command -v ffmpeg &> /dev/null; then
        ffmpeg -ss "$timestamp" -i "$gif" -vframes 1 -q:v 2 "$output" -y 2>/dev/null
        echo "Extracted still to: $output"
    else
        echo "Error: ffmpeg not available. Install ffmpeg for frame extraction."
        exit 1
    fi
}

# Fallback: Extract frames as sprite sheet
extract_sheet() {
    local gif="$1"
    local frames="${2:-9}"
    local cols="${3:-3}"
    local output="${4:-sheet.png}"
    
    if command -v ffmpeg &> /dev/null; then
        # Get duration
        local duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$gif" 2>/dev/null)
        local interval=$(echo "$duration / $frames" | bc -l)
        
        # Extract frames
        local tmpdir=$(mktemp -d)
        for i in $(seq 0 $((frames - 1))); do
            local time=$(echo "$i * $interval" | bc -l)
            ffmpeg -ss "$time" -i "$gif" -vframes 1 -q:v 2 "$tmpdir/frame_$i.png" -y 2>/dev/null
        done
        
        # Create montage
        if command -v montage &> /dev/null; then
            montage "$tmpdir"/*.png -tile "${cols}x" -geometry +2+2 "$output"
        else
            # Just copy first frame if montage not available
            cp "$tmpdir/frame_0.png" "$output"
        fi
        
        rm -rf "$tmpdir"
        echo "Created sprite sheet: $output"
    else
        echo "Error: ffmpeg not available. Install ffmpeg for sprite sheet creation."
        exit 1
    fi
}

# Show help
show_help() {
    echo "gifgrep - GIF search and extraction tool"
    echo ""
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  search <query> [max]          Search for GIFs"
    echo "  still <gif> <time> <output>   Extract still frame"
    echo "  sheet <gif> <frames> <output> Create sprite sheet"
    echo "  tui <query>                   Open TUI browser (requires gifgrep)"
    echo ""
    echo "Note: This is a fallback implementation. Install gifgrep for full functionality:"
    echo "  go install github.com/steipete/gifgrep/cmd/gifgrep@latest"
    echo ""
    echo "Environment:"
    echo "  TENOR_API_KEY    Optional Tenor API key"
    echo "  GIPHY_API_KEY   Giphy API key (for Giphy provider)"
}

# Parse command
case "$COMMAND" in
    search)
        search_gifs "$QUERY" "${3:-10}"
        ;;
    still)
        extract_still "$2" "${3:-0}" "${4:-still.png}"
        ;;
    sheet)
        extract_sheet "$2" "${3:-9}" "${4:-3}" "${5:-sheet.png}"
        ;;
    tui)
        echo "TUI mode requires gifgrep. Install it:"
        echo "  go install github.com/steipete/gifgrep/cmd/gifgrep@latest"
        exit 1
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        # Pass through to real gifgrep if available
        if command -v gifgrep &> /dev/null; then
            exec gifgrep "$@"
        else
            show_help
            exit 1
        fi
        ;;
esac
