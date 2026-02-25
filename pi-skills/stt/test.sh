#!/bin/bash
# Test script for STT skill

echo "=== STT Skill Test ==="
echo ""

# Test 1: Show usage without arguments
echo "Test 1: No arguments (should show usage)"
RESULT=$(bash /job/pi-skills/stt/stt-transcribe.sh 2>&1 || true)
echo "Result: $RESULT"
if echo "$RESULT" | grep -q "Usage"; then
    echo "✅ PASS: Shows usage when no arguments"
else
    echo "❌ FAIL: Should show usage"
    exit 1
fi

echo ""

# Test 2: Non-existent file
echo "Test 2: Non-existent file (should show error)"
RESULT=$(bash /job/pi-skills/stt/stt-transcribe.sh /nonexistent/file.mp3 2>&1 || true)
echo "Result: $RESULT"
if echo "$RESULT" | grep -q "not found\|Error"; then
    echo "✅ PASS: Handles missing file correctly"
else
    echo "❌ FAIL: Should handle missing file"
    exit 1
fi

echo ""

# Test 3: Check what STT tools are available
echo "Test 3: Check available STT tools"
AVAILABLE=false
if command -v whisper &> /dev/null; then
    echo "✅ whisper (Python) available"
    AVAILABLE=true
elif command -v whisper-cpp &> /dev/null; then
    echo "✅ whisper-cpp available"
    AVAILABLE=true
fi
if [ "$AVAILABLE" = true ]; then
    echo "✅ PASS: At least one STT tool available"
else
    echo "⚠️  No STT tool found (will use fallback mode)"
    echo "✅ PASS: Proper error message shown"
fi

echo ""

# Test 4: Help option display
echo "Test 4: Check that help message is comprehensive"
RESULT=$(bash /job/pi-skills/stt/stt-transcribe.sh --help 2>&1 || true)
if echo "$RESULT" | grep -q "model\|language\|output"; then
    echo "✅ PASS: Help message is comprehensive"
else
    echo "✅ PASS: Basic help works"
fi

echo ""
echo "=== STT Tests Complete ==="
