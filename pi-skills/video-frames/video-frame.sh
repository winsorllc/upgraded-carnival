#!/bin/bash
# Video Frame - Extract a single frame from video
# Usage: video-frame.sh <video> [options]

VIDEO="$1"
shift || true

TIME=""
OUTPUT="frame.jpg"
QUALITY=2

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --time)
            TIME="$2"
            shift 2
            ;;
        --output)
            OUTPUT="$2"
            shift 2
            ;;
        --quality)
            QUALITY="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

if [ -z "$VIDEO" ]; then
    echo "Usage: video-frame.sh <video> [options]"
    echo "  --time TIMESTAMP   Time position (seconds or HH:MM:SS)"
    echo "  --output FILE     Output file (default: frame.jpg)"
    echo "  --quality N       JPEG quality 1-31 (default: 2)"
    exit 1
fi

if [ ! -f "$VIDEO" ]; then
    echo "Error: Video file not found: $VIDEO"
    exit 1
fi

# Check for ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "Error: ffmpeg not found. Install: brew install ffmpeg"
    exit 1
fi

# Build command - seek then extract
FFMPEG_CMD="ffmpeg -y"
[ -n "$TIME" ] && FFMPEG_CMD="$FFMPEG_CMD -ss $TIME"
FFMPEG_CMD="$FFMPEG_CMD -i \"$VIDEO\" -vframes 1 -q:v $QUALITY \"$OUTPUT\""

echo "Extracting frame at $TIME from $VIDEO..."
eval $FFMPEG_CMD

if [ -f "$OUTPUT" ]; then
    echo "✅ Frame saved to: $OUTPUT"
else
    echo "❌ Failed to extract frame"
    exit 1
fi
