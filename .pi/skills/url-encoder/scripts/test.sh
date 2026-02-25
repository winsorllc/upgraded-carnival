#!/bin/bash
set -e

echo "=== URL Encoder Tests ==="

# Test encode
echo "Test 1: Encode string"
result=$(node url.js encode "hello world")
echo "  Encoded: $result"
[[ "$result" == "hello%20world" ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

# Test encode special chars
echo "Test 2: Encode special characters"
result=$(node url.js encode "a+b=c")
echo "  Encoded: $result"
[[ "$result" == "a%2Bb%3Dc" ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

# Test decode
echo "Test 3: Decode string"
result=$(node url.js decode "hello%20world")
echo "  Decoded: $result"
[[ "$result" == "hello world" ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

# Test parse URL
echo "Test 4: Parse URL"
result=$(node url.js parse "https://example.com/path?key=value")
echo "  Parsed: $(echo "$result" | head -c 100)..."
[[ "$result" == *'"hostname":"example.com"'* ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

# Test query string
echo "Test 5: Build query string"
result=$(node url.js query --name "John Doe" --age 25)
echo "  Query: $result"
[[ "$result" == *'name=John%20Doe'* && "$result" == *'age=25'* ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

echo ""
echo "=== All URL Encoder tests completed ==="