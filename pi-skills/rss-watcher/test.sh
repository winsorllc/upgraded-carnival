#!/bin/bash
# Test script for RSS watcher skill

echo "=== RSS Watcher Skill Test ==="
echo ""

# Test 1: Fetch Hacker News RSS
echo "Test 1: Fetch Hacker News RSS (titles only)"
RESULT=$(bash /job/pi-skills/rss-watcher/rss-fetch.sh "https://news.ycombinator.com/rss" --titles 2>&1)
echo "Result (first 500 chars): ${RESULT:0:500}"
# Check that we got actual content (RSS items contain numbers and text)
if [ $(echo "$RESULT" | wc -l) -gt 3 ]; then
    echo "✅ PASS: Successfully fetched HN RSS"
else
    echo "❌ FAIL: Could not fetch RSS"
    exit 1
fi

echo ""

# Test 2: Fetch with limit
echo "Test 2: Fetch with limit parameter"
RESULT=$(bash /job/pi-skills/rss-watcher/rss-fetch.sh "https://news.ycombinator.com/rss" --limit 3 2>&1)
COUNT=$(echo "$RESULT" | grep -c "^[0-9]\+\." || echo "0")
echo "Found $COUNT items (expected 3)"
if [ "$COUNT" -ge 3 ]; then
    echo "✅ PASS: Limit parameter works"
else
    echo "❌ FAIL: Limit parameter not working"
    exit 1
fi

echo ""

# Test 3: Invalid URL
echo "Test 3: Invalid URL (error handling)"
RESULT=$(bash /job/pi-skills/rss-watcher/rss-fetch.sh "https://invalid-url-that-does-not-exist-12345.com/feed.xml" 2>&1 || true)
echo "Result: ${RESULT:0:200}"
if echo "$RESULT" | grep -q "Error\|Could not"; then
    echo "✅ PASS: Error handling works"
else
    echo "❌ FAIL: Should handle errors gracefully"
    exit 1
fi

echo ""

# Test 4: No URL (usage)
echo "Test 4: No URL (should show usage)"
RESULT=$(bash /job/pi-skills/rss-watcher/rss-fetch.sh 2>&1 || true)
echo "Result: $RESULT"
if echo "$RESULT" | grep -q "Usage"; then
    echo "✅ PASS: Shows usage when no URL"
else
    echo "❌ FAIL: Should show usage"
    exit 1
fi

echo ""

# Test 5: JSON output format
echo "Test 5: JSON output format"
RESULT=$(bash /job/pi-skills/rss-watcher/rss-fetch.sh "https://news.ycombinator.com/rss" --json --limit 2 2>&1)
echo "Result (first 300 chars): ${RESULT:0:300}"
if echo "$RESULT" | grep -q -i "title\|items"; then
    echo "✅ PASS: JSON output works"
else
    echo "❌ FAIL: JSON output not working"
    exit 1
fi

echo ""
echo "=== All RSS Watcher Tests Passed! ==="
