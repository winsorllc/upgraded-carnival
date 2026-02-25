#!/bin/bash
set -e

echo "=== HTML Entities Tests ==="

# Test encode basic
echo "Test 1: Encode basic entities"
result=$(node html.js encode "5 < 6 > 3")
echo "  Encoded: $result"
[[ "$result" == *"&lt;"* && "$result" == *"&gt;"* ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

# Test decode
echo "Test 2: Decode entities"
result=$(node html.js decode "&lt;div&gt;")
echo "  Decoded: $result"
[[ "$result" == "<div>" ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

# Test ampersand
echo "Test 3: Encode ampersand"
result=$(node html.js encode "R&D")
echo "  Encoded: $result"
[[ "$result" == "R&amp;D" ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

# Test numeric mode
echo "Test 4: Numeric entity mode"
result=$(node html.js encode "<test>" --numeric)
echo "  Numeric: $result"
[[ "$result" == *"#60"* ]] && echo "  ✓ PASS" || echo "  ✗ FAIL"

# Test roundtrip
echo "Test 5: Roundtrip"
original="<script> & \"hello\""
decoded=$(node html.js decode "$(node html.js encode "$original")")
[[ "$decoded" == "$original" ]] && echo "  ✓ PASS (roundtrip)" || echo "  ✗ FAIL"

echo ""
echo "=== All HTML Entities tests completed ==="