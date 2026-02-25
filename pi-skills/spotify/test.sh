#!/bin/bash
# Test script for Spotify skill

echo "=== Spotify Skill Test ==="
echo ""

# Test 1: Show usage
echo "Test 1: No arguments (should show usage/error)"
RESULT=$(bash /job/pi-skills/spotify/spotify-ctrl.sh 2>&1 || true)
if echo "$RESULT" | grep -q -i "Usage\|Error\|No Spotify"; then
    echo "✅ PASS: Script handles no arguments correctly"
else
    echo "⚠️  Result: $RESULT"
fi

echo ""

# Test 2: Check for Spotify tools
echo "Test 2: Check available Spotify tools"
FOUND=false
for tool in spotify spt spotify-cli playerctl; do
    if command -v $tool &> /dev/null; then
        echo "✅ Found: $tool"
        FOUND=true
    fi
done

if [ "$FOUND" = false ]; then
    echo "⚠️  No Spotify control tools found (expected in sandbox)"
fi

echo ""

# Test 3: Invalid action
echo "Test 3: Invalid action handling"
RESULT=$(bash /job/pi-skills/spotify/spotify-ctrl.sh invalid_action 2>&1 || true)
if echo "$RESULT" | grep -q "Usage"; then
    echo "✅ PASS: Invalid action shows usage"
else
    echo "⚠️  Result: $RESULT"
fi

echo ""
echo "=== Spotify Tests Complete ==="
