#!/bin/bash
# Test script for content-search skill

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
TEST_DIR="$SCRIPT_DIR/test_data"

# Create test data
mkdir -p "$TEST_DIR"
cat > "$TEST_DIR/file1.txt" << 'EOF'
This is a test file.
It contains multiple lines.
Hello world function here.
Another line with hello.
Goodbye world.
EOF

cat > "$TEST_DIR/file2.js" << 'EOF'
function hello() {
  console.log("Hello");
}

function goodbye() {
  console.log("Goodbye");
}
EOF

echo "=== Testing content-search skill ==="
echo ""

# Test 1: Check required tools
echo "Test 1: Checking required tools..."
if command -v rg &> /dev/null; then
    echo "✓ rg (ripgrep) is installed"
    HAS_RG=true
else
    echo "⚠ rg not installed - testing grep fallback"
    HAS_RG=false
fi

# Test 2: Basic search
echo ""
echo "Test 2: Testing basic search..."
output=$(bash "$SKILL_DIR/scripts/content-search.sh" "hello" "$TEST_DIR" 2>&1)
if echo "$output" | grep -qi "hello"; then
    echo "✓ Basic search works"
    echo "  Found: $(echo "$output" | head -1)"
else
    echo "✗ Basic search failed: $output"
    rm -rf "$TEST_DIR"
    exit 1
fi

# Test 3: Count mode
echo ""
echo "Test 3: Testing count mode..."
output=$(bash "$SKILL_DIR/scripts/content-search.sh" "hello" "$TEST_DIR" --output-mode count 2>&1)
if echo "$output" | grep -q ":"; then
    echo "✓ Count mode works"
else
    echo "✗ Count mode failed: $output"
    rm -rf "$TEST_DIR"
    exit 1
fi

# Test 4: Files with matches mode
echo ""
echo "Test 4: Testing files_with_matches mode..."
output=$(bash "$SKILL_DIR/scripts/content-search.sh" "hello" "$TEST_DIR" --output-mode files_with_matches 2>&1)
if echo "$output" | grep -q "file"; then
    echo "✓ Files with matches mode works"
else
    echo "✗ Files with matches mode failed: $output"
    rm -rf "$TEST_DIR"
    exit 1
fi

# Test 5: Case insensitive
echo ""
echo "Test 5: Testing case insensitive search..."
output=$(bash "$SKILL_DIR/scripts/content-search.sh" "HELLO" "$TEST_DIR" --case-sensitive false 2>&1)
if echo "$output" | grep -qi "hello"; then
    echo "✓ Case insensitive search works"
else
    echo "✗ Case insensitive search failed: $output"
    rm -rf "$TEST_DIR"
    exit 1
fi

# Test 6: Context
echo ""
echo "Test 6: Testing context lines..."
output=$(bash "$SKILL_DIR/scripts/content-search.sh" "hello" "$TEST_DIR" --context 1 2>&1)
lines=$(echo "$output" | wc -l)
if [ "$lines" -gt 2 ]; then
    echo "✓ Context lines work"
else
    echo "✗ Context lines failed: $output"
    rm -rf "$TEST_DIR"
    exit 1
fi

# Test 7: Invert match
echo ""
echo "Test 7: Testing invert match..."
output=$(bash "$SKILL_DIR/scripts/content-search.sh" "hello" "$TEST_DIR" --invert-match 2>&1)
if echo "$output" | grep -q "goodbye"; then
    echo "✓ Invert match works"
else
    echo "✗ Invert match failed: $output"
    rm -rf "$TEST_DIR"
    exit 1
fi

# Test 8: SKILL.md check
echo ""
echo "Test 8: Checking SKILL.md..."
if [ -f "$SKILL_DIR/SKILL.md" ]; then
    if grep -q "name: content-search" "$SKILL_DIR/SKILL.md"; then
        echo "✓ SKILL.md exists with correct name"
    else
        echo "✗ SKILL.md missing name field"
        rm -rf "$TEST_DIR"
        exit 1
    fi
else
    echo "✗ SKILL.md not found"
    rm -rf "$TEST_DIR"
    exit 1
fi

# Cleanup
rm -rf "$TEST_DIR"

echo ""
echo "=== All tests passed! ==="
