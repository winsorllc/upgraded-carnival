---
name: aieos-identity
description: Portable AI identity system using AIEOS (AI Entity Object Specification) - import, export, and manage agent personas in a standardized JSON format.
metadata:
  version: "1.0.0"
  author: "PopeBot"
  tags: ["identity", "aieos", "persona", "configuration"]
---

# AIEOS Identity Skill

Portable AI identity management using the AIEOS (AI Entity Object Specification) standard. This skill allows importing/exporting agent personas in a standardized JSON format, enabling identity portability across AI systems.

## Overview

AIEOS v1.1 is a standardization framework for portable AI identity. It allows you to:
- **Import identities** from external AIEOS-compatible systems
- **Export identities** for use in other AIEOS-compatible systems
- **Maintain behavioral integrity** across different AI models
- **Share and version** agent personas

## Directory Structure

```
.pi/skills/aieos-identity/
├── SKILL.md              # This file
├── package.json          # Node.js dependencies
├── aieos-validator.js  # AIEOS schema validation
├── aieos-converter.js    # Convert between AIEOS and PopeBot formats
├── aieos-export.js      # Export PopeBot identity to AIEOS
├── aieos-import.js      # Import AIEOS to PopeBot format
└── examples/            # Example AIEOS identity files
    ├── default.aieos.json
    └── creative-writer.aieos.json
```

## Commands

### Validate AIEOS file
```bash
.pi/skills/aieos-identity/aieos-validator.js <path-to-aieos.json>
```

### Convert AIEOS to PopeBot format
```bash
.pi/skills/aieos-identity/aieos-import.js <path-to-aieos.json> [output-dir]
```

### Export PopeBot identity to AIEOS
```bash
.pi/skills/aieos-identity/aieos-export.js [config-dir] [output-path]
```

## Usage

Use this skill when you need to:
1. Import an AIEOS-compliant identity from another system
2. Export your agent's identity for portability
3. Validate AIEOS identity files
4. Migrate between OpenClaw, ZeroClaw, and PopeBot identity systems

## AIEOS Schema

### Required Sections

#### identity
- `names`: first, last, nickname
- `bio`: gender, age_biological, age_apparent
- `origin`: nationality, birthplace

#### psychology  
- `neural_matrix`: creativity, logic, emotionality
- `traits`: mbti, ocean (Big Five)
- `moral_compass`: alignment, core_values

#### linguistics
- `text_style`: formality_level, style_descriptors
- `idiolect`: catchphrases, forbidden_words, preferred_words

#### motivations
- `core_drive`: Primary motivation statement
- `goals`: short_term, long_term

#### capabilities
- `skills`: array of skill objects
- `tools`: array of available tools

See `examples/default.aieos.json` for a complete example.
