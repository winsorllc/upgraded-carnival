#!/bin/bash
# Test script for regex-tester skill

echo "=== Regex Tester Skill - Test Suite ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGEX_SCRIPT="$SCRIPT_DIR/../scripts/regex.js"

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

# Test 1: Basic match
run_test "Basic pattern match" \
  "node $REGEX_SCRIPT --pattern 'hello' --text 'hello world'" \
  '"matches": 1'

# Test 2: Groups extraction
run_test "Capture groups" \
  "node $REGEX_SCRIPT --pattern '(\\d{3})-(\\d{3})' --text '555-123' --groups" \
  '"index": 1'

# Test 3: Invalid regex
run_test "Invalid regex detection" \
  "node $REGEX_SCRIPT --pattern '[a-z+' --validate" \
  '"valid": false'

# Test 4: Valid regex validation
run_test "Valid regex validation" \
  "node $REGEX_SCRIPT --pattern '^[a-z]+$' --validate" \
  '"valid": true'

# Test 5: Case insensitive flag
run_test "Case insensitive matching" \
  "node $REGEX_SCRIPT --pattern 'HELLO' --text 'hello' --flags 'i'" \
  '"matches": 1'

# Test 6: Global flag
run_test "Global matching" \
  "node $REGEX_SCRIPT --pattern '\\w+' --text 'a b c' --flags 'g'" \
  '"matches": 3'

# Test 7: Replace functionality
run_test "Replace with groups" \
  "node $REGEX_SCRIPT --pattern '(\\w+)' --text 'hello' --replace '[$1]'" \
  '"replacements":'

# Test 8: Pattern explanation
run_test "Pattern explanation" \
  "node $REGEX_SCRIPT --pattern '\\d+' --explain" \
  'digit'

# Test 9: No match
run_test "No match case" \
  "node $REGEX_SCRIPT --pattern 'xyz' --text 'abc'" \
  '"matches": 0'

# Test 10: Email pattern
run_test "Email pattern validation" \
  "node $REGEX_SCRIPT --pattern '^[\\w.-]+@[\\w.-]+\\.\\w+$' --text 'test@example.com'" \
  '"matches": 1'

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