#!/bin/bash
# Test script for file-encryptor skill

echo "=== File Encryptor Skill - Test Suite ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENC_SCRIPT="$SCRIPT_DIR/../scripts/encrypt.js"

total=0
passed=0

run_test() {
  local name="$1"
  local cmd="$2"
  local expected_contains="$3"
  
  total=$((total + 1))
  echo "Test $total: $name"
  echo "  Command: $cmd"
  
  result=$(eval "$cmd" 2>&1)
  exit_code=$?
  
  if echo "$result" | grep -q "$expected_contains"; then
    echo "  ✓ PASS"
    passed=$((passed + 1))
  else
    echo "  ✗ FAIL"
    echo "  Expected to contain: $expected_contains"
    echo "  Got: $result"
  fi
  echo ""
}

echo "Running tests:"
echo ""

# Create test file
echo "secret data 123" > /tmp/test_secret.txt

# Test 1: Encrypt file
run_test "Encrypt file" \
  "node $ENC_SCRIPT -i /tmp/test_secret.txt -p 'testpass123'" \
  '"success": true'

# Test 2: Verify encrypted file exists
run_test "Encrypted file created" \
  "test -f /tmp/test_secret.txt.enc && echo 'EXISTS'" \
  'EXISTS'

# Test 3: Decrypt file
run_test "Decrypt file" \
  "rm -f /tmp/test_secret_decoded.txt && node $ENC_SCRIPT -d -i /tmp/test_secret.txt.enc -o /tmp/test_secret_decoded.txt -p 'testpass123'" \
  '"success": true'

# Test 4: Verify content matches
run_test "Decrypted content matches" \
  "diff /tmp/test_secret.txt /tmp/test_secret_decoded.txt && echo 'MATCH'" \
  'MATCH'

# Test 5: Wrong password fails
run_test "Wrong password fails" \
  "node $ENC_SCRIPT -d -i /tmp/test_secret.txt.enc -o /tmp/fail.txt -p 'wrongpass' 2>&1 || true" \
  'failed'

# Cleanup
rm -f /tmp/test_secret.txt /tmp/test_secret.txt.enc /tmp/test_secret_decoded.txt /tmp/fail.txt

echo ""
echo "=== Test Summary ==="
echo "Passed: $passed / $total"

if [ $passed -eq $total ]; then
  echo "✓ All tests passed!"
  exit 0
else
  echo "✗ Some tests failed"
  exit 1
fi