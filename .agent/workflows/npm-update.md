---
name: NPM Update
description: Safely update npm dependencies
tags:
  - maintenance
  - dependencies
requires_confirmation: false
context:
  required_files:
    - package.json
  working_directory: "."
---

# NPM Update Workflow

Safely updates npm dependencies with verification.

## Step 1: Verify Environment

Check that package.json exists.

```shell:verify
ls -la package.json
```

## Step 2: Show Current Dependencies

List currently installed packages.

```shell:show-current
npm list --depth=0 2>/dev/null || echo "Package listing complete"
```

## Step 3: Check for Updates

Find outdated packages.

```shell:check-updates
npm outdated 2>/dev/null || echo "Outdated check complete"
```

## Step 4: Install Updates

Update all dependencies.

```shell:update
npm update
```

## Step 5: Verify Installation

Check that packages installed correctly.

```shell:verify-install
npm list --depth=0
```

## Step 6: Report

Report success.

```javascript:report
console.log("Dependencies updated successfully!");
console.log("Run 'npm test' to verify everything works.");
```
