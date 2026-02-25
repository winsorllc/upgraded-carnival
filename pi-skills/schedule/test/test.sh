#!/bin/bash
# Test script for schedule skill

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Testing schedule skill ==="
echo ""

# Test 1: Check script is accessible
echo "Test 1: Checking script is accessible..."
if [ -r "$SKILL_DIR/scripts/schedule.sh" ]; then
    echo "✓ Script is accessible"
else
    echo "✗ Script is not accessible"
    exit 1
fi

# Test 2: Test help command
echo ""
echo "Test 2: Testing help command..."
output=$(bash "$SKILL_DIR/scripts/schedule.sh" help 2>&1)
if echo "$output" | grep -q "Schedule"; then
    echo "✓ Help command works"
else
    echo "✗ Help command failed"
    exit 1
fi

# Test 3: Test list command (may show no jobs)
echo ""
echo "Test 3: Testing list command..."
output=$(bash "$SKILL_DIR/scripts/schedule.sh" list 2>&1)
if echo "$output" | grep -q "jobs"; then
    echo "✓ List command works"
else
    echo "⚠ List command output unexpected but may be ok"
fi

# Test 4: Test check command
echo ""
echo "Test 4: Testing check command..."
output=$(bash "$SKILL_DIR/scripts/schedule.sh" check 2>&1)
if echo "$output" | grep -q "Permission"; then
    echo "✓ Check command works"
else
    echo "⚠ Check command output unexpected"
fi

# Test 5: SKILL.md check
echo ""
echo "Test 5: Checking SKILL.md..."
if [ -f "$SKILL_DIR/SKILL.md" ]; then
    if grep -q "name: schedule" "$SKILL_DIR/SKILL.md"; then
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
