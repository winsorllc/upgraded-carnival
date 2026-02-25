#!/bin/bash
# Test script for voice-call skill

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Testing voice-call skill ==="
echo ""

# Test 1: Check script is executable
echo "Test 1: Checking script is accessible..."
if [ -r "$SKILL_DIR/scripts/voice-call.sh" ]; then
    echo "✓ Script is accessible"
else
    echo "✗ Script is not accessible"
    exit 1
fi

# Test 2: Test help command
echo ""
echo "Test 2: Testing help command..."
output=$(bash "$SKILL_DIR/scripts/voice-call.sh" help 2>&1)
if echo "$output" | grep -q "Voice Call"; then
    echo "✓ Help command works"
else
    echo "✗ Help command failed"
    exit 1
fi

# Test 3: Test mock call
echo ""
echo "Test 3: Testing mock call..."
output=$(VOICE_PROVIDER=mock bash "$SKILL_DIR/scripts/voice-call.sh" call "+15555550123" "Hello world" 2>&1)
if echo "$output" | grep -q "Mock Call Initiated"; then
    echo "✓ Mock call works"
else
    echo "✗ Mock call failed: $output"
    exit 1
fi

# Test 4: Test status check
echo ""
echo "Test 4: Testing status check..."
output=$(VOICE_PROVIDER=mock bash "$SKILL_DIR/scripts/voice-call.sh" status "MC123456" 2>&1)
if echo "$output" | grep -q "Mock Call Status"; then
    echo "✓ Status check works"
else
    echo "✗ Status check failed"
    exit 1
fi

# Test 5: Test end call
echo ""
echo "Test 5: Testing end call..."
output=$(VOICE_PROVIDER=mock bash "$SKILL_DIR/scripts/voice-call.sh" end "MC123456" 2>&1)
if echo "$output" | grep -q "Mock Call Ended"; then
    echo "✓ End call works"
else
    echo "✗ End call failed"
    exit 1
fi

# Test 6: Check SKILL.md exists
echo ""
echo "Test 6: Checking SKILL.md..."
if [ -f "$SKILL_DIR/SKILL.md" ]; then
    if grep -q "name: voice-call" "$SKILL_DIR/SKILL.md"; then
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
