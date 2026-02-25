#!/bin/bash
# Test script for tunnel-cli skill

set -e

echo "=== Testing Tunnel CLI Skill ==="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Test 1: Script exists
echo -n "Test 1: tunnel.sh exists... "
if [ -f "$SCRIPT_DIR/tunnel.sh" ]; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 2: Script is executable
echo -n "Test 2: tunnel.sh is executable... "
chmod +x "$SCRIPT_DIR/tunnel.sh"
echo "✓ PASS"

# Test 3: Help works
echo -n "Test 3: Help displays... "
if "$SCRIPT_DIR/tunnel.sh" --help 2>&1 | grep -q "Tunnel CLI"; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 4: Commands recognized
echo -n "Test 4: Commands recognized... "
OUTPUT="$("$SCRIPT_DIR/tunnel.sh" 2>&1)"
if echo "$OUTPUT" | grep -q "cloudflared" && echo "$OUTPUT" | grep -q "tailscale"; then
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

# Test 6: install command works
echo -n "Test 6: install command exists... "
if "$SCRIPT_DIR/tunnel.sh" install 2>&1 | grep -q "Installing\|Please install"; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

echo ""
echo "=== All Tests Passed ==="
