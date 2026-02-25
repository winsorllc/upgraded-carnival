#!/bin/bash
set -e

echo "=== UUID Generator Tests ==="

# Test generate single UUID
echo "Test 1: Generate v4 UUID"
result=$(node uuid.js)
echo "  UUID: $result"
[[ "$result" == *-*-*-*-* ]] && echo "  ✓ PASS (format valid)" || echo "  ✗ FAIL"

# Test nil UUID
echo "Test 2: Generate nil UUID"
result=$(node uuid.js -v nil)
echo "  Nil UUID: $result"
[[ "$result" == "00000000-0000-0000-0000-000000000000" ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

# Test short format
echo "Test 3: Short format"
result=$(node uuid.js -f short)
echo "  Short: ${result:0:20}..."
[[ "$result" != *-* ]] && echo "  ✓ PASS (no dashes)" || echo "  ✗ FAIL"

# Test uppercase
echo "Test 4: Uppercase format"
result=$(node uuid.js -f uppercase)
echo "  Upper: ${result:0:20}..."
[[ "$result" == *[A-F]* ]] && echo "  ✓ PASS (has uppercase)" || echo "  ✗ FAIL"

# Test multiple generation
echo "Test 5: Generate 3 UUIDs"
result=$(node uuid.js -n 3 | wc -l)
[[ "$result" -eq "3" ]] && echo "  ✓ PASS (3 generated)" || echo "  ✗ FAIL"

# Test uniqueness (basic)
echo "Test 6: Uniqueness"
uids=$(node uuid.js -n 10 | sort -u | wc -l)
[[ "$uids" -eq "10" ]] && echo "  ✓ PASS (all unique)" || echo "  ✗ FAIL"

echo ""
echo "=== All UUID Generator tests completed ==="