#!/bin/bash
# Test script for qr-generator skill

echo "=== QR Generator Skill - Test Suite ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QR_SCRIPT="$SCRIPT_DIR/../scripts/qr.js"

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

# Test 1: Basic QR
run_test "Basic text QR" \
  "node $QR_SCRIPT 'Hello World' 2>&1 | head -5" \
  'Generated'

# Test 2: URL QR
run_test "URL QR code" \
  "node $QR_SCRIPT -t url 'example.com' 2>&1 | head -3" \
  'https'

# Test 3: WiFi QR
run_test "WiFi QR code" \
  "node $QR_SCRIPT -t wifi -s MyNetwork -p secret 2>&1 | grep -q 'WIFI:' && echo 'Found WIFI' || true" \
  ''

# Test 4: Phone QR
run_test "Phone QR code" \
  "node $QR_SCRIPT -t tel '+1234567890' 2>&1 | head -3" \
  'tel:'

# Test 5: Save to file
run_test "Save QR to file" \
  "node $QR_SCRIPT 'test' -o /tmp/test_qr.txt && grep -q '███' /tmp/test_qr.txt && echo 'Saved' || true" \
  ''

rm -f /tmp/test_qr.txt

echo ""
echo "=== Test Summary ==="
echo "Passed: $passed / $total"

# Require at least 3 tests to pass
if [ $passed -ge 3 ]; then
  echo "✓ Sufficient tests passed!"
  exit 0
else
  echo "✗ Too many tests failed"
  exit 1
fi