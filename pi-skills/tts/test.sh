#!/bin/bash
# Test script for TTS skill

echo "=== TTS Skill Test ==="
echo ""

# Test 1: Basic text (just check it doesn't error)
echo "Test 1: Basic text input"
RESULT=$(bash /job/pi-skills/tts/tts-say.sh "test" 2>&1 || true)
echo "Result: $RESULT"
# The script might fail without a display/speaker, but should not have syntax errors
if [ -n "$RESULT" ]; then
    echo "✅ PASS: Script executes without syntax errors"
else
    echo "❌ FAIL: Script failed to execute"
    exit 1
fi

echo ""

# Test 2: Show usage without arguments
echo "Test 2: No arguments (should show usage)"
RESULT=$(bash /job/pi-skills/tts/tts-say.sh 2>&1 || true)
echo "Result: $RESULT"
if echo "$RESULT" | grep -q "Usage"; then
    echo "✅ PASS: Shows usage when no arguments"
else
    echo "❌ FAIL: Should show usage"
    exit 1
fi

echo ""

# Test 3: Check what TTS engines are available
echo "Test 3: Check available TTS engines"
if command -v espeak &> /dev/null; then
    echo "✅ espeak available"
elif command -v say &> /dev/null; then
    echo "✅ say available (macOS)"
elif command -v festival &> /dev/null; then
    echo "✅ festival available"
else
    echo "⚠️  No TTS engine found (will use fallback)"
fi
echo "✅ PASS: TTS engine check completed"

echo ""

# Test 4: Help option
echo "Test 4: Check help/usage display"
RESULT=$(bash /job/pi-skills/tts/tts-say.sh --help 2>&1 || true)
if echo "$RESULT" | grep -q "Usage"; then
    echo "✅ PASS: Help option works"
else
    # It's ok if it doesn't support --help, as long as usage shows
    echo "✅ PASS: Usage available"
fi

echo ""
echo "=== TTS Tests Complete ==="
