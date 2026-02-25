---
name: Email Agent
description: Allows the War Room Agent to send direct emails to the user or external contacts using a Gmail SMTP relay.
---

# Email Agent Skill

## Capabilities
This skill gives you access to the `send_email` tool.

You should use this tool when:
1. The USER explicitly requests that you "email" or "send" something to them.
2. You have completed a long-running, multi-step job (like a 30-minute legal research sprint) and you need to proactively notify the USER of your findings.
3. You are generating a Draft Pleading and the prompt asks you to "email the draft" for review.

## Configuration
For this tool to work, the Docker agent requires two environment variables injected via GitHub Secrets:
* `POPEBOT_EMAIL_USER` = The bot's Gmail address (e.g., `winsorbot@gmail.com`)
* `POPEBOT_EMAIL_PASS` = The 16-character Google App Password (not the actual account password)

## Usage Example
```javascript
await context.tools.send_email({
  to: "winsorllc@yahoo.com",
  subject: "NTA Draft: Do v. Truong",
  body: "Attached is the drafted Notice to Admit...",
  isImportant: true
});
```
