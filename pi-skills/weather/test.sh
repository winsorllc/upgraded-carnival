#!/bin/bash
# Test script for weather skill

echo "=== Weather Skill Test ==="
echo ""

# Test 1: One-line summary for New York
echo "Test 1: One-line summary for New York"
RESULT=$(bash /job/pi-skills/weather/weather.sh "New York" 3)
echo "Result: $RESULT"
if [ -n "$RESULT" ]; then
    echo "✅ PASS: Got weather data for New York"
else
    echo "❌ FAIL: No weather data returned"
    exit 1
fi

echo ""

# Test 2: London with feels like
echo "Test 2: London weather"
RESULT=$(bash /job/pi-skills/weather/weather.sh "London" 3)
echo "Result: $RESULT"
if [ -n "$RESULT" ]; then
    echo "✅ PASS: Got weather data for London"
else
    echo "❌ FAIL: No weather data returned"
    exit 1
fi

echo ""

# Test 3: JSON format
echo "Test 3: JSON format for Tokyo"
RESULT=$(bash /job/pi-skills/weather/weather.sh "Tokyo" j1 | head -c 200)
echo "Result: ${RESULT}..."
if echo "$RESULT" | grep -q "current_condition"; then
    echo "✅ PASS: Got JSON weather data for Tokyo"
else
    echo "❌ FAIL: No JSON weather data returned"
    exit 1
fi

echo ""

# Test 4: No location (should fail gracefully)
echo "Test 4: No location (should show usage)"
RESULT=$(bash /job/pi-skills/weather/weather.sh 2>&1 || true)
echo "Result: $RESULT"
if echo "$RESULT" | grep -q "Usage"; then
    echo "✅ PASS: Shows usage when no location provided"
else
    echo "❌ FAIL: Should show usage"
    exit 1
fi

echo ""
echo "=== All Weather Tests Passed! ==="
