---
name: push-notify
description: "Send push notifications to mobile devices via Pushover. Use when: user needs real-time alerts, job completion notifications, or urgent messages. NOT for: bulk messaging, marketing, or non-urgent communications."
metadata: { "openclaw": { "emoji": "📱", "requires": { "env": ["PUSHOVER_TOKEN", "PUSHOVER_USER_KEY"] } } }
---

# Pushover Notification Skill

Send instant push notifications to your mobile devices.

## When to Use

✅ **USE this skill when:**

- Send urgent alerts
- Job completion notifications
- Real-time monitoring alerts
- Critical system notifications

## When NOT to Use

❌ **DON'T use this skill when:**

- Bulk marketing messages → use email/SMS services
- Non-urgent notifications → use email
- Two-way communication → use messaging apps
- Scheduled reminders → use calendar/task apps

## Setup

1. **Get Pushover Account:** https://pushover.net
2. **Get User Key:** Found on your Pushover dashboard
3. **Create Application:** https://pushover.net/apps/build
4. **Get API Token:** From your application

```bash
export PUSHOVER_TOKEN="your_app_token"
export PUSHOVER_USER_KEY="your_user_key"
```

## API Usage

### Basic Notification

```bash
curl -X POST "https://api.pushover.net/1/messages.json" \
  -d "token=YOUR_APP_TOKEN" \
  -d "user=YOUR_USER_KEY" \
  -d "message=Hello World!"
```

### With Title and Priority

```bash
curl -X POST "https://api.pushover.net/1/messages.json" \
  -d "token=YOUR_APP_TOKEN" \
  -d "user=YOUR_USER_KEY" \
  -d "message=Server is down!" \
  -d "title=CRITICAL ALERT" \
  -d "priority=2" \
  -d "retry=60" \
  -d "expire=3600"
```

### With Sound

```bash
curl -X POST "https://api.pushover.net/1/messages.json" \
  -d "token=YOUR_APP_TOKEN" \
  -d "user=YOUR_USER_KEY" \
  -d "message=New email received" \
  -d "sound=siren"
```

### With URL

```bash
curl -X POST "https://api.pushover.net/1/messages.json" \
  -d "token=YOUR_APP_TOKEN" \
  -d "user=YOUR_USER_KEY" \
  -d "message=Build failed" \
  -d "url=https://ci.example.com/build/123" \
  -d "url_title=View Build"
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `token` | Yes | Your application's API token |
| `user` | Yes | Your user key or group key |
| `message` | Yes | The notification message (max 1024 chars) |
| `title` | No | Notification title |
| `priority` | No | -2 (lowest) to 2 (emergency) |
| `sound` | No | Custom sound name |
| `url` | No | Supplementary URL |
| `url_title` | No | Title for URL button |
| `device` | No | Specific device (omit for all) |
| `timestamp` | No | Unix timestamp (for backdating) |

## Priority Levels

| Priority | Behavior |
|----------|----------|
| `-2` | No notification/alert (silent) |
| `-1` | Quiet (no sound/vibration) |
| `0` | Normal (default) |
| `1` | High priority (bypasses quiet hours) |
| `2` | Emergency (repeats every 60s for 30min) |

**Emergency Priority (2)** requires:
- `retry` — How often to repeat (min 30 seconds)
- `expire` — When to stop retrying (max 86400 seconds)

## Sounds

Available sounds: `pushover`, `bike`, `bugle`, `cashregister`, `classical`, `cosmic`, `falling`, `gamelan`, `incoming`, `intermission`, `magic`, `mechanical`, `pianobar`, `siren`, `spacealarm`, `tugboat`, `alien`, `climb`, `persistent`, `echo`, `updown`, `none`

## Node.js Implementation

```javascript
const https = require('https');
const querystring = require('querystring');

async function sendNotification(message, options = {}) {
  const data = {
    token: process.env.PUSHOVER_TOKEN,
    user: process.env.PUSHOVER_USER_KEY,
    message: message,
    ...options
  };

  return new Promise((resolve, reject) => {
    const postData = querystring.stringify(data);
    
    const req = https.request({
      hostname: 'api.pushover.net',
      port: 443,
      path: '/1/messages.json',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const result = JSON.parse(body);
        if (result.status === 1) {
          resolve(result);
        } else {
          reject(new Error(result.errors?.[0] || 'Notification failed'));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Usage examples
await sendNotification('Build completed successfully!');

await sendNotification('Server CPU at 95%!', {
  title: 'CRITICAL ALERT',
  priority: 2,
  retry: 60,
  expire: 3600,
  sound: 'siren'
});

await sendNotification('New PR opened', {
  title: 'GitHub',
  url: 'https://github.com/pr/123',
  url_title: 'View PR',
  priority: 1
});
```

## Group Notifications

Send to multiple users via group:

```bash
# Get group ID from Pushover dashboard (ends with g1)
curl -X POST "https://api.pushover.net/1/messages.json" \
  -d "token=YOUR_APP_TOKEN" \
  -d "user=GROUP_KEY" \
  -d "message=Team update"
```

## Error Responses

```json
{
  "status": 0,
  "errors": ["User key is invalid"]
}
```

Common errors:
- `User key is invalid` — Check PUSHOVER_USER_KEY
- `Application token is invalid` — Check PUSHOVER_TOKEN
- `Message is blank` — Message required
- `Priority is invalid` — Must be -2 to 2
- Invalid device name

## Rate Limits

- 750 messages per user/month (free tier)
- 10,000 messages per app/month (free tier)
- Emergency messages count as 4 normal messages

## Quick Response Templates

**Job Completion:**

```javascript
await sendNotification(`✅ Job ${jobId} completed`, {
  title: 'Agent Complete',
  url: jobUrl,
  url_title: 'View Results'
});
```

**Error Alert:**

```javascript
await sendNotification(`❌ ${errorMessage}`, {
  title: 'Error',
  priority: 1,
  sound: 'siren'
});
```

**Scheduled Task:**

```javascript
await sendNotification(`📅 ${taskName} reminder`, {
  title: 'Reminder',
  priority: 0
});
```

## Validation

```javascript
async function validateCredentials() {
  try {
    await sendNotification('Test notification');
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

## Notes

- Messages limited to 1024 characters
- Emergency priority requires `retry` and `expire`
- User key is different from app token
- Groups require separate setup in Pushover
- Messages expire after delivery (not stored)
