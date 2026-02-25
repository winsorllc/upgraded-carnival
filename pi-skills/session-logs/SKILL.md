---
name: session-logs
description: Search and analyze PopeBot's own session logs (older/parent conversations) using jq. Use when a user references older conversations or asks what was said before.
metadata:
  {
    "requires": { "bins": ["jq", "rg"] }
  }
---

# session-logs

Search PopeBot's complete conversation history stored in session JSONL files. Use this when the user references prior chats, parent conversations, or historical context.

## Trigger

Use this skill when the user asks about prior chats, parent conversations, or historical context from older sessions.

## Location

Session logs for PopeBot are stored in `logs/` directory in the project root.

- **`logs/*.jsonl`** - Full conversation transcript per session
- Sessions may also exist in `data/` directory for chat history

## Structure

Each `.jsonl` file contains messages with:

- `role`: "user", "assistant", or "tool"
- `content`: Text content or tool calls
- `timestamp`: ISO timestamp when available

## Common Queries

### List all session files by date and size

```bash
for f in logs/*.jsonl; do
  date=$(head -1 "$f" | jq -r '.timestamp // "unknown"' 2>/dev/null | cut -dT -f1)
  size=$(ls -lh "$f" | awk '{print $5}')
  echo "$date $size $(basename $f)"
done | sort -r
```

### Find sessions from a specific day

```bash
for f in logs/*.jsonl; do
  date=$(head -1 "$f" | jq -r '.timestamp // "unknown"' 2>/dev/null | cut -dT -f1)
  if [[ "$date" == "2026-02-25"* ]]; then
    echo "$f"
  fi
done
```

### Extract user messages from a session

```bash
jq -r '.content | if type == "object" then .text else . end' <session>.jsonl 2>/dev/null | head -20
```

### Search for keyword in all sessions

```bash
rg -l "keyword" logs/*.jsonl
```

### Search for keyword in assistant responses

```bash
jq -r '.content | if type == "object" then .text else . end' <session>.jsonl 2>/dev/null | rg -i "keyword"
```

### Count messages in a session

```bash
wc -l <session>.jsonl
```

### Get recent sessions

```bash
ls -lt logs/*.jsonl | head -10
```

## Tips

- Sessions are append-only JSONL (one JSON object per line)
- Large sessions can be several MB - use `head`/`tail` for sampling
- Use `rg` (ripgrep) for fast keyword search across all sessions
- The `jq` tool is required for structured JSON parsing

## Fast text-only hint (low noise)

```bash
jq -r '.content | if type == "object" then .text else . end' <session>.jsonl 2>/dev/null | rg 'keyword'
```
