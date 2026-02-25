#!/bin/bash
# FFmpeg video compression tool
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: compress.sh <input> [options]

Options:
  --output <file>     Output file path
  --quality <level>   Quality: low, medium, high (default: medium)
  --size <size>       Target size (e.g., 10MB, 100MB)
  --crf <value>       Constant Rate Factor (18-28, lower = better quality)
  -h, --help          Show this help

Examples:
  compress.sh video.mp4 --output compressed.mp4
  compress.sh video.mp4 --quality low
  compress.sh video.mp4 --size 10MB --output small.mp4
EOF
    exit 2
}

# Check for ffmpeg
if ! command -v ffmpeg &>/dev/null; then
    echo "Error: ffmpeg not installed" >&2
    echo "Install: brew install ffmpeg (macOS) or apt install ffmpeg (Linux)" >&2
    exit 1
fi

# Default values
INPUT=""
OUTPUT=""
QUALITY="medium"
TARGET_SIZE=""
CRF=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --output)
            shift
            OUTPUT="$1"
            ;;
        --quality)
            shift
            QUALITY="$1"
            ;;
        --size)
            shift
            TARGET_SIZE="$1"
            ;;
        --crf)
            shift
            CRF="$1"
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            if [[ -z "$INPUT" ]]; then
                INPUT="$1"
            fi
            ;;
    esac
    shift
done

if [[ -z "$INPUT" ]]; then
    echo "Error: Input file required" >&2
    usage
fi

if [[ ! -f "$INPUT" ]]; then
    echo "Error: File not found: $INPUT" >&2
    exit 1
fi

# Generate output filename
if [[ -z "$OUTPUT" ]]; then
    INPUT_BASE="${INPUT%.*}"
    EXT="${INPUT##*.}"
    OUTPUT="${INPUT_BASE}_compressed.${EXT}"
fi

# Build FFmpeg command
FF_ARGS=(-i "$INPUT" -y -c:v libx264 -c:a aac)

# Determine CRF value
if [[ -n "$TARGET_SIZE" ]]; then
    # Calculate bit rate from target size
    # Get video duration
    DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$INPUT")
    
    # Parse target size
    SIZE_NUM=$(echo "$TARGET_SIZE" | sed 's/[^0-9]//g')
    SIZE_UNIT=$(echo "$TARGET_SIZE" | sed 's/[0-9]//g' | tr '[:lower:]' '[:upper:]')
    
    case "$SIZE_UNIT" in
        MB|MB) TARGET_BYTES=$((SIZE_NUM * 1024 * 1024)) ;;
        GB|GB) TARGET_BYTES=$((SIZE_NUM * 1024 * 1024 * 1024)) ;;
        KB|KB) TARGET_BYTES=$((SIZE_NUM * 1024)) ;;
        *) TARGET_BYTES="$SIZE_NUM" ;;
    esac
    
    # Calculate bitrate (with some buffer for audio)
    # Target bitrate = (target_size * 8 * 0.95) / duration
    BITRATE=$(python3 -c "print(int(($TARGET_BYTES * 8 * 0.9) / float($DURATION) / 1000))")
    
    FF_ARGS+=(-b:v "${BITRATE}k" -bufsize "${BITRATE}k")
    echo "Target size: $TARGET_SIZE (${BITRATE}kbps)"
else
    # Use CRF based on quality
    if [[ -z "$CRF" ]]; then
        case "$QUALITY" in
            low) CRF=28 ;;
            medium) CRF=23 ;;
            high) CRF=18 ;;
            *) CRF=23 ;;
        esac
    fi
    
    FF_ARGS+=(-crf "$CRF" -preset medium)
    echo "Quality: $QUALITY (CRF $CRF)"
fi

FF_ARGS+=("$OUTPUT")

echo "Compressing: $INPUT -> $OUTPUT"
ffmpeg -hide_banner -loglevel error "${FF_ARGS[@]}"

# Show result
ORIG_SIZE=$(du -h "$INPUT" | cut -f1)
NEW_SIZE=$(du -h "$OUTPUT" | cut -f1)
echo "Original: $ORIG_SIZE"
echo "Compressed: $NEW_SIZE"