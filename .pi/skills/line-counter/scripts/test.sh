#!/bin/bash
# Test script for line-counter skill

echo "=== Line Counter Skill - Test Suite ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LINES_SCRIPT="$SCRIPT_DIR/../scripts/lines.js"

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

# Setup test files
TEST_DIR=/tmp/line_counter_test
rm -rf $TEST_DIR
mkdir -p $TEST_DIR

# Create test file with known content
cat > $TEST_DIR/test.js << 'EOF'
// This is a comment
function hello() {
  const x = 1;
  const y = 2;
  
  return x + y;
}
/* Multi-line comment
   spanning multiple */
EOF

# Create python file
cat > $TEST_DIR/test.py << 'EOF'
# Python file
def hello():
    x = 1
    y = 2
    return x + y
EOF

echo "Running tests:"
echo ""

# Test 1: Single file
run_test "Count single file" \
  "node $LINES_SCRIPT count $TEST_DIR/test.js" \
  'javascript'

# Test 2: Directory count
run_test "Count directory" \
  "node $LINES_SCRIPT count $TEST_DIR" \
  'Total Statistics'

# Test 3: JSON format
run_test "JSON output format" \
  "node $LINES_SCRIPT count $TEST_DIR/test.js --format json" \
  '"total":'

# Test 4: Summary mode
run_test "Summary mode" \
  "node $LINES_SCRIPT count $TEST_DIR --summary --format json" \
  '"files":'

# Test 5: Multiple languages detected
run_test "Multiple languages" \
  "node $LINES_SCRIPT count $TEST_DIR" \
  'By Language'

# Cleanup
rm -rf $TEST_DIR

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