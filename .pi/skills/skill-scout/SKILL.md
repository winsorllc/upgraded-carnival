---
name: skill-scout
description: Auto-discover, evaluate, and integrate Pi skills from public GitHub repositories. Inspired by ZeroClaw's SkillForge and OpenClaw's ClawHub. Use when you need to find new skills, evaluate skill quality, install discovered skills, or manage skill lifecycles.
version: 1.0.0
author: PopeBot (adapted from ZeroClaw SkillForge)
tags: ["skills", "discovery", "installation", "registry", "automation"]
---

# Skill Scout - Auto-Discovery and Management System

A powerful skill auto-discovery and management system inspired by ZeroClaw's SkillForge. Skill Scout enables PopeBot to automatically discover Pi skills from public repositories, evaluate their quality and compatibility, and manage their installation and updates.

## Purpose

When enabled, this skill allows the agent to:
1. **Discover** - Search GitHub for Pi-skill repositories
2. **Evaluate** - Score skills for quality, security, and compatibility
3. **Install** - Add qualified skills to `.pi/skills/`
4. **Update** - Keep installed skills current
5. **Manage** - Track installed vs available skills

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Skill Scout Pipeline                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  SCOUT   │───▶│ EVALUATE │───▶│ INTEGRATE│───▶│  MANAGE  │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                  │
│  • Search GitHub  • Score skills  • Symlink to    • Track state │
│  • Parse repos    • Check SKILL.md  .pi/skills/  • Update      │
│  • Find SKILL.md  • Security scan • npm install  • Remove      │
│                  • Compatibility   • Log install               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Setup

```bash
cd /job/.pi/skills/skill-scout
npm install
```

## Configuration

Create `SKILL_SCOUT.md` in your workspace root to configure Skill Scout:

```markdown
# Skill Scout Configuration

## Discovery Sources
- GitHub: enabled
- GitLab: enabled

## Search Queries
- pi-skill
- popebot-skill
- claude-skill

## Auto-Install Settings
- Min score: 0.7
- Max results: 20
- Auto-install: false (queue for review)

## Scoring Criteria
- Has SKILL.md: +2 points
- Has package.json: +1 point
- Has README.md: +0.5 points
- Has tests: +1 point
- Security audit passed: +1 point
- Recent update (30d): +1 point
- Stars > 10: +1 point

## Score Thresholds
- Auto-install: 0.7
- Manual review: 0.5
- Skip: < 0.5
```

## Tools Added

When this skill is active, the following tools are available:

### `skill_scout_discover`

Discover skills from GitHub.

```javascript
// Search for skills
discover({ query: "pi-skill", limit: 10, source: "github" })

// Search with specific keywords
discover({ query: "popebot notification skill", limit: 5 })

// List cached discoveries
discover({ action: "list-cached" })
```

### `skill_scout_evaluate`

Evaluate a discovered skill for quality and compatibility.

```javascript
// Evaluate a GitHub repo
evaluate({ url: "https://github.com/user/pi-skill-example" })

// Evaluate multiple candidates
evaluate({ urls: ["url1", "url2", "url3"] })

// Get evaluation criteria
evaluate({ action: "criteria" })
```

### `skill_scout_install`

Install a skill to `.pi/skills/` (creates symlink).

```javascript
// Install from GitHub
install({ url: "https://github.com/user/pi-skill-example" })

// Install from registry
install({ name: "notification-skill", version: "1.2.0" })

// Install from cache
install({ cachedId: "abc123" })
```

### `skill_scout_update`

Update installed skills.

```javascript
// Update a specific skill
update({ name: "skill-scout" })

// Update all skills
update({ all: true })

// Check for updates (dry-run)
update({ action: "check" })
```

### `skill_scout_list`

List discovered or installed skills.

```javascript
// List installed skills
list({ type: "installed" })

// List discovered (not yet installed)
list({ type: "discovered" })

// List with scores
list({ type: "discovered", withScores: true })
```

### `skill_scout_remove`

Remove an installed skill.

```javascript
// Remove a skill (removes symlink, keeps backup)
remove({ name: "old-skill", backup: true })

// Force remove (no backup)
remove({ name: "old-skill", backup: false })
```

### `skill_scout_status`

Get status and statistics.

```javascript
// Full status
status({ detailed: true })

// Quick summary
status({})
```

## CLI Commands

### `skill-scout discover [query]`

Discover skills from GitHub.

```bash
# Search for skills
skill-scout discover "notification"

# Limit results
skill-scout discover "pi-skill" --limit 20

# Output as JSON
skill-scout discover --json
```

### `skill-scout evaluate <url>`

Evaluate a skill before installation.

```bash
# Evaluate a repo
skill-scout evaluate https://github.com/user/skill-name

# Verbose output
skill-scout evaluate https://github.com/user/skill-name --verbose
```

### `skill-scout install <name-or-url>`

Install a skill.

```bash
# Install from name (searches registry)
skill-scout install notification-skill

# Install from URL
skill-scout install https://github.com/user/skill-name

# Specific version
skill-scout install notification-skill --version 1.2.0
```

### `skill-scout update [name]`

Update installed skills.

```bash
# Update specific skill
skill-scout update skill-scout

# Update all
skill-scout update --all

# Check only (dry-run)
skill-scout update --check
```

### `skill-scout list`

List skills.

```bash
# List installed
skill-scout list --installed

# List discovered
skill-scout list --discovered

# Show scores
skill-scout list --installed --with-scores
```

### `skill-scout remove <name>`

Remove an installed skill.

```bash
# Remove skill
skill-scout remove old-skill

# Remove without backup
skill-scout remove old-skill --no-backup
```

## Scoring System

Skill Scout evaluates skills across multiple dimensions:

| Criteria | Points | Description |
|----------|--------|-------------|
| `SKILL.md` | +2.0 | Has required SKILL.md with frontmatter |
| `package.json` | +1.0 | Has package.json for dependencies |
| `README.md` | +0.5 | Has documentation |
| Tests | +1.0 | Has test files |
| Security audit | +1.0 | No dangerous patterns |
| Recent update | +1.0 | Updated within 30 days |
| Stars | +0.5 (10+) | Community popularity |
| License | +0.5 | Has open-source license |
| Compatibility | +1.0 | Matches PopeBot architecture |

### Score Interpretation

| Score Range | Recommendation | Action |
|-------------|------------------|--------|
| 0.9 - 1.0 | Excellent | Auto-install if enabled |
| 0.7 - 0.89 | Good | Queue for review |
| 0.5 - 0.69 | Fair | Manual review recommended |
| < 0.5 | Poor | Skip |

## Usage in Agent Prompt

When this skill is active, include this context:

```
## Skill Scout - Auto-Discovery System

You have access to a skill auto-discovery and management system (Skill Scout) inspired by ZeroClaw's SkillForge.

### Purpose

Use Skill Scout to:
- Discover new skills from GitHub repositories
- Evaluate skill quality and compatibility before installation
- Install skills by creating symlinks in .pi/skills/
- Update installed skills to latest versions
- Manage the skill lifecycle

### Key Commands

**skill_scout_discover(query, limit)** - Find skills on GitHub
- Example: skill_scout_discover({ query: "notification skill", limit: 10 })

**skill_scout_evaluate(url)** - Score a skill before installing
- Example: skill_scout_evaluate({ url: "https://github.com/user/skill" })

**skill_scout_install(nameOrUrl)** - Install a skill
- Example: skill_scout_install({ name: "notification-skill" })
- Example: skill_scout_install({ url: "https://github.com/user/skill" })

**skill_scout_update(options)** - Update installed skills
- Example: skill_scout_update({ all: true })

**skill_scout_list(type)** - List skills
- Example: skill_scout_list({ type: "installed" })

### Workflow

1. DISCOVER: Search for skills matching your needs
2. EVALUATE: Review quality scores before installing
3. INSTALL: Add qualified skills to .pi/skills/
4. UPDATE: Keep skills current

### Example

```javascript
// Find notification skills
const discovered = await skill_scout_discover({ 
  query: "notification", 
  limit: 5 
});

// Evaluate the top result
const evaluation = await skill_scout_evaluate({ 
  url: discovered[0].url 
});

// Install if score is good
if (evaluation.score >= 0.7) {
  await skill_scout_install({ url: discovered[0].url });
}
```

### Security

Skill Scout performs security audits:
- Scans for dangerous patterns (eval, exec, rm -rf /)
- Checks for malicious dependencies
- Verifies SKILL.md structure
- Flags network requests to external domains

### Best Practices

1. **Always evaluate before installing** - Don't skip the evaluation step
2. **Review scores** - Understand why a skill got its rating
3. **Check permissions** - Look at what the skill can access
4. **Keep updated** - Run skill_scout_update regularly
5. **Remove unused** - Clean up skills you no longer need
```

## File Structure

```
.pi/skills/skill-scout/
├── SKILL.md                  # This documentation
├── package.json              # Dependencies
├── index.js                  # Main entry point / exports
├── lib/
│   ├── scout.js             # GitHub discovery (GitHubScout)
│   ├── evaluator.js          # Skill evaluation / scoring
│   ├── installer.js          # Symlink creation, npm install
│   ├── registry.js           # Installed skill tracking
│   ├── security.js          # Security audit
│   └── scorer.js             # Scoring algorithms
├── bin/
│   ├── skill-scout.js        # Main CLI
│   ├── skill-scout-discover.js
│   ├── skill-scout-evaluate.js
│   ├── skill-scout-install.js
│   ├── skill-scout-update.js
│   └── skill-scout-list.js
├── templates/
│   └── SKILL_SCOUT.md        # Example configuration
├── test/
│   ├── scout.test.js
│   ├── evaluator.test.js
│   └── skill-scout.test.js
└── .scout/                   # Runtime data (gitignored)
    ├── cache/               # Cached discovery results
    ├── registry.json        # Installed skill registry
    ├── evaluations.json     # Evaluation history
    └── backups/             # Removed skill backups
```

## Integration with Other Skills

### With multi-agent-orchestrator

Delegate skill discovery to specialized agents:
```javascript
parallel_delegates({
  tasks: [
    { agent: "security-auditor", task: "scan skill code" },
    { agent: "skill-scout", task: "discover from GitHub" }
  ]
})
```

### With secure-sandbox

Run skill code in sandbox before full installation:
```javascript
// Test in sandbox first
const result = await sandbox_exec({
  command: "skill-scout evaluate https://github.com/user/skill"
});
if (result.exitCode === 0) {
  await skill_scout_install({ url: "..." });
}
```

## Performance

| Metric | Expected |
|--------|----------|
| Discovery | 2-5s (GitHub API) |
| Evaluation | <1s per skill |
| Installation | 5-30s (depends on deps) |
| Update check | 1-2s per skill |
| Cache hit | <50ms |

## Error Handling

- **GitHub API failure**: Use cached results with warning
- **Evaluation failure**: Return partial scores, log error
- **Installation failure**: Rollback symlink, alert user
- **Network timeout**: Retry with exponential backoff

## Future Enhancements

- [ ] GitLab/Git source support
- [ ] ClawHub registry integration
- [ ] Skill dependency resolution
- [ ] Community rating system
- [ ] Automated security scanning
- [ ] Skill versioning (semver)
- [ ] Batch operations
- [ ] Webhook triggers for new skills

## Inspiration

This skill is adapted from:
- **ZeroClaw's SkillForge**: Auto-discovery and evaluation pipeline
- **OpenClaw's ClawHub**: Registry and CLI patterns
- **npm's package.json**: Dependency management model

## License

MIT - See repository LICENSE file
