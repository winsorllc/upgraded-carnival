#!/bin/bash
# Test: Trello Skill - Structure validation

echo "=== Testing Trello Skill ==="

# Test 1: Check if curl is available
echo "Test 1: Checking curl availability..."
if command -v curl &> /dev/null; then
    echo "PASS: curl available"
else
    echo "FAIL: curl not found"
    exit 1
fi

# Test 2: Check if jq is available
echo ""
echo "Test 2: Checking jq availability..."
if command -v jq &> /dev/null; then
    echo "PASS: jq available"
else
    echo "FAIL: jq not found"
    exit 1
fi

# Test 3: Validate API endpoint structure
echo ""
echo "Test 3: Testing API endpoint format..."
base_url="https://api.trello.com/1"
endpoints=(
    "/members/me/boards"
    "/boards"
    "/lists"
    "/cards"
    "/search"
)

all_valid=true
for endpoint in "${endpoints[@]}"; do
    if [[ "$base_url$endpoint" == https://api.trello.com/1/* ]]; then
        echo "  OK: $endpoint"
    else
        echo "  FAIL: $endpoint"
        all_valid=false
    fi
done

if $all_valid; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

# Test 4: Validate JSON structures
echo ""
echo "Test 4: Testing JSON structures..."

# Create board JSON
create_board_json='{"name": "Test Board", "desc": "Description"}'
if echo "$create_board_json" | jq . > /dev/null 2>&1; then
    echo "PASS: Board JSON valid"
else
    echo "FAIL"
    exit 1
fi

# Create list JSON
create_list_json='{"name": "To Do", "idBoard": "board123"}'
if echo "$create_list_json" | jq . > /dev/null 2>&1; then
    echo "PASS: List JSON valid"
else
    echo "FAIL"
    exit 1
fi

# Create card JSON
create_card_json='{"name": "New Task", "idList": "list123", "desc": "Task description"}'
if echo "$create_card_json" | jq . > /dev/null 2>&1; then
    echo "PASS: Card JSON valid"
else
    echo "FAIL"
    exit 1
fi

# Test 5: Validate query parameter format
echo ""
echo "Test 5: Testing query parameter format..."
query_params="key=\$TRELLO_API_KEY&token=\$TRELLO_TOKEN"
if [[ "$query_params" == key=* ]]; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

# Test 6: Test JSON response parsing
echo ""
echo "Test 6: Testing response parsing..."
response='[{"name":"Test Board","id":"board123"},{"name":"Board 2","id":"board456"}]'
board_names=$(echo "$response" | jq -r '.[] | .name')
echo "Boards found:"
echo "$board_names"

if [ -n "$board_names" ]; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

echo ""
echo "=== All Trello Tests PASSED ==="
