---
name: Todo Manager
author: PopeBot
description: Task and todo list management with priorities, categories, and due dates. Track progress on tasks across projects.
version: "1.0.0"
tags:
  - todo
  - tasks
  - productivity
  - management
  - tracking
---

# Todo Manager

Task and todo list management with priorities, categories, and due dates. Inspired by OpenClaw's session task management.

## When to Use

Use the todo-manager skill when:
- Managing task lists
- Tracking work items
- Prioritizing tasks
- Organizing by category
- Setting deadlines

## Usage Examples

Add todo:
```bash
node /job/.pi/skills/todo-manager/todo.js add "Implement feature X" --priority high --due 2026-03-01
```

List todos:
```bash
node /job/.pi/skills/todo-manager/todo.js list
```

Complete todo:
```bash
node /job/.pi/skills/todo-manager/todo.js complete 1
```

Filter by category:
```bash
node /job/.pi/skills/todo-manager/todo.js list --category work --priority high
```