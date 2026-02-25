---
name: git-ops-advanced
description: Advanced Git operations including branch management, commit analysis, diff viewing, and repository introspection
version: 0.1.0
author: PopeBot
tags:
  - git
  - version-control
  - branches
  - commits
tools:
  - name: git_branch_create
    description: Create a new branch
    kind: shell
    command: node {{skills_dir}}/git-ops-advanced/git-ops.js branch
  - name: git_branch_list
    description: List branches with details
    kind: shell
    command: node {{skills_dir}}/git-ops-advanced/git-ops.js branches
  - name: git_commit_log
    description: View commit history with stats
    kind: shell
    command: node {{skills_dir}}/git-ops-advanced/git-ops.js log
  - name: git_diff
    description: Show differences between commits, branches, or files
    kind: shell
    command: node {{skills_dir}}/git-ops-advanced/git-ops.js diff
  - name: git_status
    description: Show working tree status
    kind: shell
    command: node {{skills_dir}}/git-ops-advanced/git-ops.js status
prompts:
  - Create a new branch for feature development
  - Show me the recent commits with stats
  - What files have changed since the last release?
  - List all branches with their latest commit
