#!/bin/bash
# Voice output using system TTS (say on macOS, espeak on Linux)
# Supports output to file for headless environments

TEXT="$1"
OUTPUT_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output|-o)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        *)
            TEXT="$1"
            shift
            ;;
    esac
done

if [ -z "$TEXT" ]; then
    echo "Usage: speak.sh \"Text to speak\" [--output file.wav]"
    exit 1
fi

# Check for macOS say command
if command -v say &> /dev/null; then
    if [ -n "$OUTPUT_FILE" ]; then
        say -o "$OUTPUT_FILE" "$TEXT"
    else
        say "$TEXT"
    fi
    echo "Spoke (macOS say): $TEXT"
# Check for Linux espeak
elif command -v espeak &> /dev/null; then
    if [ -n "$OUTPUT_FILE" ]; then
        # espeak can output to WAV
        espeak -w "$OUTPUT_FILE" "$TEXT" 2>/dev/null
    else
        espeak "$TEXT" 2>/dev/null
    fi
    echo "Spoke (espeak): $TEXT"
# Check for festival
elif command -v festival &> /dev/null; then
    echo "$TEXT" | festival --tts
    echo "Spoke (festival): $TEXT"
# No TTS available
else
    echo "ERROR: No TTS engine found. Install 'say' (macOS) or 'espeak' (Linux: sudo apt install espeak)"
    exit 1
fi
