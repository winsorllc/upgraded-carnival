#!/bin/bash
# Test script for webhook-receiver skill

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Testing webhook-receiver skill ==="
echo ""

# Test 1: Check script is accessible
echo "Test 1: Checking script is accessible..."
if [ -r "$SKILL_DIR/scripts/webhook-receiver.sh" ]; then
    echo "✓ Script is accessible"
else
    echo "✗ Script is not accessible"
    exit 1
fi

# Test 2: Test help command
echo ""
echo "Test 2: Testing help command..."
output=$(bash "$SKILL_DIR/scripts/webhook-receiver.sh" help 2>&1)
if echo "$output" | grep -q "Webhook"; then
    echo "✓ Help command works"
else
    echo "✗ Help command failed"
    exit 1
fi

# Test 3: Check network tools
echo ""
echo "Test 3: Checking network tools..."
if command -v nc &> /dev/null || command -v python3 &> /dev/null; then
    echo "✓ Network tools available (nc or python3)"
else
    echo "⚠ Neither nc nor python3 available"
fi

# Test 4: SKILL.md check
echo ""
echo "Test 4: Checking SKILL.md..."
if [ -f "$SKILL_DIR/SKILL.md" ]; then
    if grep -q "name: webhook-receiver" "$SKILL_DIR/SKILL.md"; then
        echo "✓ SKILL.md exists with correct name"
    else
        echo "✗ SKILL.md missing name field"
        exit 1
    fi
else
    echo "✗ SKILL.md not found"
    exit 1
fi

echo ""
echo "=== All tests passed! ==="
