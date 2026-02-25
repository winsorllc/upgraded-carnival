#!/bin/bash
# Test script for data-faker skill

echo "=== Data Faker Skill - Test Suite ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FAKER_SCRIPT="$SCRIPT_DIR/../scripts/faker.js"

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

# Test 1: Generate person
run_test "Generate person" \
  "node $FAKER_SCRIPT person" \
  '"firstName"'

# Test 2: Generate company
run_test "Generate company" \
  "node $FAKER_SCRIPT company" \
  '"name"'

# Test 3: Generate multiple
run_test "Generate multiple people" \
  "node $FAKER_SCRIPT person --count 3" \
  'email'

# Test 4: Generate lorem ipsum
run_test "Generate lorem ipsum" \
  "node $FAKER_SCRIPT lorem --words 10" \
  'et'

# Test 5: Generate product
run_test "Generate product" \
  "node $FAKER_SCRIPT product" \
  '"price"'

# Test 6: Generate CSV
run_test "Generate CSV format" \
  "node $FAKER_SCRIPT csv --count 2" \
  'firstName'

# Test 7: Combined data
run_test "Combined data generation" \
  "node $FAKER_SCRIPT combined" \
  '"person"'

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