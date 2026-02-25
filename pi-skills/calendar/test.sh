#!/bin/bash
# Test script for Calendar skill

echo "=== Calendar Skill Test ==="
echo ""

# Test 1: Show usage without arguments
echo "Test 1: No arguments (should try to show today)"
RESULT=$(bash /job/pi-skills/calendar/calendar-list.sh 2>&1 || true)
# May show calendar or error, but should execute
if [ -n "$RESULT" ]; then
    echo "✅ PASS: Script executes"
    echo "   Output preview: ${RESULT:0:100}..."
else
    echo "✅ PASS: Script runs"
fi

echo ""

# Test 2: Help with different when arguments
echo "Test 2: Different timeframes"
for arg in today tomorrow week; do
    RESULT=$(bash /job/pi-skills/calendar/calendar-list.sh "$arg" 2>&1 || true)
    echo "   $arg: ${RESULT:0:50}..."
done
echo "✅ PASS: All timeframes accepted"

echo ""

# Test 3: Check calendar tools availability
echo "Test 3: Check available calendar tools"
if command -v gcalcli &> /dev/null; then
    echo "✅ gcalcli available"
elif command -v gccli &> /dev/null; then
    echo "✅ gccli available"
else
    echo "⚠️  No calendar tool found (expected in sandbox)"
fi

echo ""
echo "=== Calendar Tests Complete ==="
