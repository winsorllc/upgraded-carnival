---
name: audit-logger
description: Comprehensive audit logging for agent actions, tool executions, and security events. Inspired by ZeroClaw's command_logger.rs and security hooks system.
---

# Audit Logger

Comprehensive audit logging for agent actions, tool executions, and security events. Track who did what, when, and with what outcome.

## Setup

No additional setup required. Uses SQLite for persistent storage.

## Usage

### Log an Action

```bash
{baseDir}/audit-logger.js log --action "tool_execution" --tool "bash" --user "agent" --details '{"command": "ls -la"}'
```

### Query Audit Logs

```bash
{baseDir}/audit-logger.js query --limit 10 --type "tool_execution"
```

### Export Logs

```bash
{baseDir}/audit-logger.js export --format "json" --output "audit.json"
```

### Check for Security Events

```bash
{baseDir}/audit-logger.js security --hours 24
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--action` | Action type: `tool_execution`, `agent_start`, `agent_end`, `security_event`, `config_change` | Required |
| `--tool` | Tool name that was executed | - |
| `--user` | User or agent identifier | "agent" |
| `--details` | JSON object with additional details | {} |
| `--limit` | Maximum number of logs to return | 50 |
| `--type` | Filter by action type | All |
| `--format` | Export format: `json`, `csv` | json |
| `--output` | Output file path | stdout |
| `--hours` | Time window in hours for security check | 24 |
| `--severity` | Filter by severity: `low`, `medium`, `high`, `critical` | All |

## Action Types

| Type | Description |
|------|-------------|
| `tool_execution` | Tool was executed with command and result |
| `agent_start` | Agent session started |
| `agent_end` | Agent session ended |
| `security_event` | Security-relevant event (rate limit, auth failure) |
| `config_change` | Configuration was modified |
| `rate_limit` | Rate limit was triggered |
| `auth_failure` | Authentication failed |

## Security Events

The security check reports:
- Rate limit triggers
- Authentication failures
- Security policy violations
- Suspicious command patterns

## Response Format

```json
{
  "id": "audit_1234567890",
  "timestamp": "2026-02-25T13:49:00Z",
  "action": "tool_execution",
  "tool": "bash",
  "user": "agent",
  "details": {
    "command": "ls -la",
    "exitCode": 0
  },
  "severity": "low"
}
```

## When to Use

- Tracking all tool executions for compliance
- Security incident investigation
- Monitoring agent activity patterns
- Audit trails for operational reviews
- Detecting suspicious activity patterns
