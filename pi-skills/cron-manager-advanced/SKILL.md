---
name: cron-manager-advanced
description: Advanced cron job management - create, list, update, remove, and schedule cron tasks
version: 0.1.0
author: PopeBot
tags:
  - cron
  - scheduler
  - automation
  - tasks
tools:
  - name: cron_add
    description: Add a new cron job
    kind: shell
    command: node {{skills_dir}}/cron-manager-advanced/cron-cli.js add
  - name: cron_list
    description: List all cron jobs
    kind: shell
    command: node {{skills_dir}}/cron-manager-advanced/cron-cli.js list
  - name: cron_remove
    description: Remove a cron job
    kind: shell
    command: node {{skills_dir}}/cron-manager-advanced/cron-cli.js remove
  - name: cron_enable
    description: Enable or disable a cron job
    kind: shell
    command: node {{skills_dir}}/cron-manager-advanced/cron-cli.js enable
prompts:
  - Schedule a daily backup at 3am
  - List all cron jobs
  - Remove the weekly cleanup cron
  - Disable the monitoring cron temporarily
