---
name: code-review
description: "Automated code review and analysis. Use when: user wants to review code changes, check for issues, analyze complexity, or perform security scans."
---

# Code Review Skill

Automated code review and analysis tools.

## When to Use

- Review code changes before commit
- Check for security vulnerabilities
- Analyze code complexity
- Find bugs and issues
- Enforce coding standards

## Pre-Commit Review

### Git Diff Analysis
```bash
# See unstaged changes
git diff

# See staged changes
git diff --cached

# See changes in specific file
git diff path/to/file

# See changes since last commit
git diff HEAD~1

# Compare branches
git diff main..feature-branch
```

### Stage Selective Changes
```bash
# Interactive staging
git add -i

# Stage specific hunks
git add -p path/to/file

# Stage specific files
git add -u
```

## Static Analysis

### Linting
```bash
# ESLint (JavaScript/TypeScript)
npm run lint
eslint .

# ShellCheck (Shell scripts)
shellcheck script.sh

# hadolint (Dockerfiles)
hadolint Dockerfile

# yamllint (YAML files)
yamllint .

# jsonlint (JSON files)
jsonlint -c .jsonlintrc.json .
```

### Code Quality
```bash
# SonarQube (if configured)
sonar-scanner

# CodeClimate (if configured)
codeclimate analyze

# Complexity analysis
cloc --by-file .
```

### Security Scanning
```bash
# npm audit
npm audit

# Yarn audit
yarn audit

# Dependency check
npm outdated

# GitHub security advisories
gh api graphql -F query='{repository(owner:"owner",name:"repo"){vulnerabilityAlerts(first:10){nodes{packageName}}}}'

# secrets scanner
git clone https://github.com/truffi/shellcheck
```

## Code Review Commands

### Check for Common Issues
```bash
# Find TODO/FIXME comments
grep -r "TODO\|FIXME\|XXX\|HACK" --include="*.js" .

# Find console.log
grep -r "console\." --include="*.js" .

# Find hardcoded passwords
grep -rE "password|secret|api[_-]?key" --include="*.js" . | grep -v node_modules
```

### File Statistics
```bash
# Lines of code by file
find . -name "*.js" -exec wc -l {} + | sort -n

# Count functions
find . -name "*.js" -exec grep -l "function\|=>" {} + | wc -l
```

## GitHub PR Reviews

### Get PR Information
```bash
# Get PR diff
gh pr diff 55 --repo owner/repo

# Get PR files
gh pr view 55 --json files --repo owner/repo

# Get PR reviews
gh pr view 55 --json reviews --repo owner/repo
```

### Review Checklist
```bash
#!/bin/bash
# Code review checklist script

echo "=== Code Review Checklist ==="
echo ""

# Check for TODO/FIXME
TODOS=$(grep -r "TODO\|FIXME" --include="*.js" . | wc -l)
echo "TODO/FIXME comments: $TODOS"

# Check for console.log
LOGS=$(grep -r "console\.log" --include="*.js" . | wc -l)
echo "Console logs: $LOGS"

# Check for hardcoded secrets
SECRETS=$(grep -rE "password|secret|api[_-]?key" --include="*.js" . | grep -v node_modules | wc -l)
echo "Potential secrets: $SECRETS"

# Check test coverage
echo ""
echo "Run: npm test -- --coverage"

# Check linting
echo ""
echo "Run: npm run lint"
```

## Automated Review Scripts

### Pre-commit Hook
```bash
# .git/hooks/pre-commit
#!/bin/bash

# Run linting
npm run lint
if [ $? -ne 0 ]; then
    echo "Linting failed"
    exit 1
fi

# Run tests
npm test
if [ $? -ne 0 ]; then
    echo "Tests failed"
    exit 1
fi
```

### GitHub Actions Review
```yaml
name: Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Security audit
        run: npm audit

      - name: Build
        run: npm run build
```

## Best Practices

1. **Review small changes** - Large PRs are hard to review thoroughly
2. **Check tests** - Ensure new code has tests
3. **Look for bugs** - Common issues: null checks, error handling, edge cases
4. **Check security** - No secrets, validate inputs, use parameterized queries
5. **Check performance** - N+1 queries, unnecessary loops, memory leaks
6. **Check readability** - Clear naming, comments for complex logic
7. **Check architecture** - Follow project patterns, proper separation

## Notes

- Use `git show` to see what changed in a specific commit
- Use `git blame` to see who changed each line
- Use `git stash` to save work in progress
- Thepopebot can perform code reviews using LLM analysis
