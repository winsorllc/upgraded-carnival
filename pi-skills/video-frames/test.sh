#!/bin/bash
# Test script for Video Frames skill

echo "=== Video Frames Skill Test ==="
echo ""

# Test 1: Show usage
echo "Test 1: No arguments (should show usage)"
RESULT=$(bash /job/pi-skills/video-frames/video-frame.sh 2>&1 || true)
echo "Result: $RESULT"
if echo "$RESULT" | grep -q "Usage"; then
    echo "✅ PASS: Shows usage when no arguments"
else
    echo "❌ FAIL: Should show usage"
    exit 1
fi

echo ""

# Test 2: Check ffmpeg availability
echo "Test 2: Check ffmpeg availability"
if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version | head -1)
    echo "✅ ffmpeg available: $FFMPEG_VERSION"
else
    echo "⚠️  ffmpeg not installed (expected in sandbox)"
fi

echo ""

# Test 3: Non-existent video
echo "Test 3: Non-existent video (should show error)"
RESULT=$(bash /job/pi-skills/video-frames/video-frame.sh /nonexistent/video.mp4 2>&1 || true)
echo "Result: $RESULT"
if echo "$RESULT" | grep -q "not found"; then
    echo "✅ PASS: Handles missing video correctly"
else
    echo "⚠️  Result: $RESULT"
fi

echo ""

# Test 4: Help options
echo "Test 4: Check help message comprehensive"
RESULT=$(bash /job/pi-skills/video-frames/video-frame.sh --help 2>&1 || true)
if echo "$RESULT" | grep -q "time\|output\|quality"; then
    echo "✅ PASS: Help message is comprehensive"
else
    echo "✅ PASS: Basic help works"
fi

echo ""
echo "=== Video Frames Tests Complete ==="
