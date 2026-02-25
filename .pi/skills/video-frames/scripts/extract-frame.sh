#!/bin/bash
# Extract frames from video files at specified timestamps

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="."

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --timestamp)
            TIMESTAMP="$2"
            shift 2
            ;;
        --timestamps)
            TIMESTAMPS="$2"
            shift 2
            ;;
        --start)
            START="$2"
            shift 2
            ;;
        --end)
            END="$2"
            shift 2
            ;;
        --interval)
            INTERVAL="$2"
            shift 2
            ;;
        --output)
            OUTPUT="$2"
            shift 2
            ;;
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        --quality)
            QUALITY="$2"
            shift 2
            ;;
        *)
            VIDEO_FILE="$1"
            shift
            ;;
    esac
done

# Defaults
FORMAT="${FORMAT:-jpg}"
QUALITY="${QUALITY:-95}"
OUTPUT_DIR="${OUTPUT_DIR:-.}"

if [ -z "$VIDEO_FILE" ]; then
    echo "Usage: $0 <video-file> [options]"
    echo "Options:"
    echo "  --timestamp HH:MM:SS    Extract single frame at timestamp"
    echo "  --timestamps H:M:S,...   Extract multiple frames"
    echo "  --start HH:MM:SS        Start time for range"
    echo "  --end HH:MM:SS          End time for range"
    echo "  --interval SECONDS      Extract every N seconds"
    echo "  --output FILE           Output file (single frame)"
    echo "  --output-dir DIR        Output directory (multiple frames)"
    echo "  --format FORMAT         Output format: jpg, png (default: jpg)"
    echo "  --quality N            JPEG quality 1-100 (default: 95)"
    exit 1
fi

# Check ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "Error: ffmpeg not found. Install with: brew install ffmpeg"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to convert timestamp to seconds
timestamp_to_seconds() {
    local ts="$1"
    local seconds
    if [[ "$ts" =~ ^([0-9]+):([0-9]+):([0-9]+)$ ]]; then
        seconds=$((10#${BASH_REMATCH[1]} * 3600 + 10#${BASH_REMATCH[2]} * 60 + 10#${BASH_REMATCH[3]}))
    elif [[ "$ts" =~ ^([0-9]+):([0-9]+)$ ]]; then
        seconds=$((10#${BASH_REMATCH[1]} * 60 + 10#${BASH_REMATCH[2]}))
    else
        seconds="$ts"
    fi
    echo "$seconds"
}

# Single timestamp
if [ -n "$TIMESTAMP" ]; then
    secs=$(timestamp_to_seconds "$TIMESTAMP")
    output="${OUTPUT:-"${OUTPUT_DIR}/frame_$(date +%s).${FORMAT}"}"
    ffmpeg -y -ss "$secs" -i "$VIDEO_FILE" -vframes 1 -q:v 2 "/tmp/frame.$$.${FORMAT}" 2>/dev/null
    mv "/tmp/frame.$$.${FORMAT}" "$output"
    echo "{\"success\": true, \"frames\": [\"$output\"], \"count\": 1}"
    exit 0
fi

# Multiple timestamps
if [ -n "$TIMESTAMPS" ]; then
    frames=()
    count=0
    IFS=',' read -ra TS_ARRAY <<< "$TIMESTAMPS"
    for ts in "${TS_ARRAY[@]}"; do
        secs=$(timestamp_to_seconds "$ts")
        output="${OUTPUT_DIR}/frame_$(printf "%03d" $count).${FORMAT}"
        ffmpeg -y -ss "$secs" -i "$VIDEO_FILE" -vframes 1 -q:v 2 "/tmp/frame_$$_${count}.${FORMAT}" 2>/dev/null
        mv "/tmp/frame_$$_${count}.${FORMAT}" "$output"
        frames+=("$output")
        ((count++))
    done
    echo "{\"success\": true, \"frames\": [\"${frames[*]}\"], \"count\": $count}"
    exit 0
fi

# Range extraction
if [ -n "$START" ] && [ -n "$END" ] && [ -n "$INTERVAL" ]; then
    start_secs=$(timestamp_to_seconds "$START")
    end_secs=$(timestamp_to_seconds "$END")
    interval_secs="$INTERVAL"
    
    frames=()
    count=0
    current_secs=$start_secs
    
    while [ $current_secs -le $end_secs ]; do
        output="${OUTPUT_DIR}/frame_$(printf "%03d" $count).${FORMAT}"
        ffmpeg -y -ss "$current_secs" -i "$VIDEO_FILE" -vframes 1 -q:v 2 "/tmp/frame_$$_${count}.${FORMAT}" 2>/dev/null
        mv "/tmp/frame_$$_${count}.${FORMAT}" "$output"
        frames+=("$output")
        ((count++))
        current_secs=$((current_secs + interval_secs))
    done
    
    echo "{\"success\": true, \"frames\": [\"${frames[*]}\"], \"count\": $count}"
    exit 0
fi

echo "Error: Specify either --timestamp, --timestamps, or --start/--end/--interval"
exit 1
