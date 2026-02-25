#!/bin/bash
# Test script for codex-agent skill

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Testing codex-agent skill ==="
echo ""

# Test 1: Check script is accessible
echo "Test 1: Checking script is accessible..."
if [ -r "$SKILL_DIR/scripts/codex-agent.sh" ]; then
    echo "✓ Script is accessible"
else
    echo "✗ Script is not accessible"
    exit 1
fi

# Test 2: Test help command
echo ""
echo "Test 2: Testing help command..."
output=$(bash "$SKILL_DIR/scripts/codex-agent.sh" help 2>&1)
if echo "$output" | grep -q "Codex Agent"; then
    echo "✓ Help command works"
else
    echo "✗ Help command failed"
    exit 1
fi

# Test 3: Test detect command
echo ""
echo "Test 3: Testing agent detection..."
output=$(bash "$SKILL_DIR/scripts/codex-agent.sh" detect 2>&1)
echo "  Output: $output"
if echo "$output" | grep -q "Found:\|No coding agent"; then
    echo "✓ Agent detection works"
else
    echo "✗ Agent detection failed"
    exit 1
fi

# Test 4: SKILL.md check
echo ""
echo "Test 4: Checking SKILL.md..."
if [ -f "$SKILL_DIR/SKILL.md" ]; then
    if grep -q "name: codex-agent" "$SKILL_DIR/SKILL.md"; then
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
