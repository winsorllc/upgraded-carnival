#!/bin/bash
#
# Local TTS using espeak-ng
# Usage: speak.sh "Text to speak" [options]
# Options:
#   --voice VOICE     Voice to use (default: en)
#   --pitch PITCH     Pitch 0-100 (default: 50)
#   --speed SPEED     Speed in words per minute (default: 175)
#   --output FILE     Save to audio file instead of speaking
#   --help            Show this help
#

TEXT=""
VOICE="en"
PITCH=50
SPEED=175
OUTPUT=""
VERBOSE=0

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --voice)
            VOICE="$2"
            shift 2
            ;;
        --pitch)
            PITCH="$2"
            shift 2
            ;;
        --speed)
            SPEED="$2"
            shift 2
            ;;
        --output)
            OUTPUT="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=1
            shift
            ;;
        --help|-h)
            echo "Usage: speak.sh \"Text to speak\" [options]"
            echo ""
            echo "Options:"
            echo "  --voice VOICE     Voice to use (default: en)"
            echo "  --pitch PITCH     Pitch 0-100 (default: 50)"
            echo "  --speed SPEED     Speed in WPM (default: 175)"
            echo "  --output FILE     Save to audio file instead of speaking"
            echo "  --verbose         Show detailed output"
            echo "  --help, -h        Show this help"
            exit 0
            ;;
        *)
            if [[ -z "$TEXT" ]]; then
                TEXT="$1"
            else
                TEXT="$TEXT $1"
            fi
            shift
            ;;
    esac
done

# Check for text
if [[ -z "$TEXT" ]]; then
    echo "Error: No text provided. Usage: speak.sh \"Hello world\""
    exit 1
fi

# Validate pitch
if [[ "$PITCH" -lt 0 ]] || [[ "$PITCH" -gt 100 ]]; then
    echo "Error: Pitch must be between 0 and 100"
    exit 1
fi

# Validate speed
if [[ "$SPEED" -lt 50 ]] || [[ "$SPEED" -gt 300 ]]; then
    echo "Error: Speed must be between 50 and 300 WPM"
    exit 1
fi

# Check for espeak-ng or espeak
if command -v espeak-ng &> /dev/null; then
    SPEAKER="espeak-ng"
elif command -v espeak &> /dev/null; then
    SPEAKER="espeak"
else
    echo "Error: Neither espeak-ng nor espeak found. Please install one of them:"
    echo "  Debian/Ubuntu: sudo apt install espeak-ng"
    echo "  Alpine: apk add espeak-ng"
    echo "  macOS: brew install espeak-ng"
    exit 1
fi

if [[ $VERBOSE -eq 1 ]]; then
    echo "Using: $SPEAKER"
    echo "Voice: $VOICE"
    echo "Pitch: $PITCH"
    echo "Speed: $SPEED WPM"
    echo "Text: $TEXT"
fi

# Build args as an array
ARGS=("-v" "$VOICE" "-p" "$PITCH" "-s" "$SPEED")

# Add output file or play
if [[ -n "$OUTPUT" ]]; then
    ARGS+=("-w" "$OUTPUT")
    if [[ $VERBOSE -eq 1 ]]; then
        echo "Output file: $OUTPUT"
    fi
else
    # Play directly (use -q for quiet if verbose not set)
    if [[ $VERBOSE -eq 0 ]]; then
        ARGS+=("-q")
    fi
fi

# Add the text as final argument
ARGS+=("$TEXT")

# Execute
if [[ $VERBOSE -eq 1 ]]; then
    echo "Executing: $SPEAKER ${ARGS[*]}"
fi

"$SPEAKER" "${ARGS[@]}"

# Report result
if [[ -n "$OUTPUT" ]]; then
    if [[ -f "$OUTPUT" ]]; then
        if [[ $VERBOSE -eq 1 ]]; then
            echo "Saved audio to: $OUTPUT"
            ls -lh "$OUTPUT"
        fi
        echo "MEDIA:$OUTPUT"
    else
        echo "Error: Failed to create audio file"
        exit 1
    fi
else
    if [[ $VERBOSE -eq 1 ]]; then
        echo "Speech complete"
    fi
fi
