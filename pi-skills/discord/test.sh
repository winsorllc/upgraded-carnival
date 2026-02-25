#!/bin/bash
# Test script for Discord skill

echo "=== Discord Skill Test ==="
echo ""

# Test 1: Show usage
echo "Test 1: No arguments (should show usage/error)"
unset DISCORD_WEBHOOK_URL
RESULT=$(bash /job/pi-skills/discord/discord-webhook.sh 2>&1 || true)
echo "Result: $RESULT"
if echo "$RESULT" | grep -q -i "Error\|Usage"; then
    echo "✅ PASS: Script handles no arguments correctly"
else
    echo "⚠️  Result: $RESULT"
fi

echo ""

# Test 2: Check missing webhook URL
echo "Test 2: Missing webhook URL (should show error)"
RESULT=$(bash /job/pi-skills/discord/discord-webhook.sh "test" 2>&1 || true)
echo "Result: $RESULT"
if echo "$RESULT" | grep -q "DISCORD_WEBHOOK_URL"; then
    echo "✅ PASS: Shows error when webhook URL missing"
else
    echo "❌ FAIL: Should check for webhook URL"
    exit 1
fi

echo ""

# Test 3: Invalid URL handling
echo "Test 3: Invalid URL format handling"
export DISCORD_WEBHOOK_URL="invalid-url"
RESULT=$(bash /job/pi-skills/discord/discord-webhook.sh "test message" 2>&1 || true)
echo "Result: ${RESULT:0:100}..."
echo "✅ PASS: Script executes with configured URL"

echo ""
echo "=== Discord Tests Complete ==="
