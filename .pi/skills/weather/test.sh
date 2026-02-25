#!/bin/bash
# Test for weather skill

echo "Testing Weather CLI..."

# Test with London
node /job/.pi/skills/weather/weather.js London > /tmp/weather_test.txt
if [ $? -eq 0 ]; then
    echo "✓ Weather command works"
    cat /tmp/weather_test.txt | head -10
else
    echo "✗ Weather command failed"
    exit 1
fi

# Test JSON output
node /job/.pi/skills/weather/weather.js London --json > /tmp/weather_json.txt
if [ $? -eq 0 ]; then
    echo "✓ JSON output works"
else
    echo "✗ JSON output failed"
    exit 1
fi

# Test help
node /job/.pi/skills/weather/weather.js --help > /dev/null
if [ $? -eq 0 ]; then
    echo "✓ Help command works"
else
    echo "✗ Help command failed"
    exit 1
fi

echo "Weather skill tests passed!"
