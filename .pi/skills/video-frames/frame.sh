#!/bin/bash
# Extract single frame from video
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: frame.sh <video-file> [options]

Options:
  --time <timestamp>   Extract frame at timestamp (HH:MM:SS or seconds)
  --index <N>          Extract frame by index (0-based)
  --out <path>         Output file path (default: frame-<timestamp>.jpg)
  --width <pixels>     Scale to width (maintains aspect ratio)
  -h, --help           Show this help

Examples:
  frame.sh video.mp4 --out /tmp/frame.jpg
  frame.sh video.mp4 --time 00:00:10 --out /tmp/frame-10s.jpg
  frame.sh video.mp4 --time 5.5 --out /tmp/frame.jpg
  frame.sh video.mp4 --index 100 --out /tmp/frame.jpg
  frame.sh video.mp4 --time 10 --width 640 --out /tmp/thumb.jpg
EOF
    exit 2
}

# Check ffmpeg
if ! command -v ffmpeg &>/dev/null; then
    echo "Error: ffmpeg not installed" >&2
    echo "Install: brew install ffmpeg (macOS) or apt install ffmpeg (Linux)" >&2
    exit 1
fi

# Parse arguments
VIDEO=""
TIME=""
INDEX=""
OUT="frame.jpg"
WIDTH=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --time)
            shift
            TIME="$1"
            ;;
        --index)
            shift
            INDEX="$1"
            ;;
        --out)
            shift
            OUT="$1"
            ;;
        --width)
            shift
            WIDTH="$1"
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            if [[ -z "$VIDEO" ]]; then
                VIDEO="$1"
            fi
            ;;
    esac
    shift
done

if [[ -z "$VIDEO" ]]; then
    echo "Error: Video file required" >&2
    usage
fi

if [[ ! -f "$VIDEO" ]]; then
    echo "Error: File not found: $VIDEO" >&2
    exit 1
fi

# Build ffmpeg command
SCALE_FILTER=""
if [[ -n "$WIDTH" ]]; then
    SCALE_FILTER="-vf scale=${WIDTH}:-2"
fi

mkdir -p "$(dirname "$OUT")"

if [[ -n "$INDEX" ]]; then
    # Extract by frame index
    ffmpeg -hide_banner -loglevel error -y \
        -i "$VIDEO" \
        -vf "select=eq(n\\,${INDEX})" \
        -vframes 1 \
        $SCALE_FILTER \
        "$OUT"
elif [[ -n "$TIME" ]]; then
    # Extract at timestamp
    ffmpeg -hide_banner -loglevel error -y \
        -ss "$TIME" \
        -i "$VIDEO" \
        -frames:v 1 \
        $SCALE_FILTER \
        "$OUT"
else
    # First frame
    ffmpeg -hide_banner -loglevel error -y \
        -i "$VIDEO" \
        -vf "select=eq(n\\,0)" \
        -vframes 1 \
        $SCALE_FILTER \
        "$OUT"
fi

echo "$OUT"