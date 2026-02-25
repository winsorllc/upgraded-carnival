---
name: sop-workflow
description: Define and execute Standard Operating Procedures (SOPs) with step-by-step workflows, approvals, and automation
version: 0.1.0
author: PopeBot
tags:
  - workflow
  - automation
  - procedures
  - sop
tools:
  - name: sop_create
    description: Create a new Standard Operating Procedure with steps, triggers, and execution rules
    kind: shell
    command: node {{skills_dir}}/sop-workflow/sop-cli.js create
  - name: sop_execute
    description: Execute an SOP by name, advancing through its steps
    kind: shell
    command: node {{skills_dir}}/sop-workflow/sop-cli.js execute
  - name: sop_list
    description: List all loaded SOPs with their triggers, priority, step count, and active run count
    kind: shell
    command: node {{skills_dir}}/sop-workflow/sop-cli.js list
  - name: sop_status
    description: Check the status of an active SOP execution
    kind: shell
    command: node {{skills_dir}}/sop-workflow/sop-cli.js status
  - name: sop_approve
    description: Approve a pending step in an SOP execution (for manual approval workflows)
    kind: shell
    command: node {{skills_dir}}/sop-workflow/sop-cli.js approve
  - name: sop_advance
    description: Manually advance an SOP to the next step
    kind: shell
    command: node {{skills_dir}}/sop-workflow/sop-cli.js advance
prompts:
  - Define a new SOP for deployment
  - Execute the production deployment SOP
  - List all available SOPs
  - Check the status of the current deployment
  - Approve the next step in the deployment SOP
