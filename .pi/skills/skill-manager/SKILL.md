---
name: skill-manager
description: Manage, create, validate, and organize Pi agent skills. Supports listing, installing, removing, validating, and packaging skills. Inspired by ZeroClaw's open-skills and OpenClaw's skills platform.
---

# Skill Manager

Comprehensive skill management for organizing, validating, and packaging Pi agent skills. Similar to ZeroClaw's `zeroclaw skills` commands and OpenClaw's skill system.

## Capabilities

- List installed/active skills
- Validate skill structure (SKILL.md + code)
- Create new skill templates
- Package skills for distribution
- Check skill dependencies
- Audit skill security

## Usage

```bash
# List all skills
/job/.pi/skills/skill-manager/skill-list.js

# Validate a skill
/job/.pi/skills/skill-manager/skill-validate.js /path/to/skill

# Create new skill template
/job/.pi/skills/skill-manager/skill-create.js my-new-skill

# Package skill for distribution
/job/.pi/skills/skill-manager/skill-package.js my-skill /output/dir

# Audit skill security
/job/.pi/skills/skill-manager/skill-audit.js my-skill
```

## When to Use

- Creating new skills for the agent
- Validating skill structure before distribution
- Auditing skills for security issues
- Packaging skills for sharing
- Understanding skill dependencies

## Skill Structure

Valid skills must have:
- `SKILL.md` with frontmatter (name, description) and usage instructions
- Implementation files (typically .js, .sh, or .py)
- Optional `test.js` for validation

## Security Auditing

The skill-audit tool checks for:
- Suspicious shell commands
- Network requests without validation
- File system access outside workspace
- Execution of external binaries
- Sensitive credential access

## Inspired By

- ZeroClaw: `zeroclaw skills list/install/remove/audit`
- OpenClaw: Workspace skills with SKILL.md manifests