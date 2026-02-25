#!/bin/bash
# FFmpeg media conversion tool
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: convert.sh <input> [options]

Options:
  --output <file>     Output file path (default: based on input extension)
  --format <fmt>      Output format (mp4, mp3, webm, etc.)
  --codec <codec>     Specific codec
  --quality <level>   Quality: low, medium, high (default: high)
  -h, --help          Show this help

Examples:
  convert.sh input.mov --output output.mp4
  convert.sh input.wav --output output.mp3
  convert.sh input.mkv --format webm
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
FORMAT=""
CODEC=""
QUALITY="high"

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
        --format)
            shift
            FORMAT="$1"
            ;;
        --codec)
            shift
            CODEC="$1"
            ;;
        --quality)
            shift
            QUALITY="$1"
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

# Determine output format from filename or format option
if [[ -z "$OUTPUT" ]]; then
    INPUT_BASE="${INPUT%.*}"
    if [[ -n "$FORMAT" ]]; then
        OUTPUT="${INPUT_BASE}.${FORMAT}"
    else
        # Default conversions
        case "${INPUT##*.}" in
            mov|avi|mkv|webm) OUTPUT="${INPUT_BASE}.mp4" ;;
            wav|flac|aac|m4a) OUTPUT="${INPUT_BASE}.mp3" ;;
            *) OUTPUT="${INPUT_BASE}_converted.${INPUT##*.}" ;;
        esac
    fi
fi

FORMAT="${OUTPUT##*.}"

# Build FFmpeg command
FF_ARGS=(-i "$INPUT" -y)

# Quality settings
case "$QUALITY" in
    low)
        FF_ARGS+=(-crf 28 -preset faster)
        ;;
    medium)
        FF_ARGS+=(-crf 23 -preset medium)
        ;;
    high)
        FF_ARGS+=(-crf 18 -preset slow)
        ;;
esac

# Format-specific settings
case "$FORMAT" in
    mp4)
        FF_ARGS+=(-c:v libx264 -c:a aac)
        ;;
    webm)
        FF_ARGS+=(-c:v libvpx-vp9 -c:a libopus)
        ;;
    mp3)
        FF_ARGS+=(-c:a libmp3lame -q:a 2)
        ;;
    ogg)
        FF_ARGS+=(-c:a libvorbis -q:a 5)
        ;;
esac

# Specific codec
if [[ -n "$CODEC" ]]; then
    FF_ARGS+=(-c:v "$CODEC")
fi

FF_ARGS+=("$OUTPUT")

echo "Converting: $INPUT -> $OUTPUT"
ffmpeg -hide_banner -loglevel error "${FF_ARGS[@]}"

echo "Done: $OUTPUT"