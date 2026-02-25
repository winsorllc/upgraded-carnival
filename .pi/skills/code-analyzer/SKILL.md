---
name: code-analyzer
description: Static code analysis tool. Detect complexity, find unused code, analyze dependencies, and generate code metrics. Inspired by ZeroClaw's analysis capabilities and OpenClaw's code review tools.
---

# Code Analyzer

Static code analysis for JavaScript, TypeScript, Python, and Go projects.

## Capabilities

- Complexity analysis (cyclomatic complexity)
- Find unused/dead code
- Detect code duplication
- Identify dependencies and dependency tree
- Calculate code metrics (lines of code, comments ratio, etc.)
- Generate code quality reports
- Support for multiple languages

## Usage

```bash
# Analyze complexity
/job/.pi/skills/code-analyzer/analyzer.js complexity /path/to/src --language js

# Find duplicate code
/job/.pi/skills/code-analyzer/analyzer.js duplicates /path/to/src

# Generate full report
/job/.pi/skills/code-analyzer/analyzer.js report /path/to/src --format json

# Check dependencies
/job/.pi/skills/code-analyzer/analyzer.js deps /path/to/project

# Analyze specific file
/job/.pi/skills/code-analyzer/analyzer.js file /path/to/file.js
```

## Report Format

```json
{
  "summary": {
    "totalFiles": 12,
    "totalLines": 3456,
    "codeLines": 2890,
    "commentLines": 566
  },
  "complexity": {
    "highRiskFiles": [
      {"file": "utils.js", "complexity": 23}
    ]
  },
  "duplicates": [
    {"blocks": [{"file":"a.js","start":42},{"file":"b.js","start":108}], "lines": 15}
  ]
}
```

## Notes

- Complexity score: 1-10 = simple, 11-20 = moderate, 21+ = complex
- Duplicate detection uses hash-based comparison
- Dependency analysis reads package.json, go.mod, requirements.txt
- Supports .gitignore to exclude directories