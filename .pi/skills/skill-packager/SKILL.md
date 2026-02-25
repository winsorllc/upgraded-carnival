---
name: skill-packager
description: Create, validate, and package PopeBot skills. Use when you need to create a new skill from template, validate an existing skill's structure, or package a skill into a distributable .skill file. Provides init_skill.py, package_skill.py, and quick_validate.py scripts.
---

# Skill Packager

This skill provides tooling to create, validate, and package PopeBot skills following best practices.

## Overview

The Skill Packager provides three core scripts that streamline the skill development workflow:

1. **init_skill.py** - Create a new skill from a template with proper structure
2. **package_skill.py** - Validate and package a skill into a distributable .skill file
3. **quick_validate.py** - Validate skill structure and frontmatter

## Quick Start

### Create a new skill

```bash
python .pi/skills/skill-packager/scripts/init_skill.py my-new-skill --path pi-skills
```

### Validate a skill

```bash
python .pi/skills/skill-packager/scripts/quick_validate.py pi-skills/my-skill
```

### Package a skill

```bash
python .pi/skills/skill-packager/scripts/package_skill.py pi-skills/my-skill
```

## Skill Structure

Every PopeBot skill follows this structure:

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description)
│   └── Markdown instructions
├── scripts/ (optional) - Executable code
├── references/ (optional) - Documentation for context
└── assets/ (optional) - Files for output use
```

## SKILL.md Frontmatter

Required fields:

```yaml
---
name: skill-name
description: Clear description of what the skill does and when to use it
---
```

Optional fields:

```yaml
license: MIT
metadata:
  emoji: 🛠️
```

### Naming Rules

- Lowercase letters, digits, and hyphens only
- Cannot start/end with hyphen
- No consecutive hyphens
- Maximum 64 characters
- Example: `pdf-processor`, `email-sender`, `web-scraper`

### Description Guidelines

Include both **what** the skill does and **when** to use it:

**Good:**
> "Extract text from PDFs and convert to various formats. Use when working with PDF files for text extraction, conversion to Markdown/HTML, or batch processing."

**Bad:**
> "PDF stuff"

## Scripts Reference

### init_skill.py

Creates a new skill from template.

**Usage:**
```bash
python init_skill.py <skill-name> --path <output-dir> [options]
```

**Options:**
- `--resources scripts,references,assets` - Pre-create resource directories
- `--examples` - Include example files in the skill

**Examples:**
```bash
# Basic skill
python init_skill.py my-skill --path pi-skills

# With resource directories
python init_skill.py pdf-tools --path pi-skills --resources scripts,references

# With examples (good for learning)
python init_skill.py demo-skill --path pi-skills --resources scripts --examples
```

### package_skill.py

Validates and packages a skill into a .skill file (zip format).

**Usage:**
```bash
python package_skill.py <skill-folder> [output-dir]
```

**Process:**
1. Runs validation automatically
2. Creates `<skill-name>.skill` zip file
3. Excludes .git, node_modules, __pycache__, symlinks

**Examples:**
```bash
# Package to current directory
python package_skill.py pi-skills/my-skill

# Package to specific directory
python package_skill.py pi-skills/my-skill ./dist
```

### quick_validate.py

Validates skill structure and frontmatter without packaging.

**Usage:**
```bash
python quick_validate.py <skill-folder>
```

**Checks:**
- SKILL.md exists
- Valid YAML frontmatter
- Required name and description fields
- Name follows naming rules
- Description length < 1024 chars
- No unexpected frontmatter keys

## Skill Creation Workflow

1. **Plan** - Define what the skill does and when it triggers
2. **Initialize** - Run `init_skill.py` with appropriate resources
3. **Implement** - Write SKILL.md body and add scripts/references/assets
4. **Validate** - Run `quick_validate.py` to check structure
5. **Package** - Run `package_skill.py` to create distributable file
6. **Test** - Use the skill on real tasks, iterate as needed

## Best Practices

### Progressive Disclosure

Keep SKILL.md under 500 lines. For larger content:
- Move detailed references to `references/*.md`
- Keep only essential workflow in main body
- Link to reference files when needed

### Token Efficiency

- Only include info Codex doesn't already have
- Use concise examples
- Avoid duplicating info in SKILL.md and reference files

### Scripts

Use scripts for:
- Repetitive code that gets rewritten
- Tasks requiring deterministic reliability
- Complex operations with many parameters

### References

Use references for:
- API documentation
- Database schemas
- Detailed workflow guides
- Company policies/templates

### Assets

Use assets for:
- Templates (PowerPoint, documents)
- Boilerplate code
- Images, fonts, icons
- Files meant to be copied/used in output

## Common Patterns

### Workflow-Based Structure

For sequential processes:

```markdown
# Skill Name

## Overview
[Brief description]

## Workflow Decision Tree
[When to use which path]

## Step 1: [Name]
[Instructions]

## Step 2: [Name]
[Instructions]
```

### Task-Based Structure

For tool collections:

```markdown
# Skill Name

## Overview
[Brief description]

## Quick Start
[Immediate example]

## Task: [Name]
[Instructions]

## Task: [Name]
[Instructions]
```

### Reference-Based Structure

For guidelines/standards:

```markdown
# Skill Name

## Overview
[Brief description]

## Guidelines
[Rules and standards]

## Specifications
[Technical details]
```

## Activating Skills

After creating a skill in `pi-skills/`, activate it:

```bash
ln -s ../pi-skills/skill-name .pi/skills/skill-name
```

To deactivate:

```bash
rm .pi/skills/skill-name
```

## Examples from Existing Skills

See these well-structured skills for reference:
- `brave-search` - Simple, focused tool skill
- `browser-tools` - Complex multi-feature skill with scripts
- `composio` - Integration skill with extensive references
- `youtube-transcript` - Focused single-purpose skill
