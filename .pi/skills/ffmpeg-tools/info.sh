#!/bin/bash
# FFmpeg media info tool
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: info.sh <file> [options]

Options:
  --json             Output as JSON
  -h, --help         Show this help

Examples:
  info.sh video.mp4
  info.sh audio.mp3 --json
EOF
    exit 2
}

# Check for ffprobe
if ! command -v ffprobe &>/dev/null; then
    echo "Error: ffprobe not installed" >&2
    echo "Install: brew install ffmpeg (macOS) or apt install ffmpeg (Linux)" >&2
    exit 1
fi

# Default values
FILE=""
JSON=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --json)
            JSON=true
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            if [[ -z "$FILE" ]]; then
                FILE="$1"
            fi
            ;;
    esac
    shift
done

if [[ -z "$FILE" ]]; then
    echo "Error: File required" >&2
    usage
fi

if [[ ! -f "$FILE" ]]; then
    echo "Error: File not found: $FILE" >&2
    exit 1
fi

if [[ "$JSON" == "true" ]]; then
    ffprobe -v error -print_format json -show_format -show_streams "$FILE"
else
    echo "File: $FILE"
    echo ""
    
    # Get format info
    FORMAT=$(ffprobe -v error -show_entries format=format_name,duration,size,bit_rate -of default=noprint_wrappers=1 "$FILE")
    
    # Get video info
    VIDEO=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,duration,bit_rate -of default=noprint_wrappers=1 "$FILE" 2>/dev/null || echo "")
    
    # Get audio info
    AUDIO=$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels,bit_rate -of default=noprint_wrappers=1 "$FILE" 2>/dev/null || echo "")
    
    # Get duration
    DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$FILE")
    DURATION_FORMATTED=$(python3 -c "
seconds = float('$DURATION' or 0)
hours = int(seconds // 3600)
minutes = int((seconds % 3600) // 60)
secs = int(seconds % 60)
print(f'{hours:02d}:{minutes:02d}:{secs:02d}')
" 2>/dev/null || echo "$DURATION")
    
    # Get file size
    SIZE=$(du -h "$FILE" | cut -f1)
    
    # Get bitrate
    BITRATE=$(ffprobe -v error -show_entries format=bit_rate -of default=noprint_wrappers=1:nokey=1 "$FILE")
    if [[ -n "$BITRATE" ]] && [[ "$BITRATE" != "N/A" ]]; then
        BITRATE_FORMATTED=$(python3 -c "
bitrate = int('$BITRATE' or 0)
if bitrate >= 1000000:
    print(f'{bitrate/1000000:.1f} Mbps')
elif bitrate >= 1000:
    print(f'{bitrate/1000:.0f} kbps')
else:
    print(f'{bitrate} bps')
" 2>/dev/null || echo "$BITRATE bps")
    else
        BITRATE_FORMATTED="N/A"
    fi
    
    # Print info
    echo "Duration: $DURATION_FORMATTED"
    echo "Size: $SIZE"
    echo "Bitrate: $BITRATE_FORMATTED"
    
    if [[ -n "$VIDEO" ]]; then
        echo ""
        echo "Video:"
        CODEC=$(echo "$VIDEO" | grep codec_name= | cut -d= -f2)
        WIDTH=$(echo "$VIDEO" | grep width= | cut -d= -f2)
        HEIGHT=$(echo "$VIDEO" | grep height= | cut -d= -f2)
        FPS=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of default=noprint_wrappers=1:nokey=1 "$FILE")
        
        echo "  Codec: ${CODEC:-N/A}"
        if [[ -n "$WIDTH" ]] && [[ -n "$HEIGHT" ]]; then
            echo "  Resolution: ${WIDTH}x${HEIGHT}"
        fi
        if [[ -n "$FPS" ]]; then
            FPS_FORMATTED=$(python3 -c "
fps = '$FPS'
if '/' in fps:
    num, den = fps.split('/')
    print(f'{int(num)/int(den):.2f}')
else:
    print(fps)
" 2>/dev/null || echo "$FPS")
            echo "  Frame Rate: ${FPS_FORMATTED} fps"
        fi
    fi
    
    if [[ -n "$AUDIO" ]]; then
        echo ""
        echo "Audio:"
        CODEC=$(echo "$AUDIO" | grep codec_name= | cut -d= -f2)
        SAMPLE_RATE=$(echo "$AUDIO" | grep sample_rate= | cut -d= -f2)
        CHANNELS=$(echo "$AUDIO" | grep channels= | cut -d= -f2)
        
        echo "  Codec: ${CODEC:-N/A}"
        if [[ -n "$SAMPLE_RATE" ]]; then
            echo "  Sample Rate: ${SAMPLE_RATE} Hz"
        fi
        if [[ -n "$CHANNELS" ]]; then
            CHANNEL_NAME=$(python3 -c "
channels = int('$CHANNELS' or 0)
names = {1: 'Mono', 2: 'Stereo', 6: '5.1', 8: '7.1'}
print(names.get(channels, f'{channels} channels'))
" 2>/dev/null || echo "${CHANNELS} channels")
            echo "  Channels: $CHANNEL_NAME"
        fi
    fi
fi