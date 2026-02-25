#!/bin/bash
# Test script for network-tool skill

echo "=== Network Tool Skill - Test Suite ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NET_SCRIPT="$SCRIPT_DIR/../scripts/network.js"

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

# Test 1: DNS lookup
run_test "DNS lookup A records" \
  "node $NET_SCRIPT dns google.com --type A 2>/dev/null || true" \
  '"records"'

# Test 2: IP info (local)
run_test "Local IP info" \
  "node $NET_SCRIPT ip 2>/dev/null || true" \
  '"local"'

# Test 3: Port check (check localhost SSH if running, or just test format)
run_test "Port check format" \
  "node $NET_SCRIPT port localhost 22 2>/dev/null || true" \
  '"open"'

# Test 4: Help without args
run_test "Show usage on no args" \
  "node $NET_SCRIPT 2>&1 || true" \
  'Usage'

# Test 5: Ping localhost (should always work)
run_test "Ping localhost" \
  "node $NET_SCRIPT ping localhost --count 1 2>/dev/null || true" \
  '"host"'

# Test 6: HTTP check on example.com
run_test "HTTP status check" \
  "node $NET_SCRIPT http https://example.com --timeout 10 2>/dev/null || true" \
  '"url"'

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