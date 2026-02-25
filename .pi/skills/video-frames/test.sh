#!/bin/bash
# Test script for video-frames skill

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Video Frames Skill Test ==="

# Check if ffmpeg is available
if ! command -v ffmpeg &> /dev/null; then
    echo "SKIP: ffmpeg not installed"
    exit 0
fi

# Create a test video file (1 second, 5 fps)
TEST_VIDEO="/tmp/test_video_$$.mp4"
echo "Creating test video..."
ffmpeg -y -f lavfi -i testsrc=duration=1:size=320x240:rate=5 \
    -c:v libx264 -pix_fmt yuv420p "$TEST_VIDEO" 2>/dev/null

echo "Test video created: $TEST_VIDEO"

# Test 1: Extract single frame
echo ""
echo "Test 1: Extract single frame at 0.5 seconds"
OUTPUT1="/tmp/test_frame_$$_1.jpg"
bash "$SCRIPT_DIR/extract-frame.sh" "$TEST_VIDEO" \
    --timestamp 0.5 \
    --output "$OUTPUT1"

if [ -f "$OUTPUT1" ]; then
    echo "PASS: Single frame extracted successfully"
    ls -la "$OUTPUT1"
else
    echo "FAIL: Frame not created"
    exit 1
fi

# Test 2: Extract multiple frames
echo ""
echo "Test 2: Extract multiple frames"
OUTPUT_DIR="/tmp/test_frames_$$"
mkdir -p "$OUTPUT_DIR"
bash "$SCRIPT_DIR/extract-frame.sh" "$TEST_VIDEO" \
    --timestamps "0.2,0.5,0.8" \
    --output-dir "$OUTPUT_DIR"

frame_count=$(ls -1 "$OUTPUT_DIR"/*.jpg 2>/dev/null | wc -l)
if [ "$frame_count" -eq 3 ]; then
    echo "PASS: Multiple frames extracted (count: $frame_count)"
    ls -la "$OUTPUT_DIR"
else
    echo "FAIL: Expected 3 frames, got $frame_count"
    exit 1
fi

# Cleanup
rm -f "$TEST_VIDEO"
rm -f "$OUTPUT1"
rm -rf "$OUTPUT_DIR"

echo ""
echo "=== All Tests Passed ==="
