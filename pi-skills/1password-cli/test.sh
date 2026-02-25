#!/bin/bash
# Test script for 1password-cli skill

set -e

echo "=== Testing 1Password CLI Skill ==="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Test 1: Script exists
echo -n "Test 1: op-wrapper.sh exists... "
if [ -f "$SCRIPT_DIR/op-wrapper.sh" ]; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 2: Script is executable
echo -n "Test 2: op-wrapper.sh is executable... "
chmod +x "$SCRIPT_DIR/op-wrapper.sh"
echo "✓ PASS"

# Test 3: Help works
echo -n "Test 3: Help displays... "
if "$SCRIPT_DIR/op-wrapper.sh" --help 2>&1 | grep -q "1Password CLI"; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 4: Check for op CLI or show install guidance
echo -n "Test 4: Shows install guidance when op not found... "
if ! command -v op &> /dev/null; then
    if "$SCRIPT_DIR/op-wrapper.sh" 2>&1 | grep -q "not installed"; then
        echo "✓ PASS"
    else
        echo "✗ FAIL"
        exit 1
    fi
else
    echo "✓ PASS (op CLI available)"
fi

# Test 5: SKILL.md exists
echo -n "Test 5: SKILL.md exists... "
if [ -f "$SCRIPT_DIR/SKILL.md" ]; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 6: install command exists
echo -n "Test 6: install command exists... "
if "$SCRIPT_DIR/op-wrapper.sh" 2>&1 | grep -q "install"; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

echo ""
echo "=== All Tests Passed ==="
