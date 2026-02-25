---
name: Notebook
author: PopeBot
description: Code notebook for interactive exploration. Execute and document code snippets, save results, and build reproducible experiments.
version: "1.0.0"
tags:
  - notebook
  - experiments
  - exploration
  - documentation
  - snippets
---

# Notebook

Code notebook for interactive exploration. Execute snippets, save results, and document experiments.

## When to Use

Use the notebook skill when:
- Experimenting with code
- Documenting solutions
- Building reusable examples
- Exploring APIs
- Creating tutorials

## Usage Examples

Create new notebook:
```bash
node /job/.pi/skills/notebook/notebook.js new "Experiment 1"
```

Add cell:
```bash
node /job/.pi/skills/notebook/notebook.js cell "console.log('Hello')" --type code
```

Run notebook:
```bash
node /job/.pi/skills/notebook/notebook.js run notebook.json
```

Export:
```bash
node /job/.pi/skills/notebook/notebook.js export notebook.json --format markdown
```