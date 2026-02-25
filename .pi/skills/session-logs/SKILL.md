---
name: session-logs
description: Search and analyze conversation history stored in JSONL session files. Use when: user asks about prior conversations, wants to find information from previous sessions, or needs to analyze past interactions. No API key needed.
metadata:
  openclaw:
    emoji: "📜"
    requires:
      bins:
        - jq
        - rg
---

# Session Logs Skill

Search and analyze conversation history stored in session JSONL files.

## When to Use

✅ **USE this skill when:**

- User asks about prior chats
- Need to reference parent conversations
- Search for specific topics in conversation history
- Analyze token usage and costs

## Location

Session logs typically live at:
- OpenClaw: `~/.openclaw/agents/<agentId>/sessions/`
- Other agents: Check agent documentation for session path

## Structure

Each `.jsonl` file contains messages with:
- `type`: "session" (metadata) or "message"
- `timestamp`: ISO timestamp
- `message.role`: "user", "assistant", or "toolResult"
- `message.content[]`: Text, thinking, or tool calls
- `message.usage.cost.total`: Cost per response

## Commands

### List All Sessions

```bash
# List sessions by date and size
for f in ~/.openclaw/agents/<agentId>/sessions/*.jsonl; do
  date=$(head -1 "$f" | jq -r '.timestamp' | cut -dT -f1)
  size=$(ls -lh "$f" | awk '{print $5}')
  echo "$date $size $(basename $f)"
done | sort -r
```

### Find Sessions from Specific Day

```bash
for f in ~/.openclaw/agents/<agentId>/sessions/*.jsonl; do
  head -1 "$f" | jq -r '.timestamp' | grep -q "2026-01-06" && echo "$f"
done
```

### Extract User Messages

```bash
# Get all user messages from a session
jq -r 'select(.message.role == "user") | .message.content[]? | select(.type == "text") | .text' <session>.jsonl
```

### Search for Keyword

```bash
# Search for keyword in assistant responses
jq -r 'select(.message.role == "assistant") | .message.content[]? | select(.type == "text") | .text' <session>.jsonl | rg -i "keyword"

# Search across ALL sessions
rg -l "phrase" ~/.openclaw/agents/<agentId>/sessions/*.jsonl
```

### Get Session Cost

```bash
# Total cost for a session
jq -s '[.[] | .message.usage.cost.total // 0] | add' <session>.jsonl

# Daily cost summary
for f in ~/.openclaw/agents/<agentId>/sessions/*.jsonl; do
  date=$(head -1 "$f" | jq -r '.timestamp' | cut -dT -f1)
  cost=$(jq -s '[.[] | .message.usage.cost.total // 0] | add' "$f")
  echo "$date $cost"
done | awk '{a[$1]+=$2} END {for(d in a) print d, "$"a[d]}' | sort -r
```

### Message Statistics

```bash
# Count messages and tokens
jq -s '{
  messages: length,
  user: [.[] | select(.message.role == "user")] | length,
  assistant: [.[] | select(.message.role == "assistant")] | length,
  first: .[0].timestamp,
  last: .[-1].timestamp
}' <session>.jsonl
```

### Tool Usage Breakdown

```bash
# What tools were used
jq -r '.message.content[]? | select(.type == "toolCall") | .name' <session>.jsonl | sort | uniq -c | sort -rn
```

### Fast Text-Only Search

```bash
# Low noise search
jq -r 'select(.type=="message") | .message.content[]? | select(.type=="text") | .text' ~/.openclaw/agents/<agentId>/sessions/<id>.jsonl | rg 'keyword'
```

## Notes

- Sessions are append-only JSONL (one JSON object per line)
- Large sessions can be several MB - use `head`/`tail` for sampling
- Use `agent=<id>` from system prompt Runtime line to find session directory
- Deleted sessions have `.deleted.<timestamp>` suffix
