#!/bin/bash
# Create animated GIF from video
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: gif.sh <video-file> [options]

Options:
  --start <time>       Start time (HH:MM:SS or seconds) (default: 0)
  --duration <sec>     Duration in seconds (default: 5)
  --fps <N>            Frames per second (default: 10)
  --width <pixels>     Width in pixels (default: 480)
  --out <path>         Output file path (default: output.gif)
  -h, --help           Show this help

Examples:
  gif.sh video.mp4
  gif.sh video.mp4 --start 00:00:10 --duration 3 --out /tmp/clip.gif
  gif.sh video.mp4 --start 5 --duration 2 --fps 15 --width 640
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
START="0"
DURATION="5"
FPS="10"
WIDTH="480"
OUT="output.gif"

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --start)
            shift
            START="$1"
            ;;
        --duration)
            shift
            DURATION="$1"
            ;;
        --fps)
            shift
            FPS="$1"
            ;;
        --width)
            shift
            WIDTH="$1"
            ;;
        --out)
            shift
            OUT="$1"
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

mkdir -p "$(dirname "$OUT")"

# Create GIF with palette for better quality
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Generate palette for better quality
ffmpeg -hide_banner -loglevel error -y \
    -ss "$START" \
    -t "$DURATION" \
    -i "$VIDEO" \
    -vf "fps=$FPS,scale=${WIDTH}:-2:flags=lanczos,palettegen" \
    "$TMPDIR/palette.png"

# Create GIF using palette
ffmpeg -hide_banner -loglevel error -y \
    -ss "$START" \
    -t "$DURATION" \
    -i "$VIDEO" \
    -i "$TMPDIR/palette.png" \
    -lavfi "fps=$FPS,scale=${WIDTH}:-2:flags=lanczos[x];[x][1:v]paletteuse" \
    "$OUT"

echo "$OUT"