---
name: pushover
description: Send push notifications to iOS, Android, and desktop devices via Pushover API
version: 0.1.0
author: PopeBot
tags:
  - notifications
  - push
  - mobile
  - alerts
tools:
  - name: pushover_send
    description: Send a push notification via Pushover
    kind: shell
    command: node {{skills_dir}}/pushover/pushover.js send
  - name: pushover_validate
    description: Validate Pushover credentials
    kind: shell
    command: node {{skills_dir}}/pushover/pushover.js validate
prompts:
  - Send me a notification when the build completes
  - Alert me if the server goes down
