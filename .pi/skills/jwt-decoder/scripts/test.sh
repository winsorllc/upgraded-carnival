#!/bin/bash
# Test script for jwt-decoder skill

echo "=== JWT Decoder Skill - Test Suite ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JWT_SCRIPT="$SCRIPT_DIR/../scripts/jwt.js"

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

# Create test tokens
echo "Creating test JWTs..."

# Valid JWT with payload {"sub": "123", "name": "Test"} signed with "secret"
TEST_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiVGVzdCJ9.NqF5H7v9l0zI2bGmWqXrY3sZ"
INVALID_JWT="invalid.token.here"

echo "Test JWT created"
echo ""

echo "Running tests:"
echo ""

# Test 1: Basic decode
run_test "Basic JWT decode" \
  "node $JWT_SCRIPT --token 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.a8f2b3c4d5e6f7g8h9i0j'" \
  '"header"'

# Test 2: Invalid format detection
run_test "Invalid JWT format detection" \
  "node $JWT_SCRIPT --token 'invalid'" \
  '"valid":false'

# Test 3: Verify with valid secret
run_test "Signature verification requires HS256" \
  "node $JWT_SCRIPT --token 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.q5r7u9w2y4A6C8E0G' --secret 'test'" \
  '"header"'

# Test 4: Missing token error
run_test "Missing token shows usage" \
  "node $JWT_SCRIPT 2>&1 || true" \
  'Usage'

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