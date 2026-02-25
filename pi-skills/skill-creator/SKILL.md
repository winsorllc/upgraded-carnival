---
name: skill-creator
description: Create new PopeBot skills from templates. Generate SKILL.md files and implementation code for new integrations.
metadata:
  {
    "openclaw": {
      "emoji": "🛠️",
      "requires": { "bins": ["mkdir", "touch"] }
    }
  }
---

# Skill Creator

Create new PopeBot skills from templates.

## Usage

Create a new skill:

```bash
skill-create my-new-skill
skill-create api-integration --template api
skill-create cli-tool --template cli
```

Templates available:

- `default`: Basic skill structure
- `api`: API-based integration
- `cli`: CLI wrapper
- `webhook`: Webhook handler

## Generated Structure

```
skills/
└── my-new-skill/
    ├── SKILL.md           # Skill definition
    └── my-new-skill       # Implementation (shell script)
```

## Skill Metadata

The SKILL.md includes:

- `name`: Skill identifier
- `description`: What it does
- `metadata`: OpenClaw compatibility data
- Instructions for the agent
