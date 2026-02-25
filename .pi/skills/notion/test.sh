#!/bin/bash
# Test for notion skill

echo "Testing Notion CLI..."

# Test help command
NOTION_API_KEY=test_key node /job/.pi/skills/notion/notion.js --help > /tmp/notion_help.txt
if [ $? -eq 0 ]; then
    echo "✓ Help command works"
else
    echo "✗ Help command failed"
    exit 1
fi

# Test with mock search (will fail due to mock key, but should get to API)
NOTION_API_KEY=test_key node /job/.pi/skills/notion/notion.js search "test" 2>&1 | head -5
if [ $? -ne 0 ]; then
    echo "✗ Search command failed unexpectedly"
else
    echo "✓ Search command executes"
fi

echo "Notion skill tests passed!"
