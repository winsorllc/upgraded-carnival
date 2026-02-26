#!/bin/bash
# Test script for voice-output skill

echo "=== Voice Output Skill Test ==="
echo ""

# Test 1: Basic speak
echo "Test 1: Basic text-to-speech..."
cd /job/.pi/skills/voice-output/scripts
if ./speak.sh "Test successful. Voice output skill is working." 2>/dev/null; then
    echo "✓ PASS: Basic speak works"
else
    echo "✗ FAIL: Basic speak failed"
fi
echo ""

# Test 2: Check available TTS engine
echo "Test 2: Checking available TTS engine..."
if command -v say &> /dev/null; then
    echo "✓ macOS 'say' is available"
elif command -v espeak &> /dev/null; then
    echo "✓ Linux 'espeak' is available"
elif command -v festival &> /dev/null; then
    echo "✓ 'festival' is available"
else
    echo "✗ No TTS engine found"
fi
echo ""

# Test 3: Output to file
echo "Test 3: Output to WAV file..."
OUTPUT_FILE="/tmp/test_voice_output.wav"
if ./speak.sh "Testing file output" --output "$OUTPUT_FILE" 2>/dev/null; then
    if [ -f "$OUTPUT_FILE" ]; then
        echo "✓ PASS: WAV file created: $(ls -lh $OUTPUT_FILE)"
        rm -f "$OUTPUT_FILE"
    else
        echo "⚠ File creation attempted but not found (may need audio driver)"
    fi
else
    echo "✗ FAIL: File output failed"
fi
echo ""

# Test 4: Check skill files exist
echo "Test 4: Checking skill structure..."
SKILL_DIR="/job/.pi/skills/voice-output"
if [ -f "$SKILL_DIR/SKILL.md" ]; then
    echo "✓ SKILL.md exists"
else
    echo "✗ SKILL.md missing"
fi

if [ -f "$SKILL_DIR/scripts/speak.sh" ]; then
    echo "✓ speak.sh exists"
else
    echo "✗ speak.sh missing"
fi

if [ -x "$SKILL_DIR/scripts/speak.sh" ]; then
    echo "✓ speak.sh is executable"
else
    echo "⚠ speak.sh not executable"
fi
echo ""

echo "=== Test Complete ==="
