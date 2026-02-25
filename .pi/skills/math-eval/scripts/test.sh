#!/bin/bash
# Test script for math-eval skill

echo "=== Math Eval Skill - Test Suite ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MATH_SCRIPT="$SCRIPT_DIR/../scripts/math.js"

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

# Test 1: Basic arithmetic
run_test "Basic addition" \
  "node $MATH_SCRIPT '2 + 2'" \
  '"success": true'

# Test 2: Square root
run_test "Square root" \
  "node $MATH_SCRIPT 'sqrt(16)'" \
  '4'

# Test 3: Constants
run_test "Pi constant" \
  "node $MATH_SCRIPT 'pi'" \
  '3.14'

# Test 4: Statistics
run_test "Statistics" \
  "node $MATH_SCRIPT stats '1,2,3,4,5'" \
  '"mean": 3'

# Test 5: Mean
run_test "Mean calculation" \
  "node $MATH_SCRIPT mean '10,20,30'" \
  '20'

# Test 6: Temperature conversion
run_test "Celsius to Fahrenheit" \
  "node $MATH_SCRIPT convert 100 celsius fahrenheit" \
  '212'

# Test 7: Base conversion
run_test "Hex to binary" \
  "node $MATH_SCRIPT base 16 to 2 FF" \
  '11111111'

# Test 8: Trigonometry
run_test "Sine of 0" \
  "node $MATH_SCRIPT 'sin(0)'" \
  '0'

# Test 9: Power
run_test "Power operation" \
  "node $MATH_SCRIPT '2^10'" \
  '1024'

# Test 10: Factorial
run_test "Factorial" \
  "node $MATH_SCRIPT 'fact(5)'" \
  '120'

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