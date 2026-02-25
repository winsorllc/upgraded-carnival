---
name: memory-forget
description: Selectively forget stored memories - remove specific facts, conversations, or data from persistent memory
version: 0.1.0
author: PopeBot
tags:
  - memory
  - forget
  - privacy
  - data-management
tools:
  - name: memory_forget
    description: Remove specific memories by keyword, timestamp, or pattern
    kind: shell
    command: node {{skills_dir}}/memory-forget/memory-forget.js forget
  - name: memory_list
    description: List stored memories before forgetting
    kind: shell
    command: node {{skills_dir}}/memory-forget/memory-forget.js list
  - name: memory_stats
    description: Show memory statistics and storage info
    kind: shell
    command: node {{skills_dir}}/memory-forget/memory-forget.js stats
prompts:
  - Forget everything about project X
  - Remove memories from last week
  - List what I know about Y
  - Clear all stored memories
