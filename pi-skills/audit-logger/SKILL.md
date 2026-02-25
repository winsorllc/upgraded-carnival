---
name: audit-logger
description: Comprehensive audit logging for agent actions, tool executions, and security events. Inspired by ZeroClaw's skill audit system.
version: 1.0.0
author: zeroclaw-inspired
tags:
  - audit
  - logging
  - security
  - compliance
  - monitoring
capabilities:
  - Log all agent tool executions
  - Track file system changes
  - Record command executions
  - Security event tracking
  - Compliance-ready audit trails
  - Search and query audit logs
requires: []
environment:
  AUDIT_DIR: "./audit-logs"
  AUDIT_LEVEL: "info"
  AUDIT_RETENTION_DAYS: "90"
---

# Audit Logger Skill

This skill provides comprehensive audit logging for agent actions, tool executions, and security events. It's inspired by ZeroClaw's skill audit system and provides a complete audit trail for compliance and security monitoring.

## Overview

The audit logger captures:
- **Tool executions** - All tools called, their parameters, and results
- **File operations** - Read, write, edit operations on files
- **Command executions** - Shell commands run by the agent
- **Security events** - Authentication, authorization, and security-relevant events
- **Agent actions** - High-level actions like creating branches, PRs, etc.

## Commands

### Log an event
```
audit log --type <type> --message <message> [--data <json>] [--level <level>]
```
Log an audit event with specified type and details.

### Query logs
```
audit query [--type <type>] [--start <date>] [--end <date>] [--limit <n>] [--format json|text]
```
Query audit logs with filters.

### Show recent events
```
audit recent [--count <n>] [--type <type>]
```
Show the most recent audit events.

### Generate report
```
audit report [--start <date>] [--end <date>] [--format json|markdown|html]
```
Generate an audit report for a time period.

### Stats
```
audit stats [--period <day|week|month>]
```
Show audit statistics.

### Clean old logs
```
audit clean [--older-than <days>]
```
Remove audit logs older than specified days.

## Event Types

| Type | Category | Description |
|------|----------|-------------|
| `tool_execution` | Action | Tool was executed |
| `file_read` | File | File was read |
| `file_write` | File | File was written |
| `file_edit` | File | File was edited |
| `file_delete` | File | File was deleted |
| `command_execution` | Action | Shell command executed |
| `git_branch_created` | Git | Git branch created |
| `git_branch_deleted` | Git | Git branch deleted |
| `git_commit` | Git | Git commit made |
| `git_pr_created` | Git | Pull request created |
| `git_pr_merged` | Git | Pull request merged |
| `auth_success` | Security | Authentication successful |
| `auth_failure` | Security | Authentication failed |
| `permission_denied` | Security | Permission denied |
| `api_request` | API | External API request |
| `agent_error` | Error | Agent error occurred |
| `agent_action` | Action | General agent action |

## Log Format

Each audit entry is a JSON object:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "type": "tool_execution",
  "level": "info",
  "message": "Executed tool: bash",
  "data": {
    "tool": "bash",
    "command": "ls -la",
    "exitCode": 0,
    "duration_ms": 45
  },
  "source": {
    "agent": "main",
    "session": "abc123"
  }
}
```

## Audit Levels

| Level | Use Case |
|-------|----------|
| `debug` | Detailed debugging information |
| `info` | Normal operations |
| `warning` | Potential issues |
| `error` | Errors that need attention |
| `critical` | Critical security events |

## Retention Policy

By default, logs are retained for 90 days. Configure via:
```bash
export AUDIT_RETENTION_DAYS=90
```

## Security Considerations

- Logs are append-only (no modification of past events)
- Sensitive data (API keys, passwords) is automatically redacted
- Logs include immutable timestamps and session IDs
- Cryptographic signatures can be enabled for integrity verification

## Usage Examples

### Log a tool execution
```bash
audit log --type tool_execution --message "Executed bash tool" \
  --data '{"command": "ls -la", "exitCode": 0, "duration_ms": 45}'
```

### Query for errors
```bash
audit query --type agent_error --level error --limit 50
```

### Generate daily report
```bash
audit report --start 2024-01-15 --end 2024-01-16 --format markdown
```

### Check file activity
```bash
audit query --type file_write --format json | jq '.[] | .data.path'
```

## Integration

Use in your agent code:

```javascript
import { audit } from './audit-logger.js';

async function myTool(args) {
  const start = Date.now();
  try {
    // Tool logic
    const result = await doWork(args);
    
    await audit.log({
      type: 'tool_execution',
      message: `Tool completed: ${args.tool}`,
      data: { ...result, duration_ms: Date.now() - start }
    });
    
    return result;
  } catch (err) {
    await audit.log({
      type: 'agent_error',
      message: `Tool failed: ${err.message}`,
      level: 'error',
      data: { error: err.message }
    });
    throw err;
  }
}
```

## Retention

Old logs can be cleaned up:
```bash
# Clean logs older than 30 days
audit clean --older-than 30

# Show stats before cleaning
audit stats
```
