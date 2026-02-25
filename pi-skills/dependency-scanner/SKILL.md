---
name: dependency-scanner
description: Scan for outdated dependencies in package.json. Check security vulnerabilities and version compatibility.
---

# Dependency Scanner

Scan project dependencies for outdated packages and potential security issues.

## Setup
```bash
cd {baseDir}
npm install
```

## Usage

### Scan current project
```bash
{baseDir}/depscan.js
```

### Scan specific directory
```bash
{baseDir}/depscan.js /path/to/project
```

### Show only outdated
```bash
{baseDir}/depscan.js --outdated
```

### Show only security issues
```bash
{baseDir}/depscan.js --security
```

### Check specific package
```bash
{baseDir}/depscan.js --package express
```

### Output
```
══════════════════════════════════════════════════════════════════
                     DEPENDENCY SCAN REPORT
══════════════════════════════════════════════════════════════════

Project: my-project
Package Manager: npm
Files Found: 2 (package.json, package-lock.json)

DEPENDENCIES (12 total)
────────────────────────
  ✓ lodash          4.17.21  (current)
  ✓ express         4.18.2   (current)
  ! axios           0.21.4   →  1.6.2  (major update)
  ~ axios-retry     3.8.0    →  3.9.0  (patch available)

DEV DEPENDENCIES (8 total)
──────────────────────────
  ✓ eslint          8.55.0   (current)
  ! jest            27.5.1   →  29.7.0 (major update)

SUMMARY
───────
  Up to date:      8
  Patch updates:   2
  Minor updates:   1
  Major updates:   2
  Security issues: 0

══════════════════════════════════════════════════════════════════
```

## When to Use
- Dependency maintenance
- Security audits
- Update planning
- Pre-release checks
- CI/CD security scanning
