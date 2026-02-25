---
name: apple-reminders
description: Manage Apple Reminders via remindctl CLI (list, add, complete, delete reminders). Use when: user wants to create personal to-dos with due dates that sync to iOS/macOS Reminders app, manage reminder lists, or track tasks with native Apple ecosystem integration.
metadata:
  os: ["darwin"]
  requires:
    bins: ["remindctl"]
  install:
    - id: brew
      kind: brew
      formula: steipete/tap/remindctl
      bins: ["remindctl"]
      label: Install remindctl via Homebrew
---

# Apple Reminders CLI (remindctl)

Manage Apple Reminders directly from the terminal using `remindctl`. Create, view, edit, complete, and delete reminders that sync across all your Apple devices.

## When to Use

✅ **USE this skill when:**
- User explicitly mentions "reminder" or "Reminders app"
- Creating personal to-dos with due dates that sync to iOS
- Managing Apple Reminders lists
- User wants tasks to appear in their iPhone/iPad Reminders app
- Time-sensitive personal tasks (e.g., "remind me to call mom at 3pm")

❌ **DON'T use this skill when:**
- Scheduling agent tasks or alerts → use `cron` or `schedule-task`
- Calendar events or appointments → use `gccli` (Google Calendar)
- Project/work task management → use `notion`, `gh-issues`, or task queue
- One-time agent notifications → use `push-notify` or `discord-notify`
- User says "remind me" but means an agent alert → clarify first

## Installation

```bash
# Install via Homebrew
brew install steipete/tap/remindctl

# Verify installation
remindctl --version
```

## Setup

### Permissions (macOS)

Grant Reminders permission when prompted:
- System Settings → Privacy & Security → Reminders
- Enable for Terminal or your terminal app

### Check Status

```bash
# Check connectivity and permissions
remindctl status

# Request access if needed
remindctl authorize
```

## Common Commands

### View Reminders

```bash
remindctl                    # Today's reminders
remindctl today              # Today only
remindctl tomorrow           # Tomorrow only
remindctl week               # This week
remindctl overdue            # Past due reminders
remindctl all                # All reminders
remindctl 2026-02-25         # Specific date (YYYY-MM-DD)
```

### Manage Lists

```bash
remindctl list                           # List all lists
remindctl list "Work"                    # Show reminders in specific list
remindctl list "Projects" --create       # Create new list
remindctl list "Old Project" --delete    # Delete list (careful!)
```

### Create Reminders

```bash
# Basic reminder
remindctl add "Buy groceries"

# With notes
remindctl add "Call dentist" --notes "Ask about teeth whitening"

# With due date
remindctl add "Submit tax return" --due "2026-04-15"

# With priority (1=high, 5=low)
remindctl add "URGENT: Pay electricity bill" --priority 1

# Into specific list
remindctl add "Finish proposal" --list "Work"

# With start date (don't show until)
remindctl add "Pack bags" --start "2026-03-01" --due "2026-03-05"

# Repeating reminder
remindctl add "Water plants" --repeat "weekly"
```

### Complete/Uncomplete

```bash
# Complete by title (fuzzy match)
remindctl complete "Buy groceries"

# Complete by list
remindctl complete "Call dentist" --list "Personal"

# Uncomplete (mark as pending)
remindctl uncomplete "Buy groceries"
```

### Delete Reminders

```bash
# Delete by title (fuzzy match)
remindctl delete "Old reminder"

# Force delete (no confirmation)
remindctl delete "Old reminder" --force
```

### Edit Reminders

```bash
# Edit interactively
remindctl edit "Buy groceries"

# Change due date
remindctl edit "Submit report" --due "2026-03-01"

# Change list
remindctl edit "Call client" --list "Work"

# Update priority
remindctl edit "Review PR" --priority 2
```

## Advanced Usage

### Date Formats

```bash
# ISO format (recommended)
remindctl add "Task" --due "2026-02-25"

# Relative dates
remindctl add "Task" --due "tomorrow"
remindctl add "Task" --due "next monday"
remindctl add "Task" --due "in 2 weeks"

# With time
remindctl add "Call at 3pm" --due "today 15:00"
```

### Repeat Patterns

```bash
remindctl add "Pay rent" --repeat "monthly"
remindctl add "Water plants" --repeat "weekly"
remindctl add "Team standup" --repeat "daily"
remindctl add "Quarterly review" --repeat "quarterly"
remindctl add "Annual checkup" --repeat "yearly"
```

### Search and Filter

```bash
# Search by text
remindctl all | grep "groceries"

# High priority only
remindctl all --priority 1

# Overdue only
remindctl overdue --list "Work"
```

### JSON Output (for scripting)

```bash
# Get reminders as JSON
remindctl today --json

# Parse with jq
remindctl all --json | jq '.[] | select(.priority == 1)'
```

## Integration Examples

### Add Reminder from Agent

```javascript
// When user says "remind me to call John tomorrow"
remindctl add "Call John" --due "tomorrow" --list "Personal"
```

### Daily Briefing

```bash
# Get today's reminders for morning briefing
remindctl today --json | jq -r '.[] | "- [ ] \(.title)"' 
```

### Overdue Alert

```bash
# Check for overdue reminders
OVERDUE=$(remindctl overdue --json | jq 'length')
if [ "$OVERDUE" -gt 0 ]; then
  echo "⚠️ You have $OVERDUE overdue reminders!"
  remindctl overdue
fi
```

## Troubleshooting

### Permission Denied

```bash
# Check permissions
remindctl status

# Reset permissions
tccutil reset Reminders com.apple.Terminal
```

### Reminders Not Syncing

- Ensure iCloud sync is enabled for Reminders
- Check Apple ID is signed in on all devices
- Wait a few moments for iCloud sync

### List Not Found

```bash
# List all available lists
remindctl list

# Create if missing
remindctl list "NewList" --create
```

## Examples

### Personal Task Management

```bash
# Morning routine
remindctl add "Take vitamins" --due "today 08:00" --repeat "daily"
remindctl add "Check email" --due "today 09:00" --list "Work"

# Shopping
remindctl add "Milk" --list "Shopping"
remindctl add "Eggs" --list "Shopping"
remindctl add "Bread" --list "Shopping"
```

### Work Projects

```bash
# Project deadlines
remindctl add "Submit Q1 report" --due "2026-03-31" --priority 1 --list "Work"
remindctl add "Team retrospective" --due "2026-03-15" --list "Work"

# Meeting prep
remindctl add "Prepare slides" --due "2026-02-28" --notes "Focus on Q4 metrics"
```

### Health & Wellness

```bash
# Medication reminders
remindctl add "Take medication" --due "today 08:00" --repeat "daily" --priority 1
remindctl add "Take medication" --due "today 20:00" --repeat "daily" --priority 1

# Exercise
remindctl add "Gym session" --due "tomorrow 18:00" --repeat "weekly" --list "Health"
```

## Best Practices

1. **Use Lists**: Organize reminders by context (Work, Personal, Shopping, etc.)
2. **Set Priorities**: Use priority 1 for urgent items
3. **Add Notes**: Include important details in notes
4. **Use Repeats**: For recurring tasks, set repeat patterns
5. **Clean Up**: Complete or delete old reminders regularly
6. **Start Dates**: Use start dates to avoid cluttering today's view

## Security Notes

- Reminders sync via iCloud - ensure 2FA is enabled
- Don't store sensitive information in reminder titles
- Use notes for private details (still iCloud synced)

## References

- [remindctl GitHub](https://github.com/steipete/remindctl)
- [Apple Reminders App](https://support.apple.com/guide/reminders/welcome/mac)
