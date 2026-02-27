---
name: skill-autoinstaller
description: Automatically discover, evaluate, validate, and install new PopeBot skills from GitHub repositories. Combines ZeroClaw's security auditing with OpenClaw's CLI-based skill approach.
metadata:
  {
    "popebot":
      {
        "emoji": "📦",
        "requires": { "bins": ["git", "curl", "jq"] },
        "install":
          [
            {
              "id": "apt",
              "kind": "apt",
              "package": "git curl jq",
              "bins": ["git", "curl", "jq"],
              "label": "Install git, curl, jq (apt)",
            },
          ],
      },
  }
---

# Skill Auto-Installer

Automatically discover, evaluate, validate, and install new PopeBot skills from GitHub repositories.

## Quick Start

```bash
# Discover skills from a GitHub repo
node /job/.pi/skills/skill-autoinstaller/discover.js --repo zeroclaw-labs/zeroclaw

# Evaluate a specific skill
node /job/.pi/skills/skill-autoinstaller/evaluate.js --path /tmp/skills/awesome-skill

# Install a skill
node /job/.pi/skills/skill-autoinstaller/install.js --path /tmp/skills/awesome-skill

# Full pipeline: discover → evaluate → install
node /job/.pi/skills/skill-autoinstaller/pipeline.js --repo openclaw/openclaw --pattern "skills/*"
```

## Commands

### discover.js

Scans a GitHub repository for potential skills.

```bash
# Scan by repo
node /job/.pi/skills/skill-autoinstaller/discover.js --repo zeroclaw-labs/zeroclaw

# Scan local directory
node /job/.pi/skills/skill-autoinstaller/discover.js --dir /path/to/repo

# With search pattern
node /job/.pi/skills/skill-autoinstaller/discover.js --repo openclaw/openclaw --pattern "skills/*"

# JSON output
node /job/.pi/skills/skill-autoinstaller/discover.js --repo zeroclaw-labs/zeroclaw --json
```

### evaluate.js

Performs security audit and compatibility check on a skill directory.

```bash
# Evaluate skill
node /job/.pi/skills/skill-autoinstaller/evaluate.js --path /tmp/skills/my-skill

# With security audit
node /job/.pi/skills/skill-autoinstaller/evaluate.js --path /tmp/skills/my-skill --security

# JSON output
node /job/.pi/skills/skill-autoinstaller/evaluate.js --path /tmp/skills/my-skill --json
```

### install.js

Installs a validated skill into PopeBot.

```bash
# Install skill
node /job/.pi/skills/skill-autoinstaller/install.js --path /tmp/skills/my-skill

# With activation
node /job/.pi/skills/skill-autoinstaller/install.js --path /tmp/skills/my-skill --activate

# Dry run
node /job/.pi/skills/skill-autoinstaller/install.js --path /tmp/skills/my-skill --dry-run
```

### pipeline.js

Runs the full discovery → evaluation → installation pipeline.

```bash
# Full pipeline
node /job/.pi/skills/skill-autoinstaller/pipeline.js --repo zeroclaw-labs/zeroclaw

# With pattern matching
node /job/.pi/skills/skill-autoinstaller/pipeline.js --repo openclaw/openclaw --pattern "skills/*"

# Interactive mode
node /job/.pi/skills/skill-autoinstaller/pipeline.js --repo zeroclaw-labs/zeroclaw --interactive
```

## Security Audit Checks

The evaluator performs these security checks (inspired by ZeroClaw's audit system):

1. **Manifest Validation**: SKILL.md must exist with valid frontmatter
2. **Path Traversal**: No `..` in paths or symlinks outside sandbox
3. **Dangerous Patterns**: No eval, exec, child_process without sandboxing
4. **Secret Handling**: No hardcoded credentials
5. **Network Calls**: External calls must be intentional and documented
6. **File Operations**: Write operations must be confined to /job/tmp/ or skill directory
7. **Permission Model**: Skills declare required permissions in metadata

## Skill Metadata Format

Skills should include this metadata in SKILL.md frontmatter:

```yaml
---
name: skill-name
description: What the skill does
homepage: https://github.com/author/skill
metadata:
  {
    "popebot":
      {
        "emoji": "🔧",
        "requires": { "bins": ["node", "git"] },
        "permissions": ["network", "filesystem"],
        "install":
          [
            {
              "id": "npm",
              "kind": "npm",
              "package": "@scope/package",
              "bins": ["tool"],
              "label": "Install tool (npm)",
            },
          ],
      },
  }
---
```

## Installation Strategies

The auto-installer supports multiple installation methods:

1. **npm**: `npm install -g package`
2. **brew**: `brew install formula`
3. **apt**: `apt-get install package`
4. **pip**: `pip install package`
5. **go**: `go install package@latest`
6. **binary**: Download from release URL
7. **script**: Run installation script
8. **source**: Build from source

## Error Handling

- Failed discovery: Returns empty list with error message
- Failed evaluation: Skill marked as "incompatible" with reasons
- Failed installation: Rollback to previous state, detailed error log

## Output Formats

All commands support `--json` for machine-readable output:

```json
{
  "status": "success",
  "skills": [
    {
      "name": "skill-name",
      "path": "/tmp/skills/skill-name",
      "evaluation": { "passed": true, "score": 95 },
      "installed": true
    }
  ]
}
```
