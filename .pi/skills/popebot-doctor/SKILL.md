---
name: popebot-doctor
description: Comprehensive diagnostics and health checking for the PopeBot/Pi agent environment. Check skill health, API connectivity, configuration, file system integrity, and run self-healing repairs.
version: 1.0.0
author: PopeBot (inspired by ZeroClaw Doctor)
tags: ["diagnostics", "health", "monitoring", "troubleshooting", "repair"]
---

# PopeBot Doctor - Environment Diagnostics & Repair

A comprehensive diagnostic system inspired by ZeroClaw's doctor architecture. This skill enables agents to perform thorough health checks of the PopeBot environment, identify issues, and perform automated repairs.

## Purpose

When enabled, PopeBot Doctor allows the agent to:
1. **Diagnose** - Run comprehensive health checks across all system components
2. **Verify** - Check skill integrity, API connectivity, and configuration
3. **Report** - Generate detailed diagnostic reports with severity ratings
4. **Repair** - Perform automated fixes for common issues
5. **Monitor** - Track system health over time

## Categories Checked

### 🔧 Environment
- Docker availability and version
- Node.js runtime version
- Git configuration
- GitHub CLI authentication
- Required command-line tools

### 📦 Skills Health
- Skill directory structure validation
- SKILL.md frontmatter parsing
- Missing dependency detection
- Broken symlink detection

### 🌐 API Connectivity
- Network connectivity tests
- API endpoint health (GitHub, LLM providers, etc.)
- Authentication token validation
- Rate limit status

### ⚙️ Configuration
- Required environment variables
- Config file syntax validation
- Secret availability checks
- Permission validations

### 📁 File System
- Workspace structure integrity
- Log directory health
- Required file presence
- Permission checks

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PopeBot Doctor Pipeline                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ COLLECT│───▶│ ANALYZE  │───▶│  REPORT  │───▶│  REPAIR  │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                  │
│  • Gather data  • Run checks   • Generate    • Auto-fix        │
│  • Run tests    • Score issues   diagnostics   • Suggest        │
│  • Check APIs   • Categorize   • Export JSON   fixes          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Setup

```bash
cd /job/.pi/skills/popebot-doctor
npm install
```

## Tools Added

When this skill is active, the following tools are available:

### `popebot_doctor_run`

Run comprehensive diagnostics and return results.

```javascript
// Full diagnostic run
await popebot_doctor_run({})

// Check specific categories only
await popebot_doctor_run({ categories: ["environment", "skills"] })

// Include automated repairs
await popebot_doctor_run({ autoRepair: true })

// Output as JSON for programmatic use
await popebot_doctor_run({ format: "json" })
```

### `popebot_doctor_check`

Quick health check - returns pass/fail.

```javascript
// Quick check
const healthy = await popebot_doctor_check({})

// Check specific area
const skillsHealthy = await popebot_doctor_check({ category: "skills" })
```

### `popebot_doctor_repair`

Attempt to fix detected issues.

```javascript
// Repair all fixable issues
await popebot_doctor_repair({ all: true })

// Repair specific category
await popebot_doctor_repair({ category: "skills" })

// Dry run - show what would be fixed
await popebot_doctor_repair({ dryRun: true })
```

### `popebot_doctor_report`

Generate formatted diagnostic reports.

```javascript
// Generate report
await popebot_doctor_report({ format: "markdown" })

// Save to file
await popebot_doctor_report({ output: "/tmp/doctor-report.md" })

// Include only errors
await popebot_doctor_report({ severity: "error" })
```

## CLI Commands

### `popebot-doctor`

Run diagnostics from command line.

```bash
# Full diagnostic
popebot-doctor

# Quick check
popebot-doctor --quick

# Check specific categories
popebot-doctor --categories environment,skills

# Auto-repair
popebot-doctor --repair

# JSON output
popebot-doctor --json

# Save report
popebot-doctor --output report.md
```

### `popebot-doctor-check`

Quick health check with exit codes.

```bash
# Exit 0 if healthy, 1 if issues found
popebot-doctor-check

# Check specific category
popebot-doctor-check --category api
```

## Severity Levels

| Level | Icon | Description | Action Required |
|-------|------|-------------|-----------------|
| OK | ✅ | All checks passed | None |
| Warning | ⚠️ | Non-critical issue | Review recommended |
| Error | ❌ | Critical issue | Fix required |

## Diagnostic Categories

### Environment Checks

| Check | Description | Severity if Failed |
|-------|-------------|-------------------|
| Node.js version | Node.js 18+ required | Error |
| Docker | Docker available | Warning |
| Git | Git configured | Error |
| GitHub CLI | gh authenticated | Warning |

### Skills Checks

| Check | Description | Severity if Failed |
|-------|-------------|-------------------|
| SKILL.md exists | Required metadata file | Error |
| Valid frontmatter | YAML frontmatter parseable | Error |
| Scripts executable | Scripts have execute permission | Warning |
| Dependencies installed | node_modules present | Warning |
| Symlink integrity | No broken symlinks | Error |

### API Checks

| Check | Description | Severity if Failed |
|-------|-------------|-------------------|
| GitHub API | Can reach api.github.com | Error |
| LLM provider | LLM API responsive | Error |
| Network | External connectivity | Error |

### Configuration Checks

| Check | Description | Severity if Failed |
|-------|-------------|-------------------|
| Required vars | Critical env vars set | Error |
| Optional vars | Optional env vars present | Warning |
| Config syntax | JSON/TOML valid | Error |

## Usage in Agent Prompt

When this skill is active, include this context:

```
## PopeBot Doctor - Environment Diagnostics

You have access to a comprehensive diagnostic system (PopeBot Doctor) inspired by ZeroClaw's doctor architecture.

### Purpose

Use PopeBot Doctor to:
- Run comprehensive health checks of the environment
- Diagnose skill configuration issues
- Test API connectivity and authentication
- Validate file system integrity
- Perform automated repairs

### Diagnostic Categories

1. **Environment**: Node.js, Docker, Git, GitHub CLI
2. **Skills**: Skill structure, dependencies, symlinks
3. **API**: Network connectivity, API endpoints
4. **Config**: Environment variables, file syntax
5. **Filesystem**: Workspace structure, permissions

### Severity Levels

- ✅ OK - All checks passed
- ⚠️ Warning - Non-critical issue, review recommended
- ❌ Error - Critical issue, fix required

### Key Commands

**popebot_doctor_run()** - Run full diagnostics
- Example: await popebot_doctor_run({ autoRepair: true })

**popebot_doctor_check()** - Quick health check
- Example: await popebot_doctor_check({ category: "skills" })

**popebot_doctor_repair()** - Attempt automated fixes
- Example: await popebot_doctor_repair({ dryRun: true })

**popebot_doctor_report()** - Generate formatted reports
- Example: await popebot_doctor_report({ format: "markdown" })

### Workflow

1. DIAGNOSE: Run popebot_doctor_run() to collect diagnostics
2. ANALYZE: Review severity levels and identify issues
3. REPAIR: Use popebot_doctor_repair() for auto-fixable issues
4. REPORT: Generate a report for documentation

### Example

```javascript
// Run full diagnostics
const results = await popebot_doctor_run({});

// Check if any errors
const hasErrors = results.items.some(i => i.severity === "error");

if (hasErrors) {
  // Try auto-repair
  const repairResult = await popebot_doctor_repair({ all: true });
  
  // Generate report
  await popebot_doctor_report({ output: "/tmp/fix-report.md" });
}
```

### Best Practices

1. **Run diagnostics before major changes** - Establish baseline health
2. **Review warnings too** - They may become errors later
3. **Use dry-run first** - Test repairs before applying
4. **Check after repairs** - Verify fixes resolved issues
5. **Save reports** - Document system health over time
```

## File Structure

```
.pi/skills/popebot-doctor/
├── SKILL.md              # This documentation
├── package.json          # Dependencies
├── index.js              # Main entry / exports
├── lib/
│   ├── diagnostics.js    # Core diagnostic runners
│   ├── environment.js    # Environment checks
│   ├── skills.js         # Skill health checks
│   ├── api.js            # API connectivity tests
│   ├── config.js         # Configuration validation
│   ├── filesystem.js     # File system checks
│   ├── repair.js         # Auto-repair logic
│   └── report.js         # Report generation
├── bin/
│   ├── popebot-doctor.js       # CLI entry
│   └── popebot-doctor-check.js # Quick check CLI
├── templates/
│   └── DOCTOR_REPORT.md  # Report template
└── test/
    └── doctor.test.js    # Unit tests
```

## Integration with Other Skills

### With skill-scout

Use before installing new skills:
```javascript
// Run diagnostics first
const health = await popebot_doctor_run({ categories: ["skills"] });

if (health.summary.errors === 0) {
  // Safe to install new skills
  await skill_scout_install({ name: "new-skill" });
} else {
  // Fix issues first
  await popebot_doctor_repair({ category: "skills" });
}
```

### With heartbeat

Integrate with periodic health checks:
```javascript
// In HEARTBEAT.md, schedule regular diagnostics
// - environment-check: Run popebot_doctor_check every hour
// - skills-health: Run popebot_doctor_run({ categories: ["skills"] }) daily
```

### With multi-agent-orchestrator

Delegate diagnostics to specialized agents:
```javascript
parallel_delegates({
  tasks: [
    { agent: "api-tester", task: "Check all API endpoints" },
    { agent: "skill-doctor", task: "Verify skill health" }
  ]
})
```

## Performance

| Metric | Expected |
|--------|----------|
| Full diagnostic run | 2-5 seconds |
| Quick check | <1 second |
| Skills check only | 1-2 seconds |
| API connectivity | 1-3 seconds |
| Report generation | <1 second |

## Error Handling

- **Network failures**: Categorized as errors, suggest checking connectivity
- **Permission issues**: Reported as warnings with remediation steps
- **Missing tools**: Reported as errors with installation guidance
- **Parse failures**: Reported as errors with line numbers
- **Timeouts**: Categorized as errors, suggest retry

## Future Enhancements

- [ ] Web dashboard for visual diagnostics
- [ ] Historical health tracking over time
- [ ] Performance benchmarking
- [ ] Dependency vulnerability scanning
- [ ] Integration with telemetry systems
- [ ] Predictive failure detection
- [ ] Automated health alerts

## Inspiration

This skill is adapted from:
- **ZeroClaw's Doctor**: Diagnostic architecture and severity levels
- **OpenClaw's Health Checks**: API connectivity patterns
- **Kubernetes Health Probes**: Checking philosophy

## License

MIT - See repository LICENSE file
