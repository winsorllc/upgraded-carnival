#!/bin/bash
set -e

echo "=== Color Converter Tests ==="

# Test hex input
echo "Test 1: Hex input"
result=$(node color-convert.js hex '#FF5733' --format rgb)
echo "  Hex #FF5733 to RGB: $result"
[[ "$result" == *"255"* ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

# Test RGB input
echo "Test 2: RGB input"
result=$(node color-convert.js rgb '100,150,200' --format hex)
echo "  RGB(100,150,200) to Hex: $result"
[[ "$result" == "#6496C8" ]] && echo "  ✓ PASS" || echo "  ✗ FAIL (got: $result)"

# Test named color
echo "Test 3: Named color"
result=$(node color-convert.js name 'blue' --format hex)
echo "  Name 'blue' to Hex: $result"
[[ "$result" == "#0000FF" ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

# Test all formats output
echo "Test 4: All formats JSON output"
result=$(node color-convert.js hex '#32CD32')
echo "  Full output for LimeGreen: $(echo "$result" | head -1)"
[[ "$result" == *'"hex"'* ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

# Test HSL conversion
echo "Test 5: Hex to HSL"
result=$(node color-convert.js hex '#FF0000' --format hsl)
echo "  Red to HSL: $result"
[[ "$result" == *"0"* ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

echo ""
echo "=== All Color Converter tests completed ==="