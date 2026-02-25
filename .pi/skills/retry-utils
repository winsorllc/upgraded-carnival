---
name: retry-utils
description: "Smart retry logic with exponential backoff, jitter, and conditions. Run commands with automatic retry on failure. No API key required."
---

# Retry Utils Skill

Execute commands with intelligent retry logic including exponential backoff, jitter, and configurable retry conditions.

## When to Use

✅ **USE this skill when:**

- "Retry this command until it succeeds"
- "Run with exponential backoff"
- "Keep trying until timeout"
- "Retry only on specific errors"
- "Run with retry and backoff"

## When NOT to Use

❌ **DON'T use this skill when:**

- Simple one-shot commands → run directly
- Need to persist command → use systemd/PM2
- Real-time processing → use message queue

## Commands

### Basic Retry

```bash
{baseDir}/retry.sh --command "curl http://api.example.com/data"
{baseDir}/retry.sh --command "npm install" --max-retries 5
```

### Exponential Backoff

```bash
{baseDir}/retry.sh --command "npm install" --backoff exponential
{baseDir}/retry.sh --command "npm install" --backoff exponential --base-delay 2 --max-delay 60
```

### Linear Backoff

```bash
{baseDir}/retry.sh --command "npm install" --backoff linear
{baseDir}/retry.sh --command "npm install" --backoff linear --base-delay 5
```

### Custom Backoff

```bash
{baseDir}/retry.sh --command "npm install" --delays "1,2,5,10,30"
{baseDir}/retry.sh --command "npm install" --delays "1,1,1,5,5,10"
```

### Jitter

```bash
{baseDir}/retry.sh --command "npm install" --jitter full
{baseDir}/retry.sh --command "npm install" --jitter equal --jitter-percent 20
{baseDir}/retry.sh --command "npm install" --jitter decorrelated
```

### Error Matching

```bash
{baseDir}/retry.sh --command "curl api.example.com" --error-pattern "Connection refused"
{baseDir}/retry.sh --command "npm install" --error-pattern "ETIMEDOUT|ENOTFOUND"
{baseDir}/retry.sh --command "curl api.example.com" --exit-codes "1,7,28"
```

### Until/While Conditions

```bash
# Run until output matches pattern
{baseDir}/retry.sh --command "curl -s http://api/health" --until-pattern "ok"

# Run until a timeout
{baseDir}/retry.sh --command "curl http://api/data" --timeout 300

# Stop when pattern found (inverse of until)
{baseDir}/retry.sh --command "tail -f /var/log/app.log" --stop-on "error" --max-retries 100
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--command CMD` | Command to run | Required |
| `--max-retries N` | Maximum retry attempts | 3 |
| `--backoff TYPE` | Backoff type: none, linear, exponential | none |
| `--base-delay SECS` | Initial delay between retries | 1 |
| `--max-delay SECS` | Maximum delay cap | 60 |
| `--jitter TYPE` | Jitter type: none, full, equal, decorrelated | none |
| `--jitter-percent N` | Jitter percentage (0-100) | 20 |
| `--delays "N,N,..."` | Custom delay sequence | None |
| `--error-pattern REGEX` | Only retry if error matches | Match all |
| `--exit-codes "N,..."` | Exit codes to retry on | All non-zero |
| `--until-pattern REGEX` | Continue until output matches | None |
| `--stop-on REGEX` | Stop when output matches | None |
| `--timeout SECS` | Maximum total time | None |
| `--no-exit-on-failure` | Don't exit on final failure | Exit 1 |
| `--quiet` | Suppress output on retries | Show output |
| `--verbose` | Show retry attempts | Silent |

## Backoff Types

| Type | Description | Formula |
|------|-------------|---------|
| `none` | No delay between retries | N/A |
| `linear` | Same delay each time | `delay = base_delay` |
| `exponential` | Doubles each retry | `delay = base_delay * 2^attempt` |

## Jitter Types

| Type | Description |
|------|-------------|
| `none` | No randomization |
| `full` | Random delay from 0 to calculated |
| `equal` | Random delay from `delay/2` to `delay` |
| `decorrelated` | AWS-style decorrelated jitter |

## Examples

**Retry curl request with exponential backoff:**
```bash
{baseDir}/retry.sh --command "curl https://api.example.com/data" \
    --backoff exponential \
    --base-delay 2 \
    --max-delay 60 \
    --max-retries 10
```

**Retry npm install on network errors only:**
```bash
{baseDir}/retry.sh --command "npm install" \
    --error-pattern "ETIMEDOUT|ENOTFOUND|network" \
    --backoff exponential \
    --max-retries 5
```

**Poll for server readiness:**
```bash
{baseDir}/retry.sh --command "curl -s http://localhost:3000/health" \
    --until-pattern "healthy|ok" \
    --max-retries 30 \
    --backoff linear
```

**Run with custom delays:**
```bash
{baseDir}/retry.sh --command "npm install" \
    --delays "1,2,5,10,30,60"
```

## Output

On success, outputs the command result and exit 0.

On failure after all retries:
```
❌ Command failed after 5 attempts: npm install
Last exit code: 1
Last stderr: connection refused
```

Exit codes:
- 0: Command succeeded
- 1: All retries exhausted

## Notes

- Captures both stdout and stderr
- Preserves command exit code on success
- Environment variables passed through
- Can use shell commands with pipes
- Timeout includes all retry attempts