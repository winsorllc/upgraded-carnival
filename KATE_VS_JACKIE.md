# Head-to-Head: Kate vs Jackie's Skills
**Date:** 2026-02-26T02:33:19.654Z
**Challenge:** Can Kate (kimi-k2.5) genuinely IMPROVE Jackie's (glm-5) skills?

---

## Skill: system-info

### Jackie's Original (303 words)

```markdown
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
```

### Kate's Improved Version (1249 words, 45.4s)

```
---
name: system-info
description: "Comprehensive system information gathering: CPU, memory, disk I/O, network, processes, hardware sensors, and environment diagnostics. Supports monitoring, debugging, capacity planning, and automated health checks. No API key required; read-only operations."
version: "2.0"
tags: [monitoring, diagnostics, system-admin, devops, troubleshooting]
---

# System Info Skill

Retrieve detailed system telemetry for monitoring, debugging, capacity planning, and automated health checks. Designed for cross-platform use (Linux, macOS, Windows/WSL) with container-aware detection.

## When to Use

✅ **USE this skill when:**

- "Show system health overview" or dashboard generation
- "Why is the system slow?" — performance baseline analysis
- "Check disk space before deployment" — pre-flight checks
- "Monitor memory growth over time" — leak detection
- "List processes consuming >50% CPU" — resource hogs
- "Export system state for debugging" — support tickets
- "Verify environment variables in CI/CD" — pipeline debugging
- "Check thermal throttling" — hardware diagnostics
- "Which ports are in use?" — network conflict resolution
- "Compare current state to baseline" — drift detection

## When NOT to Use

❌ **DON'T use this skill when:**

- **Real-time profiling** → Use `perf`, `oprofile`, or language-specific profilers (this skill has ~100ms sampling overhead)
- **Security vulnerability scanning** → Use `lynis`, `OpenSCAP`, or `nessus`
- **Deep hardware diagnostics** → Use vendor tools (SMART tests, `memtest86`, Apple Diagnostics)
- **Log analysis** → Use `journalctl`, `splunk`, or ELK stack (this only shows live system state)
- **Network penetration testing** → Use `nmap`, `masscan`
- **Binary reverse engineering** → Use `gdb`, `radare2`

## Prerequisites & Permissions

- **Linux**: `procps`, `sysstat`, `coreutils` (optional: `lm-sensors` for temps, `pciutils` for hardware)
- **macOS**: `osx-cpu-temp` (optional), `iostat` (installed by default)
- **Permissions**: Most commands work as non-root; hardware details, all processes, and network sockets may require `sudo`
- **Containers**: Limited `/proc` access in Docker; some hardware metrics unavailable

## Command Reference

### Global Flags (available on all commands)
- `--json`: Machine-readable JSON with schema versioning
- `--summary`: Condensed single-line output
- `--watch <seconds>`: Continuous monitoring (e.g., `--watch 2` for every 2s)
- `--threshold <value>`: Alert when metric exceeds value (e.g., `--threshold 90%`)
- `--export <file>`: Save to file (supports .json, .csv, .txt)

### System Overview & Health

```bash
# Complete system snapshot
{baseDir}/system.sh overview
{baseDir}/system.sh overview --health-score    # 0-100 rating
{baseDir}/system.sh overview --compare <previous.json>  # Diff mode

# Load and uptime
{baseDir}/system.sh load [--history <minutes>]
{baseDir}/system.sh uptime [--since]

# System identification
{baseDir}/system.sh identity [--docker|--vm-detect]
```

### CPU & Thermal

```bash
# CPU details
{baseDir}/system.sh cpu --verbose              # Architecture, flags, vulnerabilities
{baseDir}/system.sh cpu --usage [--per-core]   # Real-time utilization
{baseDir}/system.sh cpu --loadavg              # 1/5/15 minute averages
{baseDir}/system.sh cpu --gov                  # Scaling governor (Linux)

# Hardware sensors (requires appropriate drivers)
{baseDir}/system.sh sensors [--temp-only]
{baseDir}/system.sh sensors --alerts           # Only show critical thresholds
```

### Memory & Swap

```bash
# RAM analysis
{baseDir}/system.sh memory --breakdown         # Cache, buffers, available vs free
{baseDir}/system.sh memory --processes         # Top memory consumers
{baseDir}/system.sh memory --oom-score         # Processes likely to be killed

# Swap pressure
{baseDir}/system.sh swap --usage
{baseDir}/system.sh swap --io                  # Swap in/out rates
```

### Storage & I/O

```bash
# Disk usage
{baseDir}/system.sh disk --tree [<path>]       # Visual tree
{baseDir}/system.sh disk --inodes              # Inode usage (often fills before space)
{baseDir}/system.sh disk --largest-files <path> [--count 20]

# I/O Statistics
{baseDir}/system.sh io --devices               # Per-disk throughput
{baseDir}/system.sh io --processes             # Which processes are doing I/O
{baseDir}/system.sh io --latency               # Disk latency percentiles (requires iostat)
```

### Network

```bash
# Interface details
{baseDir}/system.sh network --ethernet|--wifi|--loopback  # Filter by type
{baseDir}/system.sh network --speed            # Current link speed
{baseDir}/system.sh network --traffic          # RX/TX bytes with human formatting

# Connections and sockets
{baseDir}/system.sh network --connections [--state ESTABLISHED|--pid]
{baseDir}/system.sh network --listening        # Open ports with processes
{baseDir}/system.sh network --routing          # Routing table
{baseDir}/system.sh network --dns              # DNS configuration and resolution test

# Packet drops/errors
{baseDir}/system.sh network --errors           # Interface error counters
```

### Processes

```bash
# Process listings
{baseDir}/system.sh processes --full-cmd       # Full command line, not truncated
{baseDir}/system.sh processes --threads        # Include threads (LWP)
{baseDir}/system.sh processes --forest         # ASCII tree view
{baseDir}/system.sh processes --cgroup         # Container cgroups (if applicable)

# Filtering
{baseDir}/system.sh processes --filter "cpu>50" --filter "mem>1g"
{baseDir}/system.sh processes --user <user> --sort memory
{baseDir}/system.sh processes -- Zombie        # Zombie process detection

# Specific process deep-dive
{baseDir}/system.sh process <pid> --fds        # Open file descriptors
{baseDir}/system.sh process <pid> --limits     # ulimit values
{baseDir}/system.sh process <pid> --maps       # Memory map (requires permissions)
```

### Hardware Inventory

```bash
# Physical hardware
{baseDir}/system.sh hardware --pci             # PCI devices
{baseDir}/system.sh hardware --usb             # USB devices
{baseDir}/system.sh hardware --gpu            # GPU info and utilization (NVIDIA/AMD/Intel)
{baseDir}/system.sh hardware --battery         # Power/battery status (laptops)

# DMI/SMBIOS (requires root on Linux)
{baseDir}/system.sh hardware --dmi [--type memory|bios|system]
```

### Environment & Time

```bash
# Environment
{baseDir}/system.sh env --diff <file1> <file2> # Compare environments
{baseDir}/system.sh env --secure               # Mask secrets (keys, tokens, passwords)

# Time & locale
{baseDir}/system.sh time --sync-status         # NTP/sync status
{baseDir}/system.sh time --zones               # Available timezones
```

## Output Schema (JSON Mode)

When using `--json`, output follows this structure:

```json
{
  "schema_version": "2.0",
  "timestamp": "2024-01-15T09:30:00Z",
  "hostname": "server01",
  "container_context": false,
  "data": { ... },
  "warnings": ["High CPU temperature: 85°C"],
  "exit_code": 0
}
```

## Advanced Examples

### Continuous Monitoring with Alerting
```bash
# Alert when CPU > 80% or Disk > 90%
{baseDir}/system.sh cpu --watch 5 --threshold 80% &
{baseDir}/system.sh disk --watch 60 --threshold 90% &
```

### Pre-Deployment Health Check
```bash
{baseDir}/system.sh overview --health-score --export pre-deploy.json
# Returns non-zero if health score < 70 (configurable)
```

### Memory Leak Detection
```bash
# Sample every 30 seconds for 10 minutes, output CSV
{baseDir}/system.sh memory --watch 30 --export mem-profile.csv &
sleep 600 && kill $!
# Analyze growth patterns in CSV
```

### Network Troubleshooting
```bash
# Find what's blocking port 8080
{baseDir}/system.sh network --listening | grep 8080
{baseDir}/system.sh network --connections --pid | grep 8080

# Check for packet loss
{baseDir}/system.sh network --errors
```

### Container Context Awareness
```bash
# Detect if running in Docker/VM and adjust expectations
{baseDir}/system.sh identity --vm-detect
# Output: "docker" | "kubernetes" | "vmware" | "physical"
```

### Process Debugging
```bash
# Find why a process is stuck (I/O wait?)
{baseDir}/system.sh process 12345 --threads
{baseDir}/system.sh io --processes | grep 12345
```

### Cross-Platform Scripting
```bash
# Get total memory in MB (works on Linux and macOS)
{baseDir}/system.sh memory --json | jq '.data.total_mb'
```

## Edge Cases & Error Handling

### Permission Denied
- **Symptom**: "Cannot access /proc/[pid]" or "Hardware access denied"
- **Fix**: Run with `sudo` for full hardware/process details, or use `--accessible-only` flag to skip restricted data

### Container Limitations
- `/proc` and `/sys` may be restricted in Docker
- Use `--container-safe` to skip hardware sensors and full process trees
- CPU/Memory limits from cgroups are auto-detected and annotated

### High Load Systems
- On systems with >10,000 processes, `--full-cmd` may be slow; use `--summary` first
- `--watch` mode includes adaptive sampling (slows down if system load >90%)

### Zombie Process Storms
- If >100 zombies detected, output switches to compact mode automatically
- Use `--processes --zombie --kill-parent` (requires confirmation)

### Encoding Issues
- Process names with non-UTF8 characters are sanitized to `?` by default
- Use `--raw` to preserve binary names (may break terminal)

## Performance Considerations

- **Lightweight**: Single-shot commands add <50ms overhead
- **I/O Impact**: `--io` and `--largest-files` may cause disk cache pressure on busy systems
- **Network**: `--traffic` reads counters; no packets are captured (no libpcap overhead)
- **Memory**: JSON output for 10k+ processes may use 50MB+ RAM; stream with `--stream` flag

## Exit Codes

- `0`: Success
- `1`: General error
- `2`: Permission denied (partial data returned)
- `3`:

---

## Skill: timestamp

### Jackie's Original (355 words)

```markdown
---
name: timestamp
description: "Convert between timestamp formats. Unix timestamps, ISO 8601, relative times, and human-readable dates. No API key required."
---

# Timestamp Skill

Convert between various timestamp formats.

## When to Use

✅ **USE this skill when:**

- "Convert this timestamp to readable date"
- "What time is 1704067200?"
- "Get current timestamp"
- "Parse this date string"
- "Calculate time difference"

## When NOT to Use

❌ **DON'T use this skill when:**

- Scheduling tasks → use cron/system scheduler
- Time zone conversions → use timezone-aware libraries
- Calendar operations → use calendar tools

## Commands

### Current Time

```bash
{baseDir}/timestamp.sh now
{baseDir}/timestamp.sh now --format iso
{baseDir}/timestamp.sh now --format unix
{baseDir}/timestamp.sh now --utc
```

### Convert Timestamp

```bash
{baseDir}/timestamp.sh convert 1704067200
{baseDir}/timestamp.sh convert "2024-01-01T00:00:00Z"
{baseDir}/timestamp.sh convert "January 1, 2024"
{baseDir}/timestamp.sh convert 1704067200 --format iso
```

### Relative Time

```bash
{baseDir}/timestamp.sh relative "2 hours ago"
{baseDir}/timestamp.sh relative "tomorrow"
{baseDir}/timestamp.sh relative "next week"
{baseDir}/timestamp.sh relative "in 3 days"
```

### Time Difference

```bash
{baseDir}/timestamp.sh diff "2024-01-01" "2024-01-10"
{baseDir}/timestamp.sh diff 1704067200 1704153600
{baseDir}/timestamp.sh diff "now" "tomorrow"
```

### Parse Date String

```bash
{baseDir}/timestamp.sh parse "January 1, 2024"
{baseDir}/timestamp.sh parse "2024-01-01 12:00:00"
{baseDir}/timestamp.sh parse "01/01/2024"
```

## Output Formats

| Format | Description | Example |
|--------|-------------|---------|
| `unix` | Unix timestamp | `1704067200` |
| `iso` | ISO 8601 | `2024-01-01T00:00:00Z` |
| `date` | Date only | `2024-01-01` |
| `time` | Time only | `00:00:00` |
| `datetime` | Date and time | `2024-01-01 00:00:00` |
| `human` | Human readable | `Monday, January 1, 2024` |
| `relative` | Relative time | `2 hours ago` |

## Examples

**Get current Unix timestamp:**
```bash
{baseDir}/timestamp.sh now --format unix
# Output: 1704067200
```

**Convert Unix to ISO:**
```bash
{baseDir}/timestamp.sh convert 1704067200 --format iso
# Output: 2024-01-01T00:00:00Z
```

**Get time 2 hours from now:**
```bash
{baseDir}/timestamp.sh relative "in 2 hours"
# Output: 2024-01-01T02:00:00Z
```

**Calculate days between dates:**
```bash
{baseDir}/timestamp.sh diff "2024-01-01" "2024-01-31" --unit days
# Output: 30 days
```

## Notes

- All operations use UTC by default
- Use `--local` for local timezone
- Supports various date formats
- Handles relative time expressions
```

### Kate's Improved Version (1017 words, 38.0s)

```
---
name: timestamp
description: "Precision timestamp conversion, arithmetic, and parsing. Handles Unix epochs (seconds/milliseconds/nanoseconds), ISO 8601, RFC standards, relative expressions, custom format strings, timezone conversions, and duration calculations. Zero-dependency core operations."
---

# Timestamp Skill

Production-grade temporal processing supporting high-precision epochs, ambiguous format resolution, timezone mathematics, and ISO 8601 duration arithmetic.

## When to Use

✅ **USE this skill when:**

- Converting between Unix timestamps (seconds, milliseconds, or nanoseconds) and human-readable formats
- Parsing ambiguous date strings ("01/02/2024" could be Jan 2 or Feb 1)
- Calculating precise durations between dates (including leap years/seconds)
- Converting between timezones (not just UTC ↔ local)
- Working with ISO 8601 durations (`P3DT12H`) or relative expressions ("2 business days ago")
- Normalizing timestamps from heterogeneous data sources
- Validating timestamp formats before database insertion
- Rendering custom date formats (`strftime` style patterns)
- Handling pre-epoch (before 1970) or far-future dates
- Batch processing timestamp conversions

## When NOT to Use

❌ **DON'T use this skill when:**

- **Scheduling recurring tasks** → Use `cron` or system schedulers (`systemd`, `Task Scheduler`)
- **Calendar logic** (holidays, fiscal quarters, recurring events) → Use calendar libraries with ICU data
- **High-resolution performance timing** → Use language-specific monotonic clocks (`clock_gettime(CLOCK_MONOTONIC)`)
- **Distributed system synchronization** → Use NTP clients or vector clocks
- **Legal/tz database compliance** → Use `tzdata`-aware libraries (IANA timezone rules change frequently)
- **Astronomical time calculations** (TAI, UT1, sidereal time) → Use specialized astronomy libraries

## Core Concepts

| Term | Definition | Example |
|------|------------|---------|
| **Epoch** | Reference point (Unix: 1970-01-01T00:00:00Z) | `0` |
| **Precision** | Temporal resolution | `s` (seconds), `ms` (milli), `ns` (nano) |
| **Ambiguous** | Format with multiple interpretations | `01/05/2024` → Jan 5 or May 1 |
| **Duration** | Length of time (ISO 8601) | `P1DT2H` (1 day, 2 hours) |

## Commands

### Current Time

```bash
# Default: ISO 8601 UTC
{baseDir}/timestamp.sh now

# Specify precision
{baseDir}/timestamp.sh now --precision ms    # JavaScript-style timestamp
{baseDir}/timestamp.sh now --precision ns    # Nanosecond resolution

# Output formats
{baseDir}/timestamp.sh now --format unix      # 1704067200
{baseDir}/timestamp.sh now --format iso       # 2024-01-01T00:00:00Z
{baseDir}/timestamp.sh now --format rfc2822   # Mon, 01 Jan 2024 00:00:00 GMT
{baseDir}/timestamp.sh now --format rfc3339   # 2024-01-01T00:00:00+00:00

# Custom strftime format
{baseDir}/timestamp.sh now --format "%Y-%m-%d_%H-%M-%S"
```

### Convert Between Formats

Auto-detects input format; explicit hints for ambiguous cases.

```bash
# Epoch conversions (auto-detects seconds/ms/ns)
{baseDir}/timestamp.sh convert 1704067200
{baseDir}/timestamp.sh convert 1704067200000        # Detected as milliseconds
{baseDir}/timestamp.sh convert 1704067200000000000  # Detected as nanoseconds

# Explicit precision specification
{baseDir}/timestamp.sh convert 1704067200 --from-unit s --to-unit ms

# ISO and human-readable
{baseDir}/timestamp.sh convert "2024-01-01T00:00:00Z"
{baseDir}/timestamp.sh convert "January 1, 2024" --locale en_US

# Custom output templates
{baseDir}/timestamp.sh convert 1704067200 --template "{date} at {time} ({tz})"
```

### Timezone Conversion

```bash
# Convert between specific zones
{baseDir}/timestamp.sh tz "2024-01-01T12:00:00Z" --to America/New_York
{baseDir}/timestamp.sh tz now --to Asia/Tokyo --from UTC

# List available timezones
{baseDir}/timestamp.sh tz --list
```

### Relative Time & Durations

```bash
# Natural language (parsed relative to now)
{baseDir}/timestamp.sh relative "2 hours ago"
{baseDir}/timestamp.sh relative "tomorrow at 3pm"
{baseDir}/timestamp.sh relative "next business day"  # Skips weekends
{baseDir}/timestamp.sh relative "in 3 weeks"

# ISO 8601 durations
{baseDir}/timestamp.sh duration "P3DT12H30M"        # Add duration to now
{baseDir}/timestamp.sh duration "-P1D"             # Subtract 1 day from now

# Reference-based
{baseDir}/timestamp.sh relative "2 days before 2024-01-15"
```

### Date Arithmetic

Add/subtract durations from specific timestamps.

```bash
# Add duration
{baseDir}/timestamp.sh add "2024-01-01" "P30D"      # ISO duration
{baseDir}/timestamp.sh add "2024-01-01" "2 weeks"   # Natural language

# Subtract
{baseDir}/timestamp.sh subtract 1704067200 "24 hours"

# Business days (skip weekends)
{baseDir}/timestamp.sh add "2024-01-01" "5 business days"
```

### Difference Calculation

```bash
# Default: total seconds
{baseDir}/timestamp.sh diff "2024-01-01" "2024-01-10"

# Specific units
{baseDir}/timestamp.sh diff 1704067200 1706745600 --unit days        # Calendar days
{baseDir}/timestamp.sh diff now "2025-01-01" --unit business_days     # Excluding weekends
{baseDir}/timestamp.sh diff "2024-01-01" "2024-06-01" --unit iso     # ISO 8601 duration format

# Human-readable output
{baseDir}/timestamp.sh diff "2024-01-01" now --human    # "3 months, 2 days, 4 hours"
```

### Parsing with Hints

```bash
# Disambiguate DD/MM vs MM/DD
{baseDir}/timestamp.sh parse "01/02/2024" --hint eu     # January 2 (European)
{baseDir}/timestamp.sh parse "01/02/2024" --hint us    # February 1 (US)

# Strict parsing (fail on ambiguity)
{baseDir}/timestamp.sh parse "Jan 2024" --strict        # Fails: day missing
{baseDir}/timestamp.sh parse "Jan 2024" --default-day 1

# Extract components without full conversion
{baseDir}/timestamp.sh parse "2024-01-01T12:30:45Z" --extract year
```

### Validation

```bash
# Check if valid timestamp
{baseDir}/timestamp.sh validate "2024-02-30"        # Invalid date
{baseDir}/timestamp.sh validate 1704067200          # Valid Unix timestamp
{baseDir}/timestamp.sh validate "not a date"        # Invalid

# Range checking
{baseDir}/timestamp.sh validate "1800-01-01" --min "1900-01-01"  # Out of range
```

### Batch Processing

```bash
# Convert file of timestamps
{baseDir}/timestamp.sh batch convert --input timestamps.txt --from unix --to iso

# Process with custom separator
{baseDir}/timestamp.sh batch diff --input dates.csv --col1 1 --col2 2 --delimiter ","
```

## Output Format Reference

| Format | Description | Example |
|--------|-------------|---------|
| `unix` | Seconds since epoch | `1704067200` |
| `unix_ms` | Milliseconds | `1704067200000` |
| `unix_ns` | Nanoseconds | `1704067200000000000` |
| `iso` | ISO 8601 UTC | `2024-01-01T00:00:00Z` |
| `iso_local` | ISO 8601 with local offset | `2024-01-01T08:00:00+08:00` |
| `rfc2822` | Email format | `Mon, 01 Jan 2024 00:00:00 GMT` |
| `rfc3339` | RFC 3339 | `2024-01-01T00:00:00+00:00` |
| `date` | Date only | `2024-01-01` |
| `time` | Time only | `00:00:00` |
| `datetime` | Date + time | `2024-01-01 00:00:00` |
| `human` | Natural language | `Monday, January 1st, 2024` |
| `relative` | Relative to now | `2 hours ago` |
| `atom` | Atom/RSS format | `2024-01-01T00:00:00+00:00` |
| `cookie` | HTTP Cookie spec | `Monday, 01-Jan-2024 00:00:00 GMT` |

## Critical Edge Cases & Examples

### Epoch Precision Detection

**Problem:** `1704067200` could be seconds (2024-01-01) or milliseconds (1970-01-20).

**Solution:**
```bash
{baseDir}/timestamp.sh convert 1704067200 --from-unit auto     # Smart detection
{baseDir}/timestamp.sh convert 1704067200 --from-unit s        # Force seconds
{baseDir}/timestamp.sh convert 1704067200 --from-unit ms       # Force milliseconds
```

### Pre-Epoch Dates (Negative Timestamps)

```bash
{baseDir}/timestamp.sh convert -86400              # 1969-12-31T00:00:00Z
{baseDir}/timestamp.sh relative "50 years ago"     # Handles negative epochs
```

### Leap Second Handling

```bash
# 23:59:60 is valid on leap second days
{baseDir}/timestamp.sh validate "2023-06-30T23:59:60Z"    # Valid (if supported

