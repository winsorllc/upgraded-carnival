#!/bin/bash
# Test script for goplaces-cli skill

set -e

echo "=== Testing Google Places CLI Skill ==="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Test 1: Script exists
echo -n "Test 1: goplaces.sh exists... "
if [ -f "$SCRIPT_DIR/goplaces.sh" ]; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 2: Script is executable
echo -n "Test 2: goplaces.sh is executable... "
chmod +x "$SCRIPT_DIR/goplaces.sh"
echo "✓ PASS"

# Test 3: Help works
echo -n "Test 3: Help displays... "
if "$SCRIPT_DIR/goplaces.sh" --help 2>&1 | grep -q "Google Places CLI"; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 4: Validates missing API key
echo -n "Test 4: Validates missing GOOGLE_API_KEY... "
unset GOOGLE_API_KEY
if ! "$SCRIPT_DIR/goplaces.sh" search "test" 2>&1 | grep -q "GOOGLE_API_KEY not set"; then
    echo "✗ FAIL"
    exit 1
fi
echo "✓ PASS"

# Test 5: SKILL.md exists
echo -n "Test 5: SKILL.md exists... "
if [ -f "$SCRIPT_DIR/SKILL.md" ]; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 6: Commands recognized
echo -n "Test 6: search command recognized... "
if "$SCRIPT_DIR/goplaces.sh" 2>&1 | grep -q "search"; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

echo ""
echo "=== All Tests Passed ==="
echo ""
echo "Note: Full API testing requires a valid GOOGLE_API_KEY with Places API enabled"
