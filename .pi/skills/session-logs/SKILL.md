---
name: session-logs
description: Search and analyze your own session logs (older/parent conversations) using jq.
metadata: { "popebot": { "emoji": "📜", "requires": { "bins": ["jq", "rg"] } } }
---

# session-logs

Search your complete conversation history stored in session JSONL files. Use this when a user references older/parent conversations or asks what was said before.

## Trigger

Use this skill when the user asks about prior chats, parent conversations, or historical context that isn't in memory files.

## Location

Session logs live at: `/job/logs/`

- **`<JOB_ID>/session.jsonl`** - Full conversation transcript per job session

## Structure

Each `.jsonl` file contains messages with:

- `role`: "user", "assistant", or "tool"
- `content`: Text content or tool calls
- `timestamp`: ISO timestamp (if available)
- `usage`: Token usage and cost info

## Common Queries

### List all sessions by date and size

```bash
for f in /job/logs/*/session.jsonl; do
  job_id=$(dirname "$f" | xargs basename)
  size=$(ls -lh "$f" 2>/dev/null | awk '{print $5}')
  lines=$(wc -l < "$f" 2>/dev/null)
  echo "$job_id $size $lines lines"
done | sort -r
```

### Find sessions from a specific job

```bash
jq -r 'select(.role == "user") | .content' /job/logs/<JOB_ID>/session.jsonl
```

### Extract user messages from a session

```bash
jq -r 'select(.role == "user") | .content' /job/logs/<JOB_ID>/session.jsonl
```

### Extract assistant messages from a session

```bash
jq -r 'select(.role == "assistant") | .content' /job/logs/<JOB_ID>/session.jsonl
```

### Search for keyword in assistant responses

```bash
jq -r 'select(.role == "assistant") | .content' /job/logs/<JOB_ID>/session.jsonl | rg -i "keyword"
```

### Search across ALL sessions for a phrase

```bash
for f in /job/logs/*/session.jsonl; do
  job_id=$(dirname "$f" | xargs basename)
  matches=$(jq -r 'select(.role == "assistant") | .content' "$f" | rg -i "keyword" | wc -l)
  [ "$matches" -gt 0 ] && echo "$job_id: $matches matches"
done
```

### Count messages per session

```bash
for f in /job/logs/*/session.jsonl; do
  job_id=$(dirname "$f" | xargs basename)
  user=$(jq -r 'select(.role == "user")' "$f" | wc -l)
  assistant=$(jq -r 'select(.role == "assistant")' "$f" | wc -l)
  echo "$job_id: $user user, $assistant assistant"
done
```

### Get the last N messages from a session

```bash
tail -n 20 /job/logs/<JOB_ID>/session.jsonl | jq -r '.role + ": " + (.content // "")'
```

### Find sessions with tool usage

```bash
for f in /job/logs/*/session.jsonl; do
  job_id=$(dirname "$f" | xargs basename)
  tools=$(jq -r 'select(.tool_call_id != null) | .name' "$f" 2>/dev/null | sort | uniq -c | sort -rn | head -5)
  [ -n "$tools" ] && echo "=== $job_id ===" && echo "$tools"
done
```

## Tool Functions

This skill provides helper functions for searching session logs.

### search_sessions(keyword, limit=10)

Searches all session logs for a keyword and returns matching sessions.

### get_session_messages(job_id, role=null)

Retrieves messages from a specific session, optionally filtered by role.

### summarize_session(job_id)

Provides a summary of a session including message counts and topics.
