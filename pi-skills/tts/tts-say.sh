#!/bin/bash
# TTS Say - Text-to-Speech using say command (macOS) or festival/espeak (Linux)
# Usage: tts-say.sh <text> [options]

TEXT="$1"
shift || true

# Default options
VOICE=""
RATE=""
OUTPUT_FILE=""

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --voice)
            VOICE="$2"
            shift 2
            ;;
        --rate)
            RATE="$2"
            shift 2
            ;;
        --output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

if [ -z "$TEXT" ]; then
    echo "Usage: tts-say.sh <text> [options]"
    echo "  --voice NAME     Select voice"
    echo "  --rate N         Speaking rate"
    echo "  --output FILE    Save to audio file"
    exit 1
fi

# Build command
CMD=""

if command -v say &> /dev/null; then
    # macOS - use say command
    CMD="say"
    [ -n "$VOICE" ] && CMD="$CMD -v $VOICE"
    [ -n "$RATE" ] && CMD="$CMD -r $RATE"
    [ -n "$OUTPUT_FILE" ] && CMD="$CMD -o ${OUTPUT_FILE%.mp3}"
    CMD="$CMD \"$TEXT\""
    
elif command -v espeak &> /dev/null; then
    # Linux - use espeak
    CMD="espeak"
    [ -n "$VOICE" ] && CMD="$CMD -v $VOICE"
    [ -n "$RATE" ] && CMD="$CMD -s $RATE"
    [ -n "$OUTPUT_FILE" ] && CMD="$CMD -w $OUTPUT_FILE"
    CMD="$CMD \"$TEXT\""
    
elif command -v festival &> /dev/null; then
    # Linux - use festival
    CMD="festival -b \"(SayText \\\"$TEXT\\\")\""
    
else
    echo "Error: No TTS engine found. Install espeak (Linux) or use macOS."
    exit 1
fi

# Execute
eval $CMD

if [ -n "$OUTPUT_FILE" ]; then
    if [ -f "$OUTPUT_FILE" ] || [ -f "${OUTPUT_FILE%.mp3}" ]; then
        echo "Audio saved to: $OUTPUT_FILE"
    else
        echo "Error: Failed to create audio file"
        exit 1
    fi
else
    echo "Spoken: $TEXT"
fi
