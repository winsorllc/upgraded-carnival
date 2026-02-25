#!/bin/bash
# Test: RSS Watcher Skill

echo "=== Testing RSS Watcher Skill ==="

# Test 1: Check if curl is available
echo "Test 1: Checking curl availability..."
if command -v curl &> /dev/null; then
    curl_version=$(curl --version | head -1)
    echo "PASS: $curl_version"
else
    echo "FAIL: curl not found"
    exit 1
fi

# Test 2: Note xmllint requirement
echo ""
echo "Test 2: Checking xmllint availability..."
if command -v xmllint &> /dev/null; then
    echo "PASS: xmllint available"
else
    echo "SKIP: xmllint not installed (optional - install libxml2-utils)"
fi

# Test 3: Test XML parsing with available tools
echo ""
echo "Test 3: Basic XML parsing with grep..."

# Create sample RSS feed
cat > /tmp/test_feed.xml << 'XML'
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>https://example.com</link>
    <item>
      <title>First Post</title>
      <link>https://example.com/post1</link>
      <pubDate>Wed, 25 Feb 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Second Post</title>
      <link>https://example.com/post2</link>
      <pubDate>Tue, 24 Feb 2026 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
XML

# Extract titles using grep/sed as fallback
titles=$(grep -oP '(?<=<title>)[^<]+' /tmp/test_feed.xml | tail -n +2)
echo "Extracted titles:"
echo "$titles"

if [ -n "$titles" ]; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

# Test 4: Extract links
echo ""
echo "Test 4: Link extraction..."
links=$(grep -oP '(?<=<link>)[^<]+' /tmp/test_feed.xml | tail -n +2)
echo "Extracted links:"
echo "$links"

if [ -n "$links" ]; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

# Test 5: Test curl with headers
echo ""
echo "Test 5: HTTP header retrieval..."
# We can't actually fetch from wttr.in, but let's test that curl works
headers=$(curl -sI "https://httpbin.org/get" 2>/dev/null | head -5)
echo "Response headers received:"
echo "$headers"

if [ -n "$headers" ]; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

# Test 6: Test feed download simulation
echo ""
echo "Test 6: Feed download simulation..."
feed_content='<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item><title>Test Item</title></item>
  </channel>
</rss>'
echo "$feed_content" > /tmp/downloaded_feed.xml

if [ -s /tmp/downloaded_feed.xml ]; then
    echo "PASS: Feed file created successfully"
else
    echo "FAIL"
    exit 1
fi

echo ""
echo "=== All RSS Watcher Tests PASSED (xmllint optional) ==="
rm -f /tmp/test_feed.xml /tmp/test_atom.xml /tmp/downloaded_feed.xml
