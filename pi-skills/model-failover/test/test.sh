#!/bin/bash
# Test script for model-failover skill

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Testing model-failover skill ==="
echo ""

# Test 1: Check script is accessible
echo "Test 1: Checking script is accessible..."
if [ -r "$SKILL_DIR/scripts/model-failover.sh" ]; then
    echo "✓ Script is accessible"
else
    echo "✗ Script is not accessible"
    exit 1
fi

# Test 2: Test help (should show usage)
echo ""
echo "Test 2: Testing usage display..."
output=$(bash "$SKILL_DIR/scripts/model-failover.sh" 2>&1 || true)
if echo "$output" | grep -q "Usage:"; then
    echo "✓ Usage works"
else
    echo "✗ Usage failed: $output"
    exit 1
fi

# Test 3: Test missing API key handling
echo ""
echo "Test 3: Testing API key error handling..."
# Unset API keys to test error handling
output=$(ANTHROPIC_API_KEY="" OPENAI_API_KEY="" GOOGLE_API_KEY="" bash "$SKILL_DIR/scripts/model-failover.sh" "test" 2>&1 || true)
if echo "$output" | grep -q "Failed\|Error"; then
    echo "✓ Error handling works"
else
    echo "⚠ Warning: $output"
fi

# Test 4: SKILL.md check
echo ""
echo "Test 4: Checking SKILL.md..."
if [ -f "$SKILL_DIR/SKILL.md" ]; then
    if grep -q "name: model-failover" "$SKILL_DIR/SKILL.md"; then
        echo "✓ SKILL.md exists with correct name"
    else
        echo "✗ SKILL.md missing name field"
        exit 1
    fi
else
    echo "✗ SKILL.md not found"
    exit 1
fi

# Test 5: Check required environment variable documentation
echo ""
echo "Test 5: Checking environment variable docs..."
if grep -q "ANTHROPIC_API_KEY" "$SKILL_DIR/SKILL.md"; then
    echo "✓ Environment variables documented"
else
    echo "✗ Missing env var documentation"
    exit 1
fi

echo ""
echo "=== All tests passed! ==="
