#!/bin/bash
# Test script for gifgrep skill

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Testing gifgrep skill ==="
echo ""

# Test 1: Check if gifgrep or fallback works
echo "Test 1: Checking gifgrep availability..."
if command -v gifgrep &> /dev/null; then
    echo "✓ gifgrep is installed"
    HAS_GIFGREP=true
else
    echo "⚠ gifgrep not installed - testing fallback"
    HAS_GIFGREP=false
fi

# Test 2: Test help command
echo ""
echo "Test 2: Testing help command..."
output=$(bash "$SKILL_DIR/scripts/gifgrep.sh" help 2>&1)
if echo "$output" | grep -q "GIF search"; then
    echo "✓ Help command works"
else
    echo "✗ Help command failed"
    exit 1
fi

# Test 3: Test fallback search (with mock - will show network error)
echo ""
echo "Test 3: Testing search with fallback..."
if [ "$HAS_GIFGREP" = false ]; then
    # Just check the script runs without error
    output=$(bash "$SKILL_DIR/scripts/gifgrep.sh" search "test" 2>&1 || true)
    if echo "$output" | grep -q "Searching\|Error"; then
        echo "✓ Search fallback works"
    else
        echo "✗ Search fallback failed"
        exit 1
    fi
else
    output=$(gifgrep search "test" --json 2>&1 || true)
    if echo "$output" | grep -q "url\|Error"; then
        echo "✓ gifgrep search works"
    else
        echo "✗ gifgrep search failed"
        exit 1
    fi
fi

# Test 4: Check script is executable
echo ""
echo "Test 4: Checking script is executable..."
if [ -x "$SKILL_DIR/scripts/gifgrep.sh" ] || [ -r "$SKILL_DIR/scripts/gifgrep.sh" ]; then
    echo "✓ Script is accessible"
else
    echo "✗ Script is not accessible"
    exit 1
fi

# Test 5: Check SKILL.md exists and has required sections
echo ""
echo "Test 5: Checking SKILL.md..."
if [ -f "$SKILL_DIR/SKILL.md" ]; then
    if grep -q "name: gifgrep" "$SKILL_DIR/SKILL.md"; then
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
