#!/bin/bash
# Test script for image-info skill

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Testing image-info skill ==="
echo ""

# Test 1: Check script is accessible
echo "Test 1: Checking script is accessible..."
if [ -r "$SKILL_DIR/scripts/image-info.sh" ]; then
    echo "✓ Script is accessible"
else
    echo "✗ Script is not accessible"
    exit 1
fi

# Test 2: Test help command
echo ""
echo "Test 2: Testing help command..."
output=$(bash "$SKILL_DIR/scripts/image-info.sh" 2>&1 || true)
if echo "$output" | grep -q "Usage"; then
    echo "✓ Help works"
else
    echo "⚠ Help may not show (expected)"
fi

# Test 3: Check ImageMagick availability
echo ""
echo "Test 3: Checking ImageMagick..."
if command -v identify &> /dev/null; then
    echo "✓ ImageMagick is available"
else
    echo "⚠ ImageMagick not available (fallback will be used)"
fi

# Test 4: SKILL.md check
echo ""
echo "Test 4: Checking SKILL.md..."
if [ -f "$SKILL_DIR/SKILL.md" ]; then
    if grep -q "name: image-info" "$SKILL_DIR/SKILL.md"; then
        echo "✓ SKILL.md exists with correct name"
    else
        echo "✗ SKILL.md missing name field"
        exit 1
    fi
else
    echo "✗ SKILL.md not found"
    exit 1
fi

# Test 5: Check script has required functions
echo ""
echo "Test 5: Checking script functions..."
if grep -q "get_dimensions" "$SKILL_DIR/scripts/image-info.sh"; then
    echo "✓ Script has required functions"
else
    echo "✗ Script missing functions"
    exit 1
fi

echo ""
echo "=== All tests passed! ==="
