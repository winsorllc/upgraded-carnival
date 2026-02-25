#!/bin/bash
#
# List available espeak-ng voices
# Usage: list-voices.sh
#

# Check for espeak-ng or espeak
if command -v espeak-ng &> /dev/null; then
    SPEAKER="espeak-ng"
elif command -v espeak &> /dev/null; then
    SPEAKER="espeak"
else
    echo "Error: Neither espeak-ng nor espeak found. Please install one of them:"
    echo "  Debian/Ubuntu: sudo apt install espeak-ng"
    exit 1
fi

echo "Available voices for $SPEAKER:"
echo ""
echo "Language/Region Voices:"
echo "----------------------"

# List voices - espeak-ng uses --voices or --voices-path
if [[ "$SPEAKER" == "espeak-ng" ]]; then
    $SPEAKER --voices | head -50
else
    $SPEAKER --help 2>&1 | grep -A 20 "voices"
fi

echo ""
echo "Common voices to try:"
echo "  en        - English (default)"
echo "  en-us     - US English"
echo "  en-gb     - British English"
echo "  en-au     - Australian English"
echo "  en-sc     - Scottish English"
echo "  es        - Spanish"
echo "  fr        - French"
echo "  de        - German"
echo "  it        - Italian"
echo "  nl        - Dutch"
echo "  pl        - Polish"
echo "  ru        - Russian"
echo "  zh        - Chinese"
echo "  ja        - Japanese"
echo "  ko        - Korean"
echo "  hi        - Hindi"
echo ""
echo "Example usage:"
echo "  speak.sh \"Hello\" --voice en-us"
echo "  speak.sh \"Bonjour\" --voice fr"
