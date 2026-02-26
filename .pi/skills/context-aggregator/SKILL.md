---
name: context-aggregator
description: Generate unified session summaries combining conversation history, file operations, and token usage into a single comprehensive report. Use when: (1) job completes and you need to report results, (2) user asks what was accomplished, (3) summarizing work across multiple dimensions, or (4) creating audit trails of agent activity.
---

# Context Aggregator

Generate unified session summaries that consolidate conversation history, file operations, and resource usage into comprehensive reports. This skill is essential for job completion notifications, progress reports, and audit trails.

## When to Use

- **Job completion**: Generate a final summary when finishing a job
- **Progress updates**: Provide mid-session summaries to the user
- **Handoff reports**: Document what was accomplished for human review
- **Audit trails**: Create complete records of agent activity
- **Cost reporting**: Track token usage and API costs across sessions

## How It Works

The aggregator pulls from multiple data sources:
1. **Session logs**: Conversation history (user/assistant messages)
2. **File operations**: Reads, writes, and edits performed
3. **Token usage**: LLM token consumption and cost tracking

## Usage

### Generate a full session summary

```bash
context-aggregator summary
```

### Generate a brief summary (for notifications)

```bash
context-aggregator brief
```

### Export as JSON (for programmatic use)

```bash
context-aggregator json
```

### Show only conversation highlights

```bash
context-aggregator conversation
```

### Show only file changes

```bash
context-aggregator files
```

### Show cost breakdown

```bash
context-aggregator cost
```

### Generate a complete report

```bash
context-aggregator report --output /job/logs/session-report.md
```

### Include file diffs in report

```bash
context-aggregator report --include-diffs --output /job/logs/session-report.md
```

## Output Formats

### Brief Summary (for notifications)

```
📊 Session Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️  Duration: 23 minutes
💬 Messages: 12 (4 user, 8 assistant)
📁 Files: 15 operations (3 reads, 8 edits, 4 writes)
🔢 Tokens: 45,230 (~$0.82)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Accomplished:
• Created data processing pipeline
• Fixed authentication bug
• Updated API documentation
```

### Full Report (Markdown)

```markdown
# Session Report

**Generated:** 2026-02-25 14:30:00 UTC
**Session ID:** job-abc123

## Conversation Summary

| Time | Role | Summary |
|------|------|---------|
| 14:07 | User | Analyze the codebase for performance issues |
| 14:08 | Assistant | I'll analyze the codebase using the code-indexer... |
| 14:15 | Assistant | Found 3 critical bottlenecks in the processing pipeline |
| 14:20 | User | Fix the main bottleneck |
| 14:28 | Assistant | Implemented caching solution, 10x speedup achieved |

**Total Messages:** 12 (4 user, 8 assistant)

## File Operations

### Reads (3)
- `/job/src/main.ts` - Loaded entry point
- `/job/src/processor.ts` - Analyzed processing logic
- `/job/config/settings.json` - Read configuration

### Edits (8)
- `/job/src/cache.ts` - Added LRU cache implementation
- `/job/src/processor.ts` - Integrated cache, optimized loops
- `/job/tests/processor.test.ts` - Updated tests

### Writes (4)
- `/job/logs/analysis.md` - Performance analysis report
- `/job/logs/optimization.md` - Optimization recommendations

## Resource Usage

| Metric | Value |
|--------|-------|
| Total Tokens | 45,230 |
| Input Tokens | 28,450 |
| Output Tokens | 16,780 |
| Estimated Cost | $0.82 |
| Duration | 23 minutes |

## Key Accomplishments

1. **Performance Analysis**: Identified 3 critical bottlenecks
2. **Cache Implementation**: Added LRU cache reducing DB queries
3. **Test Coverage**: Updated tests with new test cases
4. **Documentation**: Created optimization recommendations
```

### JSON Output

```json
{
  "sessionId": "job-abc123",
  "generatedAt": "2026-02-25T14:30:00Z",
  "duration": "23 minutes",
  "conversation": {
    "totalMessages": 12,
    "userMessages": 4,
    "assistantMessages": 8,
    "highlights": [
      "User requested performance analysis",
      "Identified 3 critical bottlenecks",
      "Implemented LRU cache solution"
    ]
  },
  "files": {
    "total": 15,
    "reads": 3,
    "edits": 8,
    "writes": 4,
    "paths": [
      "/job/src/main.ts",
      "/job/src/processor.ts",
      "/job/src/cache.ts"
    ]
  },
  "usage": {
    "totalTokens": 45230,
    "inputTokens": 28450,
    "outputTokens": 16780,
    "estimatedCost": 0.82,
    "currency": "USD"
  }
}
```

## Integration with Other Skills

- **With email-agent**: Send session summary via email on job completion
- **With voice-output**: Announce summary when job completes
- **With memory-agent**: Store session summary for future reference
- **With session-files**: Provides file operation data
- **With model-usage**: Provides token/cost data

## Session Data Locations

The aggregator looks for data in these locations:
- **Conversation**: `/job/logs/<job-id>/session.jsonl`
- **File operations**: `/job/logs/<job-id>/files.jsonl`
- **Token usage**: `/job/logs/<job-id>/usage.jsonl`

## Tips

1. **Run early and often**: Use `context-aggregator brief` during long jobs for checkpoints
2. **Custom output**: Use `--format markdown` or `--format json` for different needs
3. **Filter concerns**: Use `--include-files` or `--include-conversation` to focus output
4. **Automated reporting**: Add to job completion workflow for automatic reporting
