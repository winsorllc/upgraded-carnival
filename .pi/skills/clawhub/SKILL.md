---
name: clawhub
description: Search, install, update, and publish agent skills from ClawHub. Use when you need to fetch new skills, sync to latest version, or publish skill packages.
---

# ClawHub CLI

Search, install, update, and publish skills from ClawHub.

## Install

```bash
npm i -g clawhub
```

## Auth (for publishing)

```bash
# Login
clawhub login

# Check who you are
clawhub whoami
```

## Search

```bash
# Search for skills
clawhub search "postgres backups"
clawhub search "image processing"
```

## Install

```bash
# Install a skill
clawhub install my-skill

# Install specific version
clawhub install my-skill --version 1.2.3
```

## Update

```bash
# Update installed skill to latest
clawhub update my-skill

# Update all skills
clawhub update --all
```

## Publish

```bash
# Publish a skill
clawhub publish ./my-skill-folder
```

## List

```bash
# List installed skills
clawhub list
```

## Remove

```bash
# Remove a skill
clawhub remove my-skill
```

## Notes

- Skills are fetched from clawhub.com registry
- Each skill has a name and version
- Published skills must follow skill format (SKILL.md + optional resources)
