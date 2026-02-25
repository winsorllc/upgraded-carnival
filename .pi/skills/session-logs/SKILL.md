---
name: session-logs
description: Search and analyze session logs (conversation history stored in JSONL files) using jq. Use when user references older/parent conversations or asks about prior chats.
---

# Session Logs

Search your complete conversation history stored in session JSONL files.

## Location

Session logs live at: `~/.your-agent/sessions/` or the logs directory configured for your agent.

- **`sessions.json`** - Index mapping session keys to session IDs
- **`<session-id>.jsonl`** - Full conversation transcript per session

## Structure

Each `.jsonl` file contains messages with:

- `type`: "session" (metadata) or "message"
- `timestamp`: ISO timestamp
- `message.role`: "user", "assistant", or "toolResult"
- `message.content[]`: Text, thinking, or tool calls (filter `type=="text"` for human-readable content)
- `message.usage.cost.total`: Cost per response

## Common Queries

### List all sessions by date and size

```bash
for f in ~/.your-agent/sessions/*.jsonl; do
  date=$(head -1 "$f" | jq -r '.timestamp' | cut -dT -f1)
  size=$(ls -lh "$f" | awk '{print $5}')
  echo "$date $size $(basename $f)"
done | sort -r
```

### Find sessions from a specific day

```bash
for f in ~/.your-agent/sessions/*.jsonl; do
  head -1 "$f" | jq -r '.timestamp' | grep -q "2026-01-15" && echo "$f"
done
```

### Extract user messages from a session

```bash
jq -r 'select(.message.role == "user") | .message.content[]? | select(.type == "text") | .text' <session>.jsonl
```

### Search for keyword in assistant responses

```bash
jq -r 'select(.message.role == "assistant") | .message.content[]? | select(.type == "text") | .text' <session>.jsonl | rg -i "keyword"
```

### Get total cost for a session

```bash
jq -s '[.[] | .message.usage.cost.total // 0] | add' <session>.jsonl
```

### Daily cost summary

```bash
for f in ~/.your-agent/sessions/*.jsonl; do
  date=$(head -1 "$f" | jq -r '.timestamp' | cut -dT -f1)
  cost=$(jq -s '[.[] | .message.usage.cost.total // 0] | add' "$f")
  echo "$date $cost"
done | awk '{a[$1]+=$2} END {for(d in a) print d, "$"a[d]}' | sort -r
```

### Count messages and tokens in a session

```bash
jq -s '{
  messages: length,
  user: [.[] | select(.message.role == "user")] | length,
  assistant: [.[] | select(.message.role == "assistant")] | length,
  first: .[0].timestamp,
  last: .[-1].timestamp
}' <session>.jsonl
```

### Tool usage breakdown

```bash
jq -r '.message.content[]? | select(.type == "toolCall") | .name' <session>.jsonl | sort | uniq -c | sort -rn
```

### Search across ALL sessions for a phrase

```bash
jq -r 'select(.message.role == "assistant") | .message.content[]? | select(.type == "text") | .text' ~/.your-agent/sessions/*.jsonl | rg -i "search term"
```

### Get conversation summary

```bash
jq -s '{
  date: .[0].timestamp[:10],
  messages: length,
  user_messages: [.[] | select(.message.role == "user")] | length,
  assistant_messages: [.[] | select(.message.role == "assistant")] | length,
  total_cost: [.[] | .message.usage.cost.total // 0] | add
}' <session>.jsonl
```

## Tips

- Use `jq` for structured queries on JSONL data
- Filter by role to get only user or assistant messages
- Use `rg` (ripgrep) for text search within extracted content
- Session files are named with timestamps for easy identification
