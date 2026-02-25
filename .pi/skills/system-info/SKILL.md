---
name: system-info
description: "Get system information: CPU, memory, disk, network, processes. Useful for monitoring, debugging, and system analysis. No API key required."
---

# System Info Skill

Get system information for monitoring and debugging.

## When to Use

✅ **USE this skill when:**

- "What's the system status?"
- "How much memory is available?"
- "What processes are running?"
- "Get CPU information"
- "Check disk space"

## When NOT to Use

❌ **DON'T use this skill when:**

- Performance profiling → use specialized profilers
- Security auditing → use security tools
- Hardware diagnostics → use vendor tools

## Commands

### System Overview

```bash
{baseDir}/system.sh info
{baseDir}/system.sh info --json
```

### CPU Information

```bash
{baseDir}/system.sh cpu
{baseDir}/system.sh cpu --usage
{baseDir}/system.sh cpu --cores
```

### Memory Information

```bash
{baseDir}/system.sh memory
{baseDir}/system.sh memory --summary
{baseDir}/system.sh memory --json
```

### Disk Information

```bash
{baseDir}/system.sh disk
{baseDir}/system.sh disk --path /
{baseDir}/system.sh disk --all
```

### Network Information

```bash
{baseDir}/system.sh network
{baseDir}/system.sh network --interfaces
{baseDir}/system.sh network --connections
```

### Process Information

```bash
{baseDir}/system.sh processes
{baseDir}/system.sh processes --top 10
{baseDir}/system.sh processes --by-memory
{baseDir}/system.sh processes --user root
```

### Environment

```bash
{baseDir}/system.sh env
{baseDir}/system.sh env --filter PATH
{baseDir}/system.sh env --json
```

## Output Formats

- **Default**: Human-readable text
- **--json**: JSON output for scripting
- **--summary**: Condensed summary

## Examples

**Quick system overview:**
```bash
{baseDir}/system.sh info
# Output: OS, CPU, Memory, Disk summary
```

**Top processes by memory:**
```bash
{baseDir}/system.sh processes --by-memory --top 5
# Output: Top 5 memory-heavy processes
```

**Check specific disk:**
```bash
{baseDir}/system.sh disk --path /home
# Output: Disk usage for /home
```

**Get process tree:**
```bash
{baseDir}/system.sh processes --tree
# Output: Process tree view
```

## Notes

- Works on Linux and macOS
- Some commands require specific permissions
- Uses system utilities: `ps`, `top`, `free`, `df`, etc.
- JSON output for programmatic use