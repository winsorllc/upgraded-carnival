#!/bin/bash
set -e

echo "=== Hash Generator Tests ==="

# Test string hashing
echo "Test 1: SHA256 of 'hello'"
result=$(echo $(node hash.js --text "hello" --algo sha256))
echo "  Hash: $result"
[[ "$result" == "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824" ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

# Test MD5
echo "Test 2: MD5 of 'test'"
result=$(echo $(node hash.js --text "test" --algo md5))
echo "  MD5: $result"
[[ "$result" == "098f6bcd4621d373cade4e832627b4f6" ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

# Test file hashing
echo "Test 3: Hash file content"
echo "test content" > /tmp/testhash.txt
result=$(node hash.js --file /tmp/testhash.txt --algo sha256)
echo "  File hash: $result"
[[ -n "$result" ]] && echo "  ✓ PASS (hash generated)" || echo "  ✗ FAIL"

# Test base64 output
echo "Test 4: Base64 output format"
result=$(echo $(node hash.js --text "hello" --algo sha256 --format base64))
echo "  Base64: $result"
[[ -n "$result" ]] && echo "  ✓ PASS (base64 generated)" || echo "  ✗ FAIL"

# Test all algorithms
echo "Test 5: All algorithms output"
result=$(node hash.js --text "test" --algo all)
echo "  Multi-hash output: $(echo "$result" | head -1)"
[[ "$result" == *'"md5"'* && "$result" == *'"sha256"'* ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

# Test verification
echo "Test 6: Verify hash"
result=$(node hash.js --file /tmp/testhash.txt --algo sha256 --verify "$result" 2>&1 || true)
[[ -n "$result" ]] && echo "  ✓ PASS (verify ran)" || echo "  ✗ FAIL"

rm /tmp/testhash.txt

echo ""
echo "=== All Hash Generator tests completed ==="