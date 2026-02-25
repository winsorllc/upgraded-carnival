---
name: code-intelligence
description: Semantic code search, relationship mapping, and codebase intelligence. Provides deep code analysis including symbol search, dependency tracking, change impact analysis, and codebase Q&A.
---

# Code Intelligence Skill

Advanced codebase analysis and search tools inspired by hybrid memory systems. This skill enables the agent to understand code relationships, search semantically, and analyze the impact of changes.

## Setup

```bash
cd /job/.pi/skills/code-intelligence
npm install
```

## Tools

### Index Codebase

Build a searchable index of the codebase:

```bash
node index.js --scan /path/to/project
```

This creates:
- Symbol table (functions, classes, exports)
- Import/dependency graph
- File metadata index

### Semantic Search

Search for code by meaning, not just text:

```bash
# Find code related to authentication
node search.js "authentication middleware"

# Find where database connections are established
node search.js "database connection setup"

# Search with filters
node search.js "user validation" --type function --ext js,ts
```

### Relationship Analysis

Understand code dependencies:

```bash
# What depends on this file?
node deps.js --dependents src/utils/api.js

# What does this file import?
node deps.js --imports src/utils/api.js

# Show full dependency chain
node deps.js --chain src/app.js
```

### Impact Analysis

Predict what might break with changes:

```bash
# Analyze impact of modifying a function
node impact.js src/utils/auth.js --function verifyToken

# Check impact of file changes
node impact.js src/config/database.js
```

### Code Q&A

Ask questions about the codebase:

```bash
node ask.js "Where is the JWT secret configured?"
node ask.js "How does error handling work in this project?"
node ask.js "What functions use the database connection?"
```

## Architecture

The skill uses a layered approach:

1. **Parser Layer**: Tree-sitter for AST parsing
2. **Index Layer**: SQLite for fast lookups + JSON for graph data
3. **Search Layer**: Hybrid keyword + semantic matching
4. **Analysis Layer**: Graph algorithms for relationship mapping

## Output Format

All tools output JSON for programmatic use or formatted text for readability:

```bash
# JSON output (for piping to other tools)
node search.js "auth" --json

# Formatted text (default)
node search.js "auth"
```

## When to Use

- Understanding large or unfamiliar codebases
- Finding all usages of a function or variable
- Assessing risk before making changes
- Discovering patterns across the codebase
- Answering "where is X?" questions
- Code review preparation
- Refactoring planning

## Requirements

- Node.js ≥18
- Tree-sitter parsers for supported languages (auto-installed)

## Supported Languages

- JavaScript/TypeScript
- Python
- Rust
- Go
- Java
- Ruby
- And more via tree-sitter

## Data Storage

Index files are stored in `.code-intelligence/`:
- `index.db` - SQLite database
- `graph.json` - Dependency graph
- `cache/` - Parsed AST cache

Add `.code-intelligence/` to your `.gitignore`.
