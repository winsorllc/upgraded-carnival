#!/bin/bash
# STT Transcribe - Speech-to-Text using Whisper
# Usage: stt-transcribe.sh <audio_file> [options]

AUDIO_FILE="$1"
shift || true

# Default options
MODEL="base"
LANGUAGE=""
OUTPUT_FORMAT="txt"

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --model)
            MODEL="$2"
            shift 2
            ;;
        --language)
            LANGUAGE="$2"
            shift 2
            ;;
        --output)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

if [ -z "$AUDIO_FILE" ]; then
    echo "Usage: stt-transcribe.sh <audio_file> [options]"
    echo "  --model SIZE      Model: tiny, base, small, medium, large"
    echo "  --language LANG   Language code (en, es, fr, etc.)"
    echo "  --output FORMAT   Output: txt, json, srt, vtt"
    exit 1
fi

if [ ! -f "$AUDIO_FILE" ]; then
    echo "Error: Audio file not found: $AUDIO_FILE"
    exit 1
fi

# Check for whisper.cpp
if command -v whisper &> /dev/null; then
    CMD="whisper"
elif command -v whisper-cpp &> /dev/null; then
    CMD="whisper-cpp"
elif command -v whisper.cpp &> /dev/null; then
    CMD="whisper.cpp"
else
    echo "Error: whisper not found. Install whisper.cpp or Python whisper."
    echo "  whisper.cpp: https://github.com/ggerganov/whisper.cpp"
    echo "  Python: pip install openai-whisper"
    exit 1
fi

# Build command
if [ "$CMD" = "whisper" ]; then
    # Python whisper
    CMD="whisper"
    [ -n "$LANGUAGE" ] && CMD="$CMD --language $LANGUAGE"
    CMD="$CMD --model $MODEL"
    CMD="$CMD --output_format $OUTPUT_FORMAT"
    CMD="$CMD \"$AUDIO_FILE\""
else
    # whisper.cpp
    if command -v whisper-cpp &> /dev/null; then
        CMD="whisper-cpp -m models/ggml-${MODEL}.bin -f"
    else
        CMD="$CMD -m models/ggml-${MODEL}.bin -f"
    fi
    [ -n "$LANGUAGE" ] && CMD="$CMD -l $LANGUAGE"
    
    # Output format
    case "$OUTPUT_FORMAT" in
        json) CMD="$CMD --json" ;;
        srt) CMD="$CMD --srt" ;;
        vtt) CMD="$CMD --vtt" ;;
        *) CMD="$CMD --txt" ;;
    esac
    
    CMD="$CMD \"$AUDIO_FILE\""
fi

echo "Running: $CMD"
eval $CMD

if [ $? -eq 0 ]; then
    echo "Transcription complete"
else
    echo "Transcription failed"
    exit 1
fi
