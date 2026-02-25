---
name: session-search
description: Search and analyze PopeBot job session logs using jq and rg. Use when you need to find patterns, solutions, or discussions from past autonomous agent jobs.
---

# session-search Skill

Search your complete conversation history stored in job session JSONL files. Use this when you need to find how similar problems were solved in past jobs, reference previous code patterns, or answer questions about past agent work.

## Trigger

Use this skill when:
- User asks about "what was done before" or "how was X solved"
- You need to reference solutions from past autonomous jobs
- Searching for code patterns, tools used, or approaches taken
- Reviewing cost/token usage across jobs

## Location

Session logs live at: `/job/logs/<JOB_ID>/*.jsonl`

Each job folder contains:
- `job.md` - The original task prompt
- `*.jsonl` - Full conversation transcripts (multiple sessions per job)
- `job.config.json` - Job configuration

## Structure

Each `.jsonl` file contains messages with:
- `type`: "session" (metadata), "message", "thinking_level_change", or "model_change"
- `timestamp`: ISO timestamp
- `message.role`: "user", "assistant", or "toolResult"
- `message.content[]`: Text, thinking, or tool calls (filter `type=="text"` for human-readable content)
- `message.usage.cost.total`: Cost per response

## Commands

### List all jobs by date and size

```bash
for dir in /job/logs/*/; do
  if [ -d "$dir" ]; then
    job_id=$(basename "$dir")
    first_log=$(ls -t "$dir"/*.jsonl 2>/dev/null | head -1)
    if [ -n "$first_log" ]; then
      date=$(head -1 "$first_log" | jq -r '.timestamp' | cut -dT -f1)
      size=$(du -sh "$dir" | cut -f1)
      echo "$date $size $job_id"
    fi
  fi
done | sort -r
```

### Find jobs from a specific day

```bash
for dir in /job/logs/*/; do
  ls "$dir"/*.jsonl 2>/dev/null | while read f; do
    head -1 "$f" | jq -r '.timestamp' 2>/dev/null | grep -q "2026-02-25" && echo "$dir"
  done
done | sort -u
```

### Extract user prompts from a session

```bash
jq -r 'select(.message.role == "user") | .message.content[]? | select(.type == "text") | .text' <session>.jsonl
```

### Search for keyword in assistant responses

```bash
jq -r 'select(.message.role == "assistant") | .message.content[]? | select(.type == "text") | .text' <session>.jsonl | rg -i "keyword"
```

### Get total cost for a job

```bash
cat /job/logs/<JOB_ID>/*.jsonl | jq -s '[.[] | .message.usage.cost.total // 0] | add'
```

### Search across ALL sessions for a phrase

```bash
rg -l "phrase" /job/logs/*/*.jsonl
```

### Find jobs where a specific tool was used

```bash
for dir in /job/logs/*/; do
  if grep -q '"toolName":"bash"' "$dir"/*.jsonl 2>/dev/null; then
    echo "$(basename "$dir")"
  fi
done
```

### Get tool usage breakdown for a job

```bash
cat /job/logs/<JOB_ID>/*.jsonl | jq -r '.message.content[]? | select(.type == "toolCall") | .name' | sort | uniq -c | sort -rn
```

### Find the job prompt for a job

```bash
cat /job/logs/<JOB_ID>/job.md
```

### Search job prompts for a topic

```bash
rg -l "topic" /job/logs/*/job.md
```

### Find most recent job on a topic

```bash
for dir in $(ls -t /job/logs/*/); do
  if rg -q "topic" "$dir"/*.jsonl 2>/dev/null; then
    echo "$dir"
    break
  fi
done
```

## Tips

- Sessions are append-only JSONL (one JSON object per line)
- Large jobs can have many session files (each represents a model switch or thinking level change)
- Use `head -1` to sample the first message of a session for metadata
- The `job.md` file contains the original task prompt - always check this first for context
- Costs accumulate across all session files in a job folder

## Fast text-only hint (low noise)

```bash
cat /job/logs/<JOB_ID>/*.jsonl | jq -r 'select(.type=="message") | .message.content[]? | select(.type=="text") | .text' | rg 'keyword'
```

## Example: Find how a similar task was solved

```bash
# 1. Find jobs about "email" or "send"
rg -l "email|send" /job/logs/*/job.md

# 2. Look at the most recent result
head -50 /job/logs/<found_job_id>/job.md

# 3. Search the session for the solution pattern
cat /job/logs/<found_job_id>/*.jsonl | jq -r 'select(.message.role == "assistant") | .message.content[]? | select(.type == "text") | .text' | rg -A 10 -B 2 "send_email"
```
