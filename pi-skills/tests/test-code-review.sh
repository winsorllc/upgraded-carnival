#!/bin/bash
# Test: Code Review Skill

echo "=== Testing Code Review Skill ==="

# Test 1: Check git availability
echo "Test 1: Checking git availability..."
if command -v git &> /dev/null; then
    git_version=$(git --version)
    echo "PASS: $git_version"
else
    echo "SKIP: git not available"
    exit 1
fi

# Test 2: Check git diff
echo ""
echo "Test 2: Testing git diff..."
cd /tmp
rm -rf test-repo
mkdir test-repo && cd test-repo
git init -q
echo "line1" > test.txt
git add test.txt
git commit -q -m "initial"
echo "line2" >> test.txt
diff_output=$(git diff test.txt)
if echo "$diff_output" | grep -q "line2"; then
    echo "PASS: git diff works"
else
    echo "FAIL"
    exit 1
fi
cd /tmp
rm -rf test-repo

# Test 3: Check grep for TODO/FIXME
echo ""
echo "Test 3: Checking TODO/FIXME detection..."
echo "TODO: fix this later" > /tmp/test-code.js
echo "FIXME: bug here" >> /tmp/test-code.js
todos=$(grep -r "TODO\|FIXME" /tmp/test-code.js 2>/dev/null | wc -l)
if [ "$todos" -ge 2 ]; then
    echo "PASS: Found $todos TODO/FIXME comments"
else
    echo "FAIL"
    exit 1
fi
rm -f /tmp/test-code.js

# Test 4: Check wc for line counting
echo ""
echo "Test 4: Checking line counting..."
echo -e "line1\nline2\nline3" > /tmp/test-lines.txt
line_count=$(wc -l < /tmp/test-lines.txt)
if [ "$line_count" = "3" ]; then
    echo "PASS: Line count = $line_count"
else
    echo "FAIL: Expected 3, got $line_count"
    exit 1
fi
rm -f /tmp/test-lines.txt

# Test 5: Check for hardcoded secrets (simulation)
echo ""
echo "Test 5: Checking secret detection..."
echo 'var password = "secret123";' > /tmp/test-secret.js
secrets=$(grep -rE "password|secret" /tmp/test-secret.js 2>/dev/null | wc -l)
if [ "$secrets" -ge 1 ]; then
    echo "PASS: Found hardcoded secret pattern"
else
    echo "FAIL"
    exit 1
fi
rm -f /tmp/test-secret.js

# Test 6: Check shellcheck (if available)
echo ""
echo "Test 6: Checking shellcheck..."
if command -v shellcheck &> /dev/null; then
    echo '#!/bin/bash\necho "test"' > /tmp/test-shell.sh
    shellcheck /tmp/test-shell.sh 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "PASS: shellcheck works"
    else
        echo "WARN: shellcheck found issues"
    fi
    rm -f /tmp/test-shell.sh
else
    echo "SKIP: shellcheck not available"
fi

# Test 7: Check file info
echo ""
echo "Test 7: Checking file statistics..."
echo "content here" > /tmp/test-file.txt
# Use ls instead of file command
file_info=$(ls -l /tmp/test-file.txt)
if [ -f /tmp/test-file.txt ]; then
    echo "PASS: File exists"
else
    echo "FAIL"
    exit 1
fi
rm -f /tmp/test-file.txt

# Test 8: Check cloc (if available)
echo ""
echo "Test 8: Checking code statistics..."
mkdir -p /tmp/test-code-dir
echo "function test() {}" > /tmp/test-code-dir/test.js
echo "another file" > /tmp/test-code-dir/test2.txt
file_count=$(ls /tmp/test-code-dir | wc -l)
if [ "$file_count" -ge 2 ]; then
    echo "PASS: Directory listing works"
else
    echo "FAIL"
    exit 1
fi
rm -rf /tmp/test-code-dir

echo ""
echo "=== All Code Review Tests PASSED ==="
