---
name: file-intel
description: Analyze file relationships, dependencies, and patterns. Use when understanding codebase architecture, finding related files, analyzing imports/exports, or detecting code patterns across a project.
---

# File Intelligence

This skill provides context-aware file analysis, dependency tracking, and pattern detection across your codebase.

## Setup

```bash
cd {baseDir}
npm install
```

## Available Tools

### analyze-dependencies
Analyze imports and dependencies for a file or directory.

```bash
{baseDir}/analyze-dependencies.js /path/to/file.js
{baseDir}/analyze-dependencies.js /path/to/directory --depth 2
```

Outputs JSON with:
- Direct imports/exports
- External dependencies
- Internal dependencies (files within project)
- Dependency graph visualization

### find-related
Find files related to a given file by analyzing imports, exports, and naming patterns.

```bash
{baseDir}/find-related.js /path/to/file.js
{baseDir}/find-related.js /path/to/file.js --limit 20
```

Uses multiple signals:
- Direct imports/exports relationships
- Shared module prefixes
- Similar naming patterns
- Co-occurrence in test files

### detect-patterns
Detect code patterns and conventions across a codebase.

```bash
{baseDir}/detect-patterns.js /path/to/project
{baseDir}/detect-patterns.js /path/to/project --types "react-hooks,api-routes"
```

Pattern types:
- `react-hooks`: Custom React hooks
- `api-routes`: API endpoint definitions
- `components`: React/Vue components
- `services`: Service classes/modules
- `models`: Data models/schemas
- `utils`: Utility functions
- `types`: Type definitions

### analyze-structure
Generate a high-level overview of project structure.

```bash
{baseDir}/analyze-structure.js /path/to/project
```

Outputs:
- Directory tree with file counts
- Language/framework detection
- Key entry points
- Configuration files

## Usage Examples

### Understanding a new codebase
```bash
{baseDir}/analyze-structure.js /path/to/project
{baseDir}/find-related.js /path/to/project/src/index.js
```

### Finding all API routes
```bash
{baseDir}/detect-patterns.js /path/to/project --types "api-routes"
```

### Analyzing dependencies before refactoring
```bash
{baseDir}/analyze-dependencies.js /path/to/old-module --depth 3
```

## Integration with LLM

When you need to understand a codebase, first use these tools to gather context, then provide the results to the LLM for analysis.

Example workflow:
1. Run `analyze-structure` to understand project layout
2. Run `find-related` on key entry points
3. Use `detect-patterns` to find specific code patterns
4. Feed results to LLM for architectural advice
