---
name: calendar
description: Manage Google Calendar events. Use when: user wants to create, view, or delete calendar events. Requires Google Calendar API credentials.
---

# Calendar Skill

Manage Google Calendar events.

## When to Use

✅ **USE this skill when:**

- "What's on my calendar today?"
- "Schedule a meeting for tomorrow at 3pm"
- "List my upcoming events"
- "Delete this event"

## When NOT to Use

❌ **DON'T use this skill when:**

- Non-Google calendars → use gccli or platform-specific tools
- Complex recurring events → use Google Calendar web UI
- Finding free/busy times → use free/busy lookups

## Requirements

- Google Cloud credentials with Calendar API enabled
- `gcalcli` OR `gccli` from OpenClaw

## Installation

```bash
# Install gcalcli
pip install gcalcli

# Or use gccli from OpenClaw
# See pi-skills/gccli
```

## Configuration

Set up Google Calendar API:
1. Go to Google Cloud Console
2. Enable Google Calendar API
3. Create OAuth credentials
4. Set `GOOGLE_API_KEY` or authenticate with `gcalcli`

## Usage

### List Events

```bash
# Today's events
calendar-list.sh today

# Tomorrow's events
calendar-list.sh tomorrow

# This week
calendar-list.sh week

# Specific date
calendar-list.sh 2024-01-15
```

### Create Event

```bash
# Quick event
calendar-create.sh "Team meeting" "tomorrow 3pm"

# Full event with details
calendar-create.sh "Meeting" "2024-01-15 14:00" 60 "Meeting room"
```

### Delete Event

```bash
# Delete by title
calendar-delete.sh "Team meeting"

# Delete by ID
calendar-delete.sh --id <event-id>
```

## Commands

### calendar-list.sh

List calendar events.

```bash
./calendar-list.sh [when] [options]

When:
  today, tomorrow, week, or YYYY-MM-DD

Options:
  --calendar NAME   Specific calendar
  --json           Output as JSON
```

### calendar-create.sh

Create a new event.

```bash
./calendar-create.sh <title> <when> [duration] [location]

Examples:
  ./calendar-create.sh "Lunch" "tomorrow 12pm" 60 "Cafe"
  ./calendar-create.sh "Call" "2024-01-15 14:00" 30
```

### calendar-delete.sh

Delete an event.

```bash
./calendar-delete.sh <title or id> [options]

Options:
  --id EVENT_ID    Delete by event ID
  --all            Delete all matching events
```

## Examples

### Today's Schedule

```bash
calendar-list.sh today
```

### Create Meeting

```bash
calendar-create.sh "Project Review" "Friday 2pm" 60 "Zoom"
```

### This Week

```bash
calendar-list.sh week --json
```

## Notes

- Default duration is 1 hour
- Supports natural language dates ("next Monday", "tomorrow")
- Requires Google API credentials
- Use `--json` for programmatic output
