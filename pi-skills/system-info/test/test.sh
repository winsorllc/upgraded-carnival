#!/bin/bash
# Test script for system-info skill

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Testing system-info skill ==="
echo ""

# Test 1: Check script is accessible
echo "Test 1: Checking script is accessible..."
if [ -r "$SKILL_DIR/scripts/system-info.sh" ]; then
    echo "✓ Script is accessible"
else
    echo "✗ Script is not accessible"
    exit 1
fi

# Test 2: Test help command
echo ""
echo "Test 2: Testing help command..."
output=$(bash "$SKILL_DIR/scripts/system-info.sh" help 2>&1)
if echo "$output" | grep -q "System Info"; then
    echo "✓ Help command works"
else
    echo "✗ Help command failed"
    exit 1
fi

# Test 3: Test diagnose command
echo ""
echo "Test 3: Testing diagnose command..."
output=$(bash "$SKILL_DIR/scripts/system-info.sh" diagnose 2>&1)
if echo "$output" | grep -q "Diagnostics"; then
    echo "✓ Diagnose command works"
else
    echo "✗ Diagnose command failed"
    exit 1
fi

# Test 4: Test resources command
echo ""
echo "Test 4: Testing resources command..."
output=$(bash "$SKILL_DIR/scripts/system-info.sh" resources 2>&1)
if echo "$output" | grep -q "Resources"; then
    echo "✓ Resources command works"
else
    echo "✗ Resources command failed"
    exit 1
fi

# Test 5: SKILL.md check
echo ""
echo "Test 5: Checking SKILL.md..."
if [ -f "$SKILL_DIR/SKILL.md" ]; then
    if grep -q "name: system-info" "$SKILL_DIR/SKILL.md"; then
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
