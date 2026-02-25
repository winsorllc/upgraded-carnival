#!/bin/bash
#
# Test script for local-tts skill
# Tests various features of the TTS system
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

PASSED=0
FAILED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_result() {
    local name="$1"
    local result=$2
    if [[ "$result" == "PASS" ]]; then
        echo -e "${GREEN}✓ PASS${NC}: $name"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $name"
        ((FAILED++))
    fi
}

echo "=============================================="
echo "Local TTS Skill Test Suite"
echo "=============================================="
echo ""

# Test 1: Check espeak or espeak-ng is available
echo "Test 1: Checking for espeak/espeak-ng..."
if command -v espeak-ng &> /dev/null || command -v espeak &> /dev/null; then
    test_result "TTS engine available" "PASS"
    if command -v espeak-ng &> /dev/null; then
        echo "  Found: espeak-ng"
    else
        echo "  Found: espeak"
    fi
else
    test_result "TTS engine available" "FAIL"
fi
echo ""

# Test 2: Check speak.sh exists and is executable
echo "Test 2: Checking speak.sh..."
if [[ -x "$BASE_DIR/scripts/speak.sh" ]]; then
    test_result "speak.sh exists and is executable" "PASS"
else
    chmod +x "$BASE_DIR/scripts/speak.sh" 2>/dev/null || true
    if [[ -x "$BASE_DIR/scripts/speak.sh" ]]; then
        test_result "speak.sh exists and is executable" "PASS"
    else
        test_result "speak.sh exists and is executable" "FAIL"
    fi
fi
echo ""

# Test 3: Check list-voices.sh exists
echo "Test 3: Checking list-voices.sh..."
if [[ -x "$BASE_DIR/scripts/list-voices.sh" ]]; then
    test_result "list-voices.sh exists" "PASS"
else
    chmod +x "$BASE_DIR/scripts/list-voices.sh" 2>/dev/null || true
    if [[ -x "$BASE_DIR/scripts/list-voices.sh" ]]; then
        test_result "list-voices.sh exists" "PASS"
    else
        test_result "list-voices.sh exists" "FAIL"
    fi
fi
echo ""

# Test 4: Test basic speech output to file
echo "Test 4: Testing basic speech output to file..."
OUTPUT_FILE="/tmp/test_tts_output.wav"
rm -f "$OUTPUT_FILE"

if [[ -x "$BASE_DIR/scripts/speak.sh" ]]; then
    if "$BASE_DIR/scripts/speak.sh" "Hello, this is a test." --output "$OUTPUT_FILE" 2>/dev/null; then
        if [[ -f "$OUTPUT_FILE" ]]; then
            test_result "Basic speech output" "PASS"
            echo "  Output file size: $(ls -lh "$OUTPUT_FILE" | awk '{print $5}')"
        else
            test_result "Basic speech output" "FAIL"
        fi
    else
        test_result "Basic speech output" "FAIL"
    fi
else
    test_result "Basic speech output" "FAIL"
fi
echo ""

# Test 5: Test pitch adjustment
echo "Test 5: Testing pitch adjustment..."
rm -f "$OUTPUT_FILE"
if "$BASE_DIR/scripts/speak.sh" "Testing pitch." --pitch 75 --output "$OUTPUT_FILE" 2>/dev/null; then
    if [[ -f "$OUTPUT_FILE" ]]; then
        test_result "Pitch adjustment" "PASS"
    else
        test_result "Pitch adjustment" "FAIL"
    fi
else
    test_result "Pitch adjustment" "FAIL"
fi
echo ""

# Test 6: Test speed adjustment
echo "Test 6: Testing speed adjustment..."
rm -f "$OUTPUT_FILE"
if "$BASE_DIR/scripts/speak.sh" "Testing speed." --speed 150 --output "$OUTPUT_FILE" 2>/dev/null; then
    if [[ -f "$OUTPUT_FILE" ]]; then
        test_result "Speed adjustment" "PASS"
    else
        test_result "Speed adjustment" "FAIL"
    fi
else
    test_result "Speed adjustment" "FAIL"
fi
echo ""

# Test 7: Test different voice
echo "Test 7: Testing different voice (en-gb)..."
rm -f "$OUTPUT_FILE"
if "$BASE_DIR/scripts/speak.sh" "Testing British voice." --voice "en-gb" --output "$OUTPUT_FILE" 2>/dev/null; then
    if [[ -f "$OUTPUT_FILE" ]]; then
        test_result "Voice selection (en-gb)" "PASS"
    else
        test_result "Voice selection (en-gb)" "FAIL"
    fi
else
    test_result "Voice selection (en-gb)" "FAIL"
fi
echo ""

# Test 8: Test help option
echo "Test 8: Testing --help option..."
if "$BASE_DIR/scripts/speak.sh" --help &> /dev/null; then
    test_result "--help option works" "PASS"
else
    test_result "--help option works" "FAIL"
fi
echo ""

# Test 9: Test verbose mode
echo "Test 9: Testing verbose mode..."
rm -f "$OUTPUT_FILE"
OUTPUT=$( "$BASE_DIR/scripts/speak.sh" "Verbose test." --output "$OUTPUT_FILE" --verbose 2>&1)
if echo "$OUTPUT" | grep -q "Using:"; then
    test_result "Verbose mode" "PASS"
else
    test_result "Verbose mode" "FAIL"
fi
echo ""

# Cleanup
rm -f "$OUTPUT_FILE"

# Summary
echo "=============================================="
echo "Test Summary"
echo "=============================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
