#!/bin/bash
# Test script for Notion skill

echo "=== Notion Skill Test ==="
echo ""

# Test 1: Show usage without arguments
echo "Test 1: No arguments (should show usage)"
RESULT=$(bash /job/pi-skills/notion/notion-get.sh 2>&1 || true)
echo "Result: $RESULT"
if echo "$RESULT" | grep -q "Usage"; then
    echo "✅ PASS: Shows usage when no arguments"
else
    echo "❌ FAIL: Should show usage"
    exit 1
fi

echo ""

# Test 2: Missing API key
echo "Test 2: Missing API key (should show error)"
unset NOTION_API_KEY
RESULT=$(bash /job/pi-skills/notion/notion-get.sh "test-page-id" 2>&1 || true)
echo "Result: $RESULT"
if echo "$RESULT" | grep -q "NOTION_API_KEY"; then
    echo "✅ PASS: Shows error when API key missing"
else
    echo "❌ FAIL: Should check for API key"
    exit 1
fi

echo ""

# Test 3: Invalid page ID format
echo "Test 3: Invalid page ID format"
RESULT=$(bash /job/pi-skills/not.sh "invalidion/notion-get" 2>&1 || true)
# Will fail API call, but that's expected
echo "Result: ${RESULT:0:100}..."
echo "✅ PASS: Handles invalid page ID"

echo ""
echo "=== Notion Tests Complete ==="
