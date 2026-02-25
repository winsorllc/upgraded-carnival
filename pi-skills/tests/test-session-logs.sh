#!/bin/bash
# Test: Session Logs Skill - Local functionality test

echo "=== Testing Session Logs Skill ==="

# Test 1: Check if jq is available
echo "Test 1: Checking jq availability..."
if command -v jq &> /dev/null; then
    jq_version=$(jq --version)
    echo "PASS: jq version $jq_version"
else
    echo "FAIL: jq not found"
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

# Test 3: Create sample JSONL and test parsing
echo ""
echo "Test 3: JSONL parsing test..."

cat > /tmp/test_session.jsonl << 'JSONL'
{"type":"message","timestamp":"2026-01-15T10:00:00Z","message":{"role":"user","content":[{"type":"text","text":"Hello"}]}}
{"type":"message","timestamp":"2026-01-15T10:00:01Z","message":{"role":"assistant","content":[{"type":"text","text":"Hi there"}]}}
{"type":"message","timestamp":"2026-01-15T10:00:02Z","message":{"role":"user","content":[{"type":"text","text":"How are you"}]}}
{"type":"message","timestamp":"2026-01-15T10:00:03Z","message":{"role":"assistant","content":[{"type":"text","text":"I am doing well"}],"usage":{"cost":{"total":0.005}}}}
JSONL

# Extract user messages
user_msgs=$(jq -r 'select(.message.role == "user") | .message.content[]? | select(.type == "text") | .text' /tmp/test_session.jsonl)
echo "User messages found:"
echo "$user_msgs"

if [ -n "$user_msgs" ]; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

# Test 4: Extract assistant messages
echo ""
echo "Test 4: Assistant message extraction..."
assistant_msgs=$(jq -r 'select(.message.role == "assistant") | .message.content[]? | select(.type == "text") | .text' /tmp/test_session.jsonl)
echo "Assistant messages found:"
echo "$assistant_msgs"

if [ -n "$assistant_msgs" ]; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

# Test 5: Calculate total cost
echo ""
echo "Test 5: Cost calculation..."
total_cost=$(jq -s '[.[] | .message.usage.cost.total // 0] | add' /tmp/test_session.jsonl)
echo "Total cost: $total_cost"
if [ "$total_cost" = "0.005" ] || [ "$total_cost" = "0.0050" ]; then
    echo "PASS"
else
    echo "FAIL - expected 0.005, got $total_cost"
    exit 1
fi

# Test 6: Count messages by role
echo ""
echo "Test 6: Message counting..."
user_count=$(jq -s '[.[] | select(.message.role == "user")] | length' /tmp/test_session.jsonl)
assistant_count=$(jq -s '[.[] | select(.message.role == "assistant")] | length' /tmp/test_session.jsonl)
echo "User messages: $user_count, Assistant messages: $assistant_count"
test6_passed=0
if [ "$user_count" = "2" ]; then
    test6_passed=1
fi
if [ "$assistant_count" = "2" ]; then
    test6_passed=2
fi
if [ $test6_passed -eq 2 ]; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

# Test 7: Get session timestamps
echo ""
echo "Test 7: Timestamp extraction..."
first_ts=$(jq -s '.[0].timestamp' /tmp/test_session.jsonl)
last_ts=$(jq -s '.[-1].timestamp' /tmp/test_session.jsonl)
echo "First timestamp: $first_ts"
echo "Last timestamp: $last_ts"
test7_passed=0
if [ "$first_ts" = "\"2026-01-15T10:00:00Z\"" ]; then
    test7_passed=1
fi
if [ "$last_ts" = "\"2026-01-15T10:00:03Z\"" ]; then
    test7_passed=2
fi
if [ $test7_passed -eq 2 ]; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

echo ""
echo "=== All Session Logs Tests PASSED ==="
rm -f /tmp/test_session.jsonl
