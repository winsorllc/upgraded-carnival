---
name: composio
description: Access 1000+ apps via Composio's unified API (Gmail, Notion, GitHub, Slack, Google services, etc.). Use when you need OAuth integrations without managing individual API credentials.
---

# Composio Skill

Access 1,000+ applications through a single unified API. Composio handles OAuth flows, token refresh, and API normalization for you.

## Setup

1. Create a free account at https://app.composio.dev
2. Get your API key from Settings → API Keys
3. Set the environment variable:
   ```bash
   export COMPOSIO_API_KEY="your-api-key-here"
   ```
4. Install dependencies (run once):
   ```bash
   cd {baseDir}
   npm install
   ```

## Available Commands

### List Available Apps
```bash
{baseDir}/list-apps.js                      # List all available apps
{baseDir}/list-apps.js --search gmail       # Search for specific app
```

### List Available Actions
```bash
{baseDir}/list-actions.js gmail             # List all Gmail actions
{baseDir}/list-actions.js notion            # List all Notion actions
{baseDir}/list-actions.js github            # List all GitHub actions
{baseDir}/list-actions.js slack             # List all Slack actions
```

### Execute an Action
```bash
{baseDir}/execute.js gmail.send_email --to user@example.com --subject "Hello" --body "Test"
{baseDir}/execute.js notion.create_page --parent_id abc123 --title "My Page"
{baseDir}/execute.js github.create_issue --repo owner/repo --title "Bug" --body "Description"
{baseDir}/execute.js slack.send_message --channel C123456 --text "Hello team!"
```

### Connect an App (OAuth)
```bash
{baseDir}/connect.js gmail                  # Initiates OAuth for Gmail
{baseDir}/connect.js notion                 # Initiates OAuth for Notion
```

### List Connected Accounts
```bash
{baseDir}/connected.js                      # List all connected accounts
```

## Supported Apps (Popular)

| App | Key Actions |
|-----|-------------|
| **Gmail** | send_email, list_emails, get_email, create_draft, search_emails |
| **Notion** | create_page, update_page, list_pages, create_database_item |
| **GitHub** | create_issue, create_pr, list_repos, create_repo, commit_file |
| **Slack** | send_message, list_channels, create_channel, upload_file |
| **Google Drive** | upload_file, download_file, list_files, create_folder |
| **Google Calendar** | create_event, list_events, update_event, delete_event |
| **Linear** | create_issue, update_issue, list_issues |
| **Discord** | send_message, list_channels, create_channel |
| **Telegram** | send_message, list_chats, send_photo |
| **Jira** | create_issue, update_issue, list_issues |
| **Trello** | create_card, update_card, list_cards |
| **Asana** | create_task, update_task, list_tasks |
| **HubSpot** | create_contact, update_contact, list_contacts |
| **Salesforce** | create_lead, update_lead, list_leads |

## Output Format

### List Apps
```
=== Available Apps ===
gmail           - Gmail
notion          - Notion
github          - GitHub
slack           - Slack
...
```

### Execute Action
```
=== Action Result ===
Status: success
Result:
{
  "message_id": "msg_123",
  "status": "sent"
}
```

## When to Use

- You need to integrate with a service that requires OAuth
- You want access to 1000+ apps without managing individual API keys
- You need a unified interface for multiple services
- You're building workflows that span multiple platforms

## When NOT to Use

- You already have direct API access and credentials for a service
- You need ultra-low latency (Composio adds a small overhead)
- The service has a built-in skill already (e.g., use `gmcli` for Gmail if you have credentials)

## Error Handling

Common errors:
- `COMPOSIO_API_KEY not set` — Set the environment variable
- `App not connected` — Run `{baseDir}/connect.js <app>` first
- `Action not found` — Check action name with `{baseDir}/list-actions.js <app>`
- `Rate limit exceeded` — Composio enforces rate limits per app
