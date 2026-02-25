#!/bin/bash
# Test script for summarize skill

echo "=== Summarize Skill Test ==="
echo ""

# Test 1: Summarize a URL
echo "Test 1: Summarize a URL"
RESULT=$(bash /job/pi-skills/summarize/summarize.sh "https://example.com" 2>&1)
echo "Result (first 200 chars): ${RESULT:0:200}"
if echo "$RESULT" | grep -q -i "webpage\|title\|content"; then
    echo "✅ PASS: Successfully processed URL"
else
    echo "❌ FAIL: Could not process URL"
    exit 1
fi

echo ""

# Test 2: Extract only mode
echo "Test 2: Extract only mode"
RESULT=$(bash /job/pi-skills/summarize/summarize.sh "https://example.com" --extract-only 2>&1)
echo "Result (first 200 chars): ${RESULT:0:200}"
if echo "$RESULT" | grep -q -i "extracted\|content"; then
    echo "✅ PASS: Extract only mode works"
else
    echo "❌ FAIL: Extract only mode failed"
    exit 1
fi

echo ""

# Test 3: Local file (create temp file)
echo "Test 3: Local file handling"
echo "This is a test document with some content for summarization." > /tmp/test_summarize.txt
RESULT=$(bash /job/pi-skills/summarize/summarize.sh "/tmp/test_summarize.txt" 2>&1)
echo "Result: $RESULT"
if echo "$RESULT" | grep -q -i "file\|test document"; then
    echo "✅ PASS: Local file handling works"
else
    echo "❌ FAIL: Local file handling failed"
    exit 1
fi

echo ""

# Test 4: Non-existent file (should error gracefully)
echo "Test 4: Non-existent file (error handling)"
RESULT=$(bash /job/pi-skills/summarize/summarize.sh "/nonexistent/file.txt" 2>&1 || true)
echo "Result: $RESULT"
if echo "$RESULT" | grep -q "Error"; then
    echo "✅ PASS: Error handling works"
else
    echo "❌ FAIL: Should error on non-existent file"
    exit 1
fi

echo ""

# Test 5: No input (should show usage)
echo "Test 5: No input (usage)"
RESULT=$(bash /job/pi-skills/summarize/summarize.sh 2>&1 || true)
echo "Result: $RESULT"
if echo "$RESULT" | grep -q "Usage"; then
    echo "✅ PASS: Shows usage when no input"
else
    echo "❌ FAIL: Should show usage"
    exit 1
fi

echo ""
echo "=== All Summarize Tests Passed! ==="
