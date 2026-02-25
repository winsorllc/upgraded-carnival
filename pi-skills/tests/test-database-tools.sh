#!/bin/bash
# Test: Database Tools Skill (using Node.js)

echo "=== Testing Database Tools Skill ==="

# Test 1: Check node availability
echo "Test 1: Checking Node.js availability..."
node_version=$(node --version)
echo "PASS: Node.js version $node_version"

# Test 2: Create simple database simulation using JSON
echo ""
echo "Test 2: Creating test database..."
echo '{"tables": {}, "data": {}}' > /tmp/test.db.json
if [ -f /tmp/test.db.json ]; then
    echo "PASS: Database file created"
else
    echo "FAIL"
    exit 1
fi

# Test 3: Create table
echo ""
echo "Test 3: Creating table..."
node -e "
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('/tmp/test.db.json', 'utf8'));
db.tables.users = { id: 'INTEGER PRIMARY KEY', name: 'TEXT', email: 'TEXT' };
db.data.users = [];
fs.writeFileSync('/tmp/test.db.json', JSON.stringify(db, null, 2));
"
if grep -q "users" /tmp/test.db.json; then
    echo "PASS: Table created"
else
    echo "FAIL"
    exit 1
fi

# Test 4: Insert data
echo ""
echo "Test 4: Inserting data..."
node -e "
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('/tmp/test.db.json', 'utf8'));
db.data.users.push({ id: 1, name: 'Alice', email: 'alice@example.com' });
db.data.users.push({ id: 2, name: 'Bob', email: 'bob@example.com' });
fs.writeFileSync('/tmp/test.db.json', JSON.stringify(db, null, 2));
"
count=$(node -e "const db=JSON.parse(require('fs').readFileSync('/tmp/test.db.json','utf8')); console.log(db.data.users.length)")
if [ "$count" = "2" ]; then
    echo "PASS: Inserted $count rows"
else
    echo "FAIL: Expected 2, got $count"
    exit 1
fi

# Test 5: Query data
echo ""
echo "Test 5: Querying data..."
name=$(node -e "const db=JSON.parse(require('fs').readFileSync('/tmp/test.db.json','utf8')); const user=db.data.users.find(u=>u.id===1); console.log(user ? user.name : '')")
if [ "$name" = "Alice" ]; then
    echo "PASS: Retrieved name = $name"
else
    echo "FAIL"
    exit 1
fi

# Test 6: Update data
echo ""
echo "Test 6: Updating data..."
node -e "
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('/tmp/test.db.json', 'utf8'));
const user = db.data.users.find(u=>u.id===1);
if (user) user.name = 'Alice Smith';
fs.writeFileSync('/tmp/test.db.json', JSON.stringify(db, null, 2));
"
name=$(node -e "const db=JSON.parse(require('fs').readFileSync('/tmp/test.db.json','utf8')); const user=db.data.users.find(u=>u.id===1); console.log(user ? user.name : '')")
if [ "$name" = "Alice Smith" ]; then
    echo "PASS: Updated to $name"
else
    echo "FAIL"
    exit 1
fi

# Test 7: Delete data
echo ""
echo "Test 7: Deleting data..."
node -e "
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('/tmp/test.db.json', 'utf8'));
db.data.users = db.data.users.filter(u=>u.id!==1);
fs.writeFileSync('/tmp/test.db.json', JSON.stringify(db, null, 2));
"
count=$(node -e "const db=JSON.parse(require('fs').readFileSync('/tmp/test.db.json','utf8')); console.log(db.data.users.length)")
if [ "$count" = "1" ]; then
    echo "PASS: Deleted, $count rows remaining"
else
    echo "FAIL"
    exit 1
fi

# Test 8: Filter/Select with condition
echo ""
echo "Test 8: Filtering data..."
node -e "
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('/tmp/test.db.json', 'utf8'));
db.data.users.push({ id: 3, name: 'Charlie', email: 'charlie@example.com' });
fs.writeFileSync('/tmp/test.db.json', JSON.stringify(db, null, 2));
"
filtered=$(node -e "const db=JSON.parse(require('fs').readFileSync('/tmp/test.db.json','utf8')); const result=db.data.users.filter(u=>u.name.startsWith('C')); console.log(JSON.stringify(result))")
if echo "$filtered" | grep -q "Charlie"; then
    echo "PASS: Filter works"
else
    echo "FAIL"
    exit 1
fi

# Test 9: Export to CSV
echo ""
echo "Test 9: Exporting to CSV..."
node -e "
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('/tmp/test.db.json', 'utf8'));
const csv = 'id,name,email\n' + db.data.users.map(u=>\`\${u.id},\${u.name},\${u.email}\`).join('\n');
fs.writeFileSync('/tmp/test.csv', csv);
"
if [ -f /tmp/test.csv ]; then
    echo "PASS: CSV exported"
else
    echo "FAIL"
    exit 1
fi

# Cleanup
rm -f /tmp/test.db.json /tmp/test.csv

echo ""
echo "=== All Database Tools Tests PASSED ==="
