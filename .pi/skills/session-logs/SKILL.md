---
name: session-logs
description: Search and analyze PopeBot job session logs using jq. Use when: (1) user asks about prior jobs or conversations, (2) finding patterns across past work, (3) retrieving context from previous agent runs, (4) analyzing job history or statistics. Requires jq and ripgrep.
metadata: { "requires": { "bins": ["jq", "rg"] } }
---

# Session Logs

Search and analyze PopeBot's job session logs stored in JSONL format. Use this skill when users reference prior jobs, conversations, or need historical context.

## Log Location

Session logs are stored in `/job/logs/<job-id>/` directories:

- **Pattern**: `/job/logs/<job-id>/<timestamp>_<session-id>.jsonl`
- **Index**: `/job/logs/<job-id>/job.config.json` contains job metadata

## Log Structure

Each `.jsonl` file contains message objects with these fields:

| Field | Description |
|-------|-------------|
| `type` | Message type: "session", "model_change", "thinking_level_change", "message" |
| `id` | Unique message ID |
| `parentId` | Parent message ID for threading |
| `timestamp` | ISO timestamp |
| `message.role` | "user", "assistant", or "tool_result" |
| `message.content[]` | Array of content blocks (text, thinking, tool_call, tool_result) |
| `message.usage.cost.total` | Cost in USD |

## Essential Commands

### List all sessions sorted by date

```bash
for f in /job/logs/*/*.jsonl; do
  date=$(head -1 "$f" | jq -r '.timestamp' 2>/dev/null | cut -dT -f1)
  size=$(ls -lh "$f" | awk '{print $5}')
  job_id=$(echo "$f" | cut -d/ -f4)
  echo "$date $size $job_id $(basename "$f")"
done | sort -r
```

### Find sessions from a specific date

```bash
for f in /job/logs/*/*.jsonl; do
  head -1 "$f" | jq -r '.timestamp' 2>/dev/null | grep -q "2026-02-25" && echo "$f"
done
```

### Extract all user messages from a session

```bash
jq -r 'select(.type == "message" and .message.role == "user") | .message.content[]? | select(.type == "text") | .text' <session>.jsonl
```

### Extract all assistant responses from a session

```bash
jq -r 'select(.type == "message" and .message.role == "assistant") | .message.content[]? | select(.type == "text") | .text' <session>.jsonl
```

### Search for keyword in all sessions

```bash
rg -l "keyword" /job/logs/*/*.jsonl
```

### Get total cost for a session

```bash
jq -s '[.[] | select(.message.usage.cost.total != null) | .message.usage.cost.total] | add' <session>.jsonl
```

### Daily cost summary

```bash
for f in /job/logs/*/*.jsonl; do
  date=$(head -1 "$f" | jq -r '.timestamp' 2>/dev/null | cut -dT -f1)
  cost=$(jq -s '[.[] | select(.message.usage.cost.total != null) | .message.usage.cost.total] | add' "$f")
  echo "$date $cost"
done | awk '{a[$1]+=$2} END {for(d in a) printf "%s $%.4f\n", d, a[d]}' | sort -r
```

### Count messages in a session

```bash
jq -s '{
  total: length,
  user: [.[] | select(.type == "message" and .message.role == "user")] | length,
  assistant: [.[] | select(.type == "message" and .message.role == "assistant")] | length,
  tool_results: [.[] | select(.type == "message" and .message.role == "tool_result")] | length
}' <session>.jsonl
```

### Tool usage breakdown

```bash
jq -r '.message.content[]? | select(.type == "tool_call") | .name' <session>.jsonl 2>/dev/null | sort | uniq -c | sort -rn
```

### Get job summary (quick overview)

```bash
echo "=== Session Info ===" && head -1 <session>.jsonl | jq '{job_id: .id, timestamp: .timestamp, cwd: .cwd}'
echo "=== Message Counts ===" && jq -s '{
  user: [.[] | select(.type == "message" and .message.role == "user")] | length,
  assistant: [.[] | select(.type == "message" and .message.role == "assistant")] | length,
  tools: [.[] | select(.type == "message" and .message.role == "tool_result")] | length
}' <session>.jsonl
echo "=== Total Cost ===" && jq -s '[.[] | select(.message.usage.cost.total != null) | .message.usage.cost.total] | add' <session>.jsonl
```

## Fast Text Search (Low Noise)

Extract human-readable content only:

```bash
jq -r 'select(.type == "message") | .message.content[]? | select(.type == "text") | .text' <session>.jsonl | rg -i "keyword"
```

## Tips

- Session files can be several MB; use `head`/`tail` for sampling
- Use `select(.type == "message")` to filter only actual messages
- The `job.config.json` contains task description and configuration
- `job.md` in each log directory contains the original task prompt
