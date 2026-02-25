#!/bin/bash
# Test script for time-converter skill

echo "=== Time Converter Skill - Test Suite ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIME_SCRIPT="$SCRIPT_DIR/../scripts/time.js"

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

# Test 1: Now command
run_test "Current time" \
  "node $TIME_SCRIPT now" \
  '"epoch_ms"'

# Test 2: Unix timestamp conversion
run_test "Unix to date" \
  "node $TIME_SCRIPT unix 1704067200" \
  '"timestamp_ms"'

# Test 3: Convert to unix
run_test "Date to unix" \
  "node $TIME_SCRIPT to-unix '2024-01-01T00:00:00Z'" \
  '"timestamp_s"'

# Test 4: Format date
run_test "Format date" \
  "node $TIME_SCRIPT format '2024-03-15' --format 'YYYY-MM-DD'" \
  '"formatted"'

# Test 5: Duration calculation
run_test "Duration" \
  "node $TIME_SCRIPT duration '2024-01-01' --to '2024-01-02'" \
  '"duration"'

# Test 6: List timezones
run_test "List timezones" \
  "node $TIME_SCRIPT list" \
  '"UTC"'

# Test 7: Convert timezone
run_test "Convert timezone" \
  "node $TIME_SCRIPT convert '2024-03-15T12:00:00Z' --to UTC" \
  '"source"'

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