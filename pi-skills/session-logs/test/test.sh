#!/bin/bash
# Test script for session-logs skill

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
TEST_DIR="$SCRIPT_DIR/sessions"

echo "=== Testing session-logs skill ==="
echo ""

# Test 1: Check required tools
echo "Test 1: Checking required tools..."
if command -v jq &> /dev/null; then
  echo "✓ jq is installed"
else
  echo "✗ jq is NOT installed"
  exit 1
fi

# rg is optional - try to use grep as fallback
if command -v rg &> /dev/null; then
  echo "✓ rg (ripgrep) is installed"
  HAS_RG=true
else
  echo "⚠ rg not installed - will use grep as fallback"
  HAS_RG=false
fi

# Test 2: List sessions
echo ""
echo "Test 2: Testing session list..."
result=$(cd "$TEST_DIR" && for f in *.jsonl; do
  date=$(head -1 "$f" 2>/dev/null | jq -r '.timestamp // "unknown"' 2>/dev/null | cut -dT -f1 || echo "unknown")
  size=$(ls -lh "$f" | awk '{print $5}')
  echo "$date $size $f"
done | sort -r)
echo "$result"
if echo "$result" | grep -q "sample-001.jsonl"; then
  echo "✓ Session list works"
else
  echo "✗ Session list failed"
  exit 1
fi

# Test 3: Count messages
echo ""
echo "Test 3: Testing message count..."
count=$(wc -l < "$TEST_DIR/sample-001.jsonl")
echo "Message count: $count"
if [ "$count" -eq 6 ]; then
  echo "✓ Message count works"
else
  echo "✗ Message count failed (expected 6, got $count)"
  exit 1
fi

# Test 4: Extract user messages
echo ""
echo "Test 4: Testing user message extraction..."
user_messages=$(jq -r 'select(.role == "user") | .content' "$TEST_DIR/sample-001.jsonl" 2>/dev/null)
echo "$user_messages"
if echo "$user_messages" | grep -q "Hello"; then
  echo "✓ User message extraction works"
else
  echo "✗ User message extraction failed"
  exit 1
fi

# Test 5: Search across sessions
echo ""
echo "Test 5: Testing search..."
if [ "$HAS_RG" = true ]; then
  found=$(rg -l "Rust" "$TEST_DIR"/*.jsonl 2>/dev/null)
else
  found=$(grep -l "Rust" "$TEST_DIR"/*.jsonl 2>/dev/null || true)
fi
echo "Found in: $found"
if echo "$found" | grep -q "sample-001.jsonl"; then
  echo "✓ Search works"
else
  echo "✗ Search failed"
  exit 1
fi

# Test 6: Test helper script
echo ""
echo "Test 6: Testing helper script..."
if [ -f "$SKILL_DIR/scripts/session-helper.sh" ]; then
  SESSION_DIR="$TEST_DIR" bash "$SKILL_DIR/scripts/session-helper.sh" list
  echo "✓ Helper script works"
else
  echo "✗ Helper script not found"
  exit 1
fi

echo ""
echo "=== All tests passed! ==="
