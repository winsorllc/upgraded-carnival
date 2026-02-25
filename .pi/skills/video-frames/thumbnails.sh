#!/bin/bash
# Create thumbnail grid from video
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: thumbnails.sh <video-file> [options]

Options:
  --count <N>          Number of thumbnails (default: 12)
  --out <path>         Output file path (default: thumbnails.jpg)
  --width <pixels>     Thumbnail width (default: 200)
  --cols <N>           Number of columns (default: auto)
  -h, --help           Show this help

Examples:
  thumbnails.sh video.mp4
  thumbnails.sh video.mp4 --count 16 --out /tmp/grid.jpg
  thumbnails.sh video.mp4 --count 8 --width 300 --cols 4
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
COUNT=12
OUT="thumbnails.jpg"
WIDTH=200
COLS=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --count)
            shift
            COUNT="$1"
            ;;
        --out)
            shift
            OUT="$1"
            ;;
        --width)
            shift
            WIDTH="$1"
            ;;
        --cols)
            shift
            COLS="$1"
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

# Get video duration
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO")

if [[ -z "$DURATION" ]]; then
    echo "Error: Could not determine video duration" >&2
    exit 1
fi

# Calculate interval between thumbnails
INTERVAL=$(python3 -c "print($DURATION / ($COUNT + 1))")

# Generate thumbnails
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

for i in $(seq 1 $COUNT); do
    TIMESTAMP=$(python3 -c "print($INTERVAL * $i)")
    ffmpeg -hide_banner -loglevel error -y \
        -ss "$TIMESTAMP" \
        -i "$VIDEO" \
        -frames:v 1 \
        -vf "scale=${WIDTH}:-2" \
        "$TMPDIR/thumb_$(printf '%03d' $i).jpg"
done

# Create grid
if [[ -n "$COLS" ]]; then
    # Use specified columns
    COLS_ARG="-tile ${COLS}x"
else
    # Auto-calculate columns (roughly square grid)
    COLS=$(python3 -c "import math; print(int(math.sqrt($COUNT)))")
    COLS_ARG="-tile ${COLS}x"
fi

# Use ImageMagick montage or ffmpeg tile filter
if command -v montage &>/dev/null; then
    montage "$TMPDIR"/*.jpg -geometry +2+2 -background black $OUT
    echo "$OUT"
else
    # Fallback: create HTML grid
    echo "ImageMagick not installed, creating HTML grid"
    HTML="$OUT.html"
    cat > "$HTML" << HTMLEOF
<!DOCTYPE html>
<html>
<head><title>Thumbnails</title></head>
<body style="background:#111;display:flex;flex-wrap:wrap;gap:8px;padding:10px">
HTMLEOF
    for f in "$TMPDIR"/*.jpg; do
        B64=$(base64 < "$f")
        echo "<img src='data:image/jpeg;base64,$B64' style='width:${WIDTH}px'>" >> "$HTML"
    done
    echo "</body></html>" >> "$HTML"
    echo "$HTML"
fi