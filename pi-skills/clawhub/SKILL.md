---
name: clawhub
description: Use the ClawHub CLI to search, install, update, and publish agent skills from clawhub.com. Fetch new skills on the fly, sync to latest versions, or publish new skill folders.
metadata:
  {
    "openclaw": {
      "emoji": "🛒",
      "requires": { "bins": ["clawhub"] }
    }
  }
---

# ClawHub Skill Manager

Search, install, update, and publish skills from ClawHub registry.

## Prerequisites

```bash
npm install -g clawhub
```

## Configuration

```bash
clawhub login  # For publishing
clawhub whoami
```

## Usage

Search for skills:

```bash
clawhub search "postgres backups"
```

Install a skill:

```bash
clawhub install my-skill
clawhub install my-skill --version 1.2.3
```

Update installed skills:

```bash
clawhub update my-skill
clawhub update my-skill --version 1.2.3
clawhub update --all
clawhub update --all --force
```

Publish a skill:

```bash
clawhub publish ./my-skill-folder
```

List installed skills:

```bash
clawhub list
```

## Skill Format

Skills must have a `SKILL.md` file at the root:

```markdown
---
name: my-skill
description: What this skill does
---

# My Skill

Instructions for the agent...
```

## Environment

- `CLAWHUB_TOKEN`: Authentication token for CLI (set after login)
