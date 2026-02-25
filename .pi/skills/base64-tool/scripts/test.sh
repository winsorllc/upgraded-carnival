#!/bin/bash
set -e

echo "=== Base64 Tool Tests ==="

# Test encode
echo "Test 1: Encode text"
result=$(node base64.js encode --text "hello")
echo "  Encoded: $result"
[[ "$result" == "aGVsbG8=" ]] && echo "  ✓ PASS" || echo "  ✗ FAIL (got: $result)"

# Test decode
echo "Test 2: Decode text"
result=$(node base64.js decode --text "aGVsbG8=")
echo "  Decoded: $result"
[[ "$result" == "hello" ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

# Test URL-safe
echo "Test 3: URL-safe encode"
result=$(node base64.js encode --text "hello>world" --url-safe)
echo "  URL-safe: $result"
[[ -n "$result" ]] && echo "  ✓ PASS (generated)" || echo "  ✗ FAIL"

# Test file encode
echo "Test 4: Encode file"
echo "test content" > /tmp/b64test.txt
result=$(node base64.js encode --file /tmp/b64test.txt)
echo "  File encoded: ${result:0:20}..."
[[ -n "$result" ]] && echo "  ✓ PASS (file encoded)" || echo "  ✗ FAIL"

# Test roundtrip
echo "Test 5: Roundtrip encode/decode"
original="Test roundtrip message!"
encoded=$(node base64.js encode --text "$original")
decoded=$(node base64.js decode --text "$encoded")
[[ "$decoded" == "$original" ]] && echo "  ✓ PASS (roundtrip works)" || echo "  ✗ FAIL"

rm /tmp/b64test.txt

echo ""
echo "=== All Base64 Tool tests completed ==="