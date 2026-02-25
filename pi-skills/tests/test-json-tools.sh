#!/bin/bash
# Test: JSON Tools Skill

echo "=== Testing JSON Tools Skill ==="

# Create test JSON file
echo '{"name": "test", "items": [{"id": 1, "price": 10}, {"id": 2, "price": 20}], "count": 2}' > /tmp/test.json

# Test 1: Validate JSON
echo "Test 1: Validating JSON..."
if node -e "JSON.parse(require('fs').readFileSync('/tmp/test.json', 'utf8'))" 2>/dev/null; then
    echo "PASS: JSON is valid"
else
    echo "FAIL: Invalid JSON"
    exit 1
fi

# Test 2: Pretty print
echo ""
echo "Test 2: Pretty printing JSON..."
if node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('/tmp/test.json', 'utf8')), null, 2))" > /tmp/test_pretty.json 2>&1; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

# Test 3: Minify JSON
echo ""
echo "Test 3: Minifying JSON..."
minified=$(node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('/tmp/test.json', 'utf8'))))")
if [ ${#minified} -lt 80 ]; then
    echo "PASS: Minified length: ${#minified}"
else
    echo "FAIL"
    exit 1
fi

# Test 4: Extract specific field
echo ""
echo "Test 4: Extracting field..."
name=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/test.json', 'utf8')).name)")
if [ "$name" = "test" ]; then
    echo "PASS: name = $name"
else
    echo "FAIL"
    exit 1
fi

# Test 5: Extract nested array item
echo ""
echo "Test 5: Extracting nested array..."
first_id=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/test.json', 'utf8')).items[0].id)")
if [ "$first_id" = "1" ]; then
    echo "PASS: first item id = $first_id"
else
    echo "FAIL"
    exit 1
fi

# Test 6: Count array items
echo ""
echo "Test 6: Counting array items..."
count=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/test.json', 'utf8')).items.length)")
if [ "$count" = "2" ]; then
    echo "PASS: item count = $count"
else
    echo "FAIL"
    exit 1
fi

# Test 7: Filter array (price > 10)
echo ""
echo "Test 7: Filtering array..."
filtered=$(node -e "const d=JSON.parse(require('fs').readFileSync('/tmp/test.json','utf8')); console.log(JSON.stringify(d.items.filter(i=>i.price>10)))")
if echo "$filtered" | grep -q "id.*2"; then
    echo "PASS: Found items with price > 10"
else
    echo "FAIL"
    exit 1
fi

# Test 8: Add field
echo ""
echo "Test 8: Adding new field..."
updated=$(node -e "const d=JSON.parse(require('fs').readFileSync('/tmp/test.json','utf8')); d.new_field='value'; console.log(JSON.stringify(d))")
if echo "$updated" | grep -q "new_field"; then
    echo "PASS: Added new_field"
else
    echo "FAIL"
    exit 1
fi

# Cleanup
rm -f /tmp/test.json /tmp/test_pretty.json

echo ""
echo "=== All JSON Tools Tests PASSED ==="
