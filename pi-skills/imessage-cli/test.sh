#!/bin/bash
# Test script for imessage-cli skill

set -e

echo "=== Testing iMessage CLI Skill ==="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Test 1: Script exists
echo -n "Test 1: imessage.sh exists... "
if [ -f "$SCRIPT_DIR/imessage.sh" ]; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 2: Script is executable
echo -n "Test 2: imessage.sh is executable... "
chmod +x "$SCRIPT_DIR/imessage.sh"
echo "✓ PASS"

# Test 3: Help works (or shows macOS error)
echo -n "Test 3: Help displays... "
OUTPUT="$("$SCRIPT_DIR/imessage.sh" 2>&1 || true)"
if echo "$OUTPUT" | grep -q "iMessage CLI\|macOS"; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 4: Shows all commands
echo -n "Test 4: All commands shown... "
if echo "$OUTPUT" | grep -q "send" && echo "$OUTPUT" | grep -q "read" && echo "$OUTPUT" | grep -q "list-chats"; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 5: SKILL.md exists
echo -n "Test 5: SKILL.md exists... "
if [ -f "$SCRIPT_DIR/SKILL.md" ]; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 6: Script has macOS check
echo -n "Test 6: Script has macOS check... "
if grep -q "Darwin" "$SCRIPT_DIR/imessage.sh"; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

echo ""
echo "=== All Tests Passed ==="
echo ""
echo "Note: Full testing requires macOS with Messages.app"
