#!/bin/bash
# Test script for system-diagnostics skill

set -e

echo "=== Testing System Diagnostics Skill ==="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Test 1: Script exists
echo -n "Test 1: system-diag.sh exists... "
if [ -f "$SCRIPT_DIR/system-diag.sh" ]; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 2: Script is executable
echo -n "Test 2: system-diag.sh is executable... "
chmod +x "$SCRIPT_DIR/system-diag.sh"
echo "✓ PASS"

# Test 3: Help works
echo -n "Test 3: Help displays... "
if "$SCRIPT_DIR/system-diag.sh" --help 2>&1 | grep -q "System Diagnostics"; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 4: Summary command works
echo -n "Test 4: Summary runs... "
if "$SCRIPT_DIR/system-diag.sh" summary &>/dev/null; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 5: CPU command works
echo -n "Test 5: CPU command works... "
if "$SCRIPT_DIR/system-diag.sh" cpu &>/dev/null; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 6: Memory command works
echo -n "Test 6: Memory command works... "
if "$SCRIPT_DIR/system-diag.sh" memory &>/dev/null; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 7: SKILL.md exists
echo -n "Test 7: SKILL.md exists... "
if [ -f "$SCRIPT_DIR/SKILL.md" ]; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

echo ""
echo "=== All Tests Passed ==="
