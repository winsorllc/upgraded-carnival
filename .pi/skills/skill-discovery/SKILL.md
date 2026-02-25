---
name: skill-discovery
description: Automatically discover, evaluate, and generate manifests for new PopeBot skills from GitHub. Based on ZeroClaw's SkillForge architecture.
---

# Skill Discovery (SkillForge)

Automatically discovers, evaluates, and generates integration manifests for new PopeBot-compatible skills from GitHub repositories.

## Overview

This skill implements a simplified version of ZeroClaw's SkillForge system. It:
1. **Scouts** GitHub for skill-related repositories
2. **Evaluates** candidates across multiple dimensions (compatibility, quality, security)
3. **Generates** PopeBot-compatible SKILL.md manifests for qualified candidates

## Usage

### Discover Skills

```bash
# Basic discovery (searches for "thepopebot skill" and "ai agent skill")
{baseDir}/discover.js

# Search with custom queries
{baseDir}/discover.js --query "popebot automation"

# Show detailed output
{baseDir}/discover.js --verbose

# Limit results
{baseDir}/discover.js --limit 10
```

### Evaluate a Specific Repository

```bash
# Evaluate a single repo by URL
{baseDir}/evaluate.js https://github.com/user/repo-name

# Evaluate with custom scoring weights
{baseDir}/evaluate.js https://github.com/user/repo-name --min-score 0.6
```

### Generate Skill Manifest

```bash
# Generate SKILL.md from a evaluated candidate
{baseDir}/generate.js --name "skill-name" --url "https://github.com/user/repo" --description "What it does"
```

## Scoring Dimensions

Skills are evaluated on three dimensions (each 0.0-1.0):

| Dimension | Weight | Factors |
|-----------|--------|---------|
| **Compatibility** | 30% | Language (JavaScript/TypeScript favored), runtime requirements |
| **Quality** | 35% | Star count (log scale), documentation, test coverage |
| **Security** | 35% | License presence, bad pattern detection, update recency |

### Recommendations

- **Auto** (score ≥ 0.7): Safe to auto-integrate
- **Manual** (0.4 ≤ score < 0.7): Needs human review
- **Skip** (score < 0.4): Not recommended

## Output Format

```
=== SkillForge Discovery Report ===
Discovered: 5 candidates
Evaluated: 5 candidates
Auto-integratable: 2
Manual review: 2
Skipped: 1

--- Candidates ---

1. example-skill ⭐ AUTO (0.82)
   URL: https://github.com/user/example-skill
   Language: JavaScript | Stars: 156 | License: MIT
   Scores: Compatibility=1.0, Quality=0.72, Security=0.8

2. another-skill ⚠️ MANUAL (0.55)
   URL: https://github.com/user/another-skill
   Language: Python | Stars: 23 | License: None
   Scores: Compatibility=0.6, Quality=0.45, Security=0.5

3. low-quality ⛔ SKIP (0.28)
   URL: https://github.com/user/low-quality
   Language: Unknown | Stars: 1 | License: None
   Scores: Compatibility=0.2, Quality=0.15, Security=0.3
```

## Installation

```bash
cd {baseDir}
npm install
```

## When to Use

- When you want to find new skills for PopeBot
- When exploring the skill ecosystem
- When you need to evaluate a skill before integrating
- When building automated skill management workflows

## Example Workflow

```bash
# 1. Discover new skills
{baseDir}/discover.js --limit 20 --verbose > /job/tmp/skill-candidates.md

# 2. Review the report
cat /job/tmp/skill-candidates.md

# 3. Evaluate a promising candidate in detail
{baseDir}/evaluate.js https://github.com/user/promising-skill

# 4. Generate integration manifest for approved skills
{baseDir}/generate.js --name "promising-skill" \
  --url "https://github.com/user/promising-skill" \
  --description "Does something useful"

# 5. Move generated manifest to pi-skills/ and create symlink
mv /job/tmp/skills/promising-skill/SKILL.md /job/pi-skills/promising-skill/
ln -s ../../pi-skills/promising-skill /job/.pi/skills/promising-skill
```

## Configuration

Set these environment variables for customization:

- `GITHUB_TOKEN` - Personal access token for higher API rate limits
- `SKILLFORGE_MIN_SCORE` - Minimum score for auto recommendation (default: 0.7)
- `SKILLFORGE_OUTPUT_DIR` - Output directory for generated manifests (default: /job/tmp/skills)

## Security Notes

- Skills containing bad patterns (malware, exploit, etc.) are automatically flagged
- Missing licenses reduce security scores significantly
- Repositories not updated in 180+ days receive recency penalties
