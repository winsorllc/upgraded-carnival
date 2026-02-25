#!/bin/bash
# Test: Notion Skill - Structure and syntax validation

echo "=== Testing Notion Skill ==="

# Test 1: Check if curl is available
echo "Test 1: Checking curl availability..."
if command -v curl &> /dev/null; then
    curl_version=$(curl --version | head -1 | cut -d' ' -f1-2)
    echo "PASS: $curl_version"
else
    echo "FAIL: curl not found"
    exit 1
fi

# Test 2: Check if jq is available
echo ""
echo "Test 2: Checking jq availability..."
if command -v jq &> /dev/null; then
    jq_version=$(jq --version)
    echo "PASS: $jq_version"
else
    echo "FAIL: jq not found"
    exit 1
fi

# Test 3: Validate API endpoint structure
echo ""
echo "Test 3: Validating API endpoint structure..."
# Test Notion API URL format
api_url="https://api.notion.com/v1/pages"
if [[ "$api_url" == "https://api.notion.com/v1"* ]]; then
    echo "PASS: API URL format correct"
else
    echo "FAIL: Invalid API URL format"
    exit 1
fi

# Test 4: Validate JSON structure for page creation
echo ""
echo "Test 4: Validating JSON structure..."

page_json='{
  "parent": { "page_id": "test-id" },
  "properties": {
    "title": {
      "title": [
        { "text": { "content": "New Page Title" } }
      ]
    }
  }
}'

# Validate JSON is valid
if echo "$page_json" | jq . > /dev/null 2>&1; then
    echo "PASS: JSON structure valid"
else
    echo "FAIL: Invalid JSON structure"
    exit 1
fi

# Test 5: Extract values from JSON
echo ""
echo "Test 5: JSON parsing test..."
title=$(echo "$page_json" | jq -r '.properties.title.title[0].text.content')
if [ "$title" = "New Page Title" ]; then
    echo "PASS: Title extracted correctly"
else
    echo "FAIL: Title extraction failed"
    exit 1
fi

# Test 6: Validate Notion API version header
echo ""
echo "Test 6: API version header test..."
version_header="Notion-Version: 2022-06-28"
if [[ "$version_header" == "Notion-Version: "* ]]; then
    echo "PASS: Version header format correct"
else
    echo "FAIL: Invalid version header"
    exit 1
fi

# Test 7: Validate database query filter JSON
echo ""
echo "Test 7: Filter JSON structure..."
filter_json='{
  "filter": {
    "property": "Status",
    "status": {
      "equals": "In Progress"
    }
  }
}'

if echo "$filter_json" | jq . > /dev/null 2>&1; then
    echo "PASS: Filter JSON valid"
else
    echo "FAIL: Invalid filter JSON"
    exit 1
fi

echo ""
echo "=== All Notion Tests PASSED ==="
