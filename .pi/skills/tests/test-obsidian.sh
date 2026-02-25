#!/bin/bash
# Test: Obsidian Skill

echo "=== Testing Obsidian Skill ==="

# Test 1: Check if find is available
echo "Test 1: Checking find availability..."
if command -v find &> /dev/null; then
    echo "PASS: find available"
else
    echo "FAIL: find not found"
    exit 1
fi

# Test 2: Check if grep is available
echo ""
echo "Test 2: Checking grep availability..."
if command -v grep &> /dev/null; then
    echo "PASS: grep available"
else
    echo "FAIL: grep not found"
    exit 1
fi

# Test 3: Create mock vault and test find
echo ""
echo "Test 3: Testing vault structure..."

mkdir -p /tmp/test_vault/notes /tmp/test_vault/folder
cat > /tmp/test_vault/notes/note1.md << 'EOF'
---
tags: [test, sample]
created: 2026-01-01
---

# Note 1

This is a test note with some content.

## Section

More content here.
EOF

cat > /tmp/test_vault/notes/note2.md << 'EOF'
---
tags: [another]
---

# Note 2

Different content.
EOF

cat > /tmp/test_vault/folder/note3.md << 'EOF'
# Note 3

In a subfolder.
EOF

# Find all notes
notes=$(find /tmp/test_vault -name "*.md")
echo "Found notes:"
echo "$notes"

if [ -n "$notes" ]; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

# Test 4: Test grep search
echo ""
echo "Test 4: Testing content search..."
if grep -r "test note" /tmp/test_vault --include="*.md" > /dev/null 2>&1; then
    echo "PASS: Content search works"
else
    echo "FAIL"
    exit 1
fi

# Test 5: Test frontmatter extraction
echo ""
echo "Test 5: Testing frontmatter extraction..."
tags=$(grep -oP '(?<=tags: \[)[^\]]+' /tmp/test_vault/notes/note1.md)
echo "Found tags: $tags"

if [ -n "$tags" ]; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

# Test 6: Test wiki-link pattern matching
echo ""
echo "Test 6: Testing wiki-link pattern..."
# Add wiki-links to a note
cat >> /tmp/test_vault/notes/note1.md << 'EOF'

See [[note2]] for more info.
EOF

if grep -oP '\[\[[^\]]+\]\]' /tmp/test_vault/notes/note1.md > /dev/null 2>&1; then
    echo "PASS: Wiki-links detected"
else
    echo "FAIL"
    exit 1
fi

# Test 7: Count notes
echo ""
echo "Test 7: Counting notes..."
note_count=$(find /tmp/test_vault -name "*.md" | wc -l)
echo "Note count: $note_count"
if [ "$note_count" -ge 3 ]; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

echo ""
echo "=== All Obsidian Tests PASSED ==="
rm -rf /tmp/test_vault
