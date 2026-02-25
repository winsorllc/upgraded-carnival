#!/bin/bash
# Test script for github-cli skill
# Tests basic gh CLI availability and functionality

set -e

echo "=== Testing GitHub CLI Skill ==="

# Test 1: Check if gh is installed
echo -n "Test 1: gh CLI installed... "
if command -v gh &> /dev/null; then
    echo "✓ PASS"
else
    echo "✗ SKIP (gh not installed)"
    exit 0
fi

# Test 2: Check gh version
echo -n "Test 2: gh --version works... "
if gh --version &> /dev/null; then
    VERSION=$(gh --version | head -1)
    echo "✓ PASS ($VERSION)"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 3: Auth status check
echo -n "Test 3: gh auth status... "
if gh auth status &> /dev/null; then
    echo "✓ PASS (authenticated)"
else
    echo "⚠ WARN (not authenticated - this is OK for testing)"
fi

# Test 4: Help command works
echo -n "Test 4: gh --help works... "
if gh --help &> /dev/null; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 5: Wrapper script exists and is executable
echo -n "Test 5: Wrapper script exists... "
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/gh-wrapper.sh" ]; then
    chmod +x "$SCRIPT_DIR/gh-wrapper.sh"
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 6: Wrapper script help
echo -n "Test 6: Wrapper shows help... "
if "$SCRIPT_DIR/gh-wrapper.sh" 2>&1 | grep -q "Usage:"; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 7: gh api command (basic API test)
echo -n "Test 7: gh api rate-limit... "
if gh api rate_limit &> /dev/null; then
    echo "✓ PASS"
else
    echo "⚠ WARN (may need auth)"
fi

echo ""
echo "=== All Tests Passed ==="
