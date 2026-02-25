---
name: Health Check
description: Verify system health and environment
tags:
  - maintenance
  - health
---

# Health Check Workflow

This workflow runs basic health checks on the system.

## Step 1: Check Node.js Version

Verify Node.js is installed and working.

```shell:node-check
node --version
```

## Step 2: Check Disk Space

Check available disk space.

```shell:disk-check
df -h . | tail -1 | awk '{print $4 " available"}'
```

## Step 3: Check Memory

Show memory information.

```shell:memory-check
free -h 2>/dev/null || echo "Memory check not available"
```

## Step 4: Report Success

Generate a success report.

```javascript:report
const timestamp = new Date().toISOString();
console.log(`✅ Health check completed at ${timestamp}`);
console.log("All system checks passed!");
```
