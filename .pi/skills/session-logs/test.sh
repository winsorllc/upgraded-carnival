#!/bin/bash
# Test script for session-logs skill

echo "=== Testing session-logs Skill ==="
echo ""

# Test 1: List all sessions
echo "Test 1: Listing all sessions sorted by date..."
result=$(for f in /job/logs/*/*.jsonl; do
  date=$(head -1 "$f" | jq -r '.timestamp' 2>/dev/null | cut -dT -f1)
  size=$(ls -lh "$f" | awk '{print $5}')
  job_id=$(echo "$f" | cut -d/ -f4)
  echo "$date $size $job_id $(basename "$f")"
done | sort -r)

if [ -n "$result" ]; then
  echo "✅ Found session logs:"
  echo "$result" | head -5
else
  echo "❌ No session logs found"
fi
echo ""

# Test 2: Extract user messages from a session
echo "Test 2: Extracting user messages from latest session..."
latest_session=$(ls -t /job/logs/*/*.jsonl | head -1)
if [ -n "$latest_session" ]; then
  result=$(jq -r 'select(.type == "message" and .message.role == "user") | .message.content[]? | select(.type == "text") | .text' "$latest_session" 2>/dev/null | head -3)
  if [ -n "$result" ]; then
    echo "✅ Found user messages:"
    echo "$result" | head -2
  else
    echo "⚠️ No user messages found (or empty)"
  fi
else
  echo "❌ No sessions found"
fi
echo ""

# Test 3: Count messages
echo "Test 3: Counting messages in session..."
if [ -n "$latest_session" ]; then
  result=$(jq -s '{
    total: length,
    user: [.[] | select(.type == "message" and .message.role == "user")] | length,
    assistant: [.[] | select(.type == "message" and .message.role == "assistant")] | length
  }' "$latest_session" 2>/dev/null)
  if [ -n "$result" ]; then
    echo "✅ Message counts:"
    echo "$result" | jq .
  else
    echo "❌ Failed to count messages"
  fi
fi
echo ""

# Test 4: Search for keyword
echo "Test 4: Searching for 'test' keyword in all sessions..."
result=$(rg -l "test" /job/logs/*/*.jsonl 2>/dev/null | head -3)
if [ -n "$result" ]; then
  echo "✅ Found files containing 'test':"
  echo "$result"
else
  echo "⚠️ No files containing 'test' found"
fi
echo ""

# Test 5: Get job summary
echo "Test 5: Getting job summary..."
if [ -n "$latest_session" ]; then
  echo "=== Session Info ==="
  head -1 "$latest_session" | jq '{session_id: .id, timestamp: .timestamp, cwd: .cwd}' 2>/dev/null
  echo "=== Message Counts ==="
  jq -s '{
    user: [.[] | select(.type == "message" and .message.role == "user")] | length,
    assistant: [.[] | select(.type == "message" and .message.role == "assistant")] | length,
    tools: [.[] | select(.type == "message" and .message.role == "tool_result")] | length
  }' "$latest_session" 2>/dev/null | jq .
  echo "=== Total Cost ==="
  jq -s '[.[] | select(.message.usage.cost.total != null) | .message.usage.cost.total] | add' "$latest_session" 2>/dev/null
fi

echo ""
echo "=== Tests Complete ==="
