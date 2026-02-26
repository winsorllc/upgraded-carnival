---
name: diagnostic-runner
description: "Run system diagnostics and health checks. Inspect environment, dependencies, permissions, and configuration. Inspired by ZeroClaw/OpenClaw 'doctor' command."
---

# Diagnostic Runner Skill

Run comprehensive system diagnostics to identify issues, verify configurations, and report system health.

## When to Use

Γ£à **USE this skill when:**

- "Run diagnostics on the system"
- "Check if everything is configured correctly"
- "Verify dependencies are installed"
- "Troubleshoot system issues"
- "Generate a health report"
- "Check environment status"

## When NOT to Use

Γ¥î **DON'T use this skill when:**

- Simple file operations ΓåÆ use bash directly
- Installing packages ΓåÆ use package manager
- Network requests ΓåÆ use http-request

## Commands

### Full Diagnostic

```bash
{baseDir}/diagnose.sh
```

Runs all diagnostic checks and outputs a comprehensive report.

### Quick Health Check

```bash
{baseDir}/diagnose.sh --quick
```

Runs essential checks only (faster).

### Specific Check Categories

```bash
{baseDir}/diagnose.sh --category environment
{baseDir}/diagnose.sh --category dependencies
{baseDir}/diagnose.sh --category permissions
{baseDir}/diagnose.sh --category network
{baseDir}/diagnose.sh --category config
{baseDir}/diagnose.sh --category storage
```

### Output Formats

```bash
{baseDir}/diagnose.sh --format json
{baseDir}/diagnose.sh --format markdown
{baseDir}/diagnose.sh --format text
```

## Diagnostic Categories

| Category | Checks |
|----------|--------|
| `environment` | Node.js version, Python version, PATH, env vars, shell config |
| `dependencies` | Installed tools, package managers, runtime versions |
| `permissions` | File read/write access, directory permissions, sudo status |
| `network` | DNS resolution, outbound connectivity, port availability |
| `config` | Config file validity, required fields, deprecated settings |
| `storage` | Disk space, inode usage, temp directory access, file handles |

## Output Format (JSON)

```json
{
  "timestamp": "2026-02-25T20:41:00Z",
  "status": "pass|warn|fail",
  "summary": {
    "passed": 12,
    "warnings": 3,
    "failed": 0
  },
  "checks": [
    {
      "category": "environment",
      "name": "Node.js Version",
      "status": "pass",
      "message": "v22.0.0 (required: >=18)",
      "details": {...}
    }
  ]
}
```

## Examples

**Full diagnostic:**
```bash
{baseDir}/diagnose.sh
```

**Quick check with JSON output:**
```bash
{baseDir}/diagnose.sh --quick --format json
```

**Check only environment and dependencies:**
```bash
{baseDir}/diagnose.sh --category environment --category dependencies
```

## Notes

- Non-destructive: only reads and verifies, never modifies
- Safe to run at any time
- Can be automated for scheduled health monitoring
- Exit code 0 = all passed, 1 = warnings, 2 = failures
