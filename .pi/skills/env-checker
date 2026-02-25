---
name: env-checker
description: Validate environment setup, check for required tools, and verify configuration files.
---

# Environment Checker

Validate development environment setup. Check for required tools, versions, and configuration files.

## Setup
No dependencies required.

## Usage

### Full environment check
```bash
{baseDir}/envcheck.sh
```

### Check specific tools
```bash
{baseDir}/envcheck.sh --node     # Check Node.js setup
{baseDir}/envcheck.sh --git      # Check Git setup
{baseDir}/envcheck.sh --docker   # Check Docker setup
```

### Check for specific commands
```bash
{baseDir}/envcheck.sh --need npm,yarn,pnpm
```

### Output
```
╔════════════════════════════════════════════════════════════════╗
║                    ENVIRONMENT CHECK REPORT                    ║
╚════════════════════════════════════════════════════════════════╝

REQUIRED TOOLS
──────────────
  ✓ node            v20.10.0          /usr/local/bin/node
  ✓ npm             10.2.3            /usr/local/bin/npm
  ✓ git             2.43.0            /usr/bin/git
  ! docker          Not installed     -
  ✓ curl            7.81.0            /usr/bin/curl

OPTIONAL TOOLS
──────────────
  ✓ python3         3.10.12           /usr/bin/python3
  - pnpm            Not found         Install with: npm install -g pnpm
  - yarn            Not found         Install with: npm install -g yarn

CONFIGURATION FILES
──────────────────
  ✓ .env            Found
  ✓ .gitignore      Found
  ! .nvmrc          Not found

ENVIRONMENT VARIABLES
────────────────────
  ✓ NODE_ENV        production
  ✓ PATH            /usr/local/...
  ! API_KEY         Not set

══════════════════════════════════════════════════════════════════
Status: ⚠️ PARTIAL (2 missing, 1 optional)
══════════════════════════════════════════════════════════════════
```

## When to Use
- New developer onboarding
- CI/CD environment validation
- Troubleshooting setup issues
- Pre-commit checks
- Docker container validation
