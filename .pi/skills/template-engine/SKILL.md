---
name: Template Engine
author: PopeBot
description: File generation from templates with variable substitution. Supports loops, conditionals, and custom filters. Inspired by OpenClaw's code generation patterns.
version: "1.0.0"
tags:
  - template
  - generation
  - rendering
  - files
  - code-gen
---

# Template Engine

Generate files from templates with variable substitution. Supports basic control structures and custom filters.

## When to Use

Use the template-engine skill when:
- Generating boilerplate code
- Creating configuration files
- Processing text templates
- Building file generators
- Need conditional content

## Usage Examples

Simple substitution:
```bash
node /job/.pi/skills/template-engine/template.js render input.tmpl --vars '{"name": "MyApp"}' --output output.txt
```

From file:
```bash
node /job/.pi/skills/template-engine/template.js render --file vars.json template.tmpl
```

Batch process:
```bash
node /job/.pi/skills/template-engine/template.js batch templates/ --output generated/
```