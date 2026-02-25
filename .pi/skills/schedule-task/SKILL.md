---
name: schedule-task
description: "Create and manage scheduled shell tasks. Use when: automating recurring operations. NOT for: sending messages (use cron agent)."
metadata: { "openclaw": { "emoji": "⏰", "requires": { "bins": ["node-cron"] } } }
---

# Schedule Task Skill

Create and manage scheduled shell-only tasks using cron expressions. Tasks run in background and log output only.

## When to Use

✅ **USE this skill when:**
- Recurring cleanup jobs
- Periodic data processing
- Automated backups
- Scheduled maintenance

❌ **DON'T use this skill when:**
- Sending messages to channels → use cron agent
- Tasks requiring user interaction
- Complex workflows (use SOP runner)

## ⚠️ WARNING

Shell task output is **only logged**, not delivered to any channel. For scheduled messages, use `cron_add` with `job_type='agent'` and delivery config.

## Usage

### Create Recurring Task

```javascript
const { schedule } = require('/job/.pi/skills/schedule-task/scheduler.js');

const task = await schedule('create', {
  expression: '0 2 * * *', // Daily at 2 AM
  command: 'node cleanup.js --older-than 7d',
  name: 'Daily cleanup',
  approved: true // Required for medium/high risk
});

console.log(task.id); // sched_abc123
```

### Create One-Time Task

```javascript
// Run in 30 minutes
const once = await schedule('once', {
  delay: '30m',
  command: 'echo "Delayed task"'
});

// Run at specific time
const scheduled = await schedule('once', {
  runAt: '2026-02-26T09:00:00Z',
  command: 'node report.js'
});
```

### List Tasks

```javascript
const tasks = await schedule('list');
console.log(tasks);
// [
//   { id: "sched_abc", expression: "0 2 * * *", command: "...", enabled: true },
//   ...
// ]
```

### Get Task Details

```javascript
const task = await schedule('get', { id: 'sched_abc123' });
console.log(task);
// {
//   id: "sched_abc123",
//   expression: "0 2 * * *",
//   command: "node cleanup.js",
//   enabled: true,
//   lastRun: "2026-02-25T02:00:00Z",
//   nextRun: "2026-02-26T02:00:00Z",
//   status: "scheduled"
// }
```

### Cancel/Remove Task

```javascript
await schedule('cancel', { id: 'sched_abc123' });
// or
await schedule('remove', { id: 'sched_abc123' });
```

### Pause/Resume Task

```javascript
await schedule('pause', { id: 'sched_abc123' });
await schedule('resume', { id: 'sched_abc123' });
```

## Cron Expressions

```
*    *    *    *    *
┬    ┬    ┬    ┬    ┬
│    │    │    │    │
│    │    │    │    └─ Day of week (0-7, 0=Sunday)
│    │    │    └────── Month (1-12)
│    │    └─────────── Day of month (1-31)
│    └──────────────── Hour (0-23)
└───────────────────── Minute (0-59)
```

### Examples

```javascript
// Every 5 minutes
'*/5 * * * *'

// Every hour at 30 minutes past
'30 * * * *'

// Every day at 2:30 AM
'30 2 * * *'

// Every Monday at 9 AM
'0 9 * * 1'

// First day of month
'0 0 1 * *'

// Weekdays at noon
'0 12 * * 1-5'

// Complex: Every 15 min, 9 AM - 5 PM, weekdays
'*/15 9-17 * * 1-5'
```

## Delay Formats

```javascript
// Minutes
'30m'  // 30 minutes

// Hours
'2h'   // 2 hours
'24h'  // 24 hours

// Days
'1d'   // 1 day
'7d'   // 7 days

// Combined
'1h30m'  // 1 hour 30 minutes
'2d12h'  // 2 days 12 hours
```

## API

```javascript
schedule(action, options = {})
```

**Actions:** `create`, `add`, `once`, `list`, `get`, `cancel`, `remove`, `pause`, `resume`

**Options:**
- For create/add: `expression`, `command`, `name`, `approved`
- For once: `delay` or `runAt`, `command`
- For get/cancel/remove/pause/resume: `id`

**Returns:**
```javascript
// create/add/once
{ id: "sched_abc123", status: "scheduled" }

// list
[{ id, expression, command, enabled, lastRun, nextRun }]

// get
{ id, expression, command, enabled, lastRun, nextRun, status }
```

## Task Output

All task output goes to logs:

```
/job/logs/schedule/sched_abc123.log

[2026-02-25T02:00:00Z] Starting task: Daily cleanup
[2026-02-25T02:00:05Z] Cleaning 142 files...
[2026-02-25T02:00:10Z] Task completed (exit code: 0)
```

## Error Handling

```javascript
try {
  await schedule('create', {
    expression: 'invalid',
    command: 'echo test'
  });
} catch (error) {
  if (error.code === 'INVALID_CRON') {
    console.error('Invalid cron expression');
  } else if (error.code === 'APPROVAL_REQUIRED') {
    console.error('Command requires approval');
  } else if (error.code === 'DUPLICATE') {
    console.error('Task already exists');
  }
}
```

## Bash CLI

```bash
# Create task
node /job/.pi/skills/schedule-task/scheduler.js \
  --action create \
  --expression "0 2 * * *" \
  --command "node cleanup.js" \
  --name "Daily cleanup"

# List tasks
node /job/.pi/skills/schedule-task/scheduler.js --action list

# Cancel task
node /job/.pi/skills/schedule-task/scheduler.js \
  --action cancel \
  --id sched_abc123
```

## Security

- Autonomy level checks
- Command approval for medium/high risk
- Rate limiting on scheduling
- Shell injection prevention
- Sandbox execution (optional)

## Best Practices

1. Test commands manually before scheduling
2. Use specific error handling in scripts
3. Log to files for debugging
4. Set up monitoring for failed tasks
5. Document task purpose in name/description
6. Use pause instead of remove for temporary disable
