---
name: voice-call
description: Initiate voice calls via Twilio, Telnyx, or Plivo APIs. Make outbound calls for alerts, notifications, and communication.
metadata:
  {
    "popebot":
      {
        "emoji": "📞",
        "requires": { "env": ["VOICE_PROVIDER", "VOICE_FROM_NUMBER"] },
        "providers": ["twilio", "telnyx", "plivo", "mock"]
      }
  }
---

# Voice Call

Use the voice-call skill to initiate outbound phone calls via telephony providers. Perfect for urgent alerts, notifications, and direct communication.

## Providers

Supported providers:
- **Twilio** - Most popular, extensive features
- **Telnyx** - Cost-effective, good coverage
- **Plivo** - Simple API, competitive pricing
- **Mock** - Development/testing (no actual calls)

## Requirements

### Environment Variables

Required:
- `VOICE_PROVIDER` - Provider name (`twilio`, `telnyx`, `plivo`, `mock`)
- `VOICE_FROM_NUMBER` - Your outbound caller ID number

Provider-specific:

**Twilio:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`

**Telnyx:**
- `TELNYX_API_KEY`
- `TELNYX_CONNECTION_ID`

**Plivo:**
- `PLIVO_AUTH_ID`
- `PLIVO_AUTH_TOKEN`

## Usage

### Initiate Call

```bash
# Basic call with TTS message
python voice_call.py --to "+15555550123" --message "Hello, this is an automated call from PopeBot."

# Call with custom voice (SSML)
python voice_call.py --to "+15555550123" --ssml "<speak>Hello <break time='1s'/> important message</speak>"

# Call with webhook (for interactive calls)
python voice_call.py --to "+15555550123" --webhook-url "https://your-server.com/call-handler"
```

### Check Call Status

```bash
python voice_call.py --status --call-id "CA1234567890"
```

### End Call

```bash
python voice_call.py --hangup --call-id "CA1234567890"
```

## Features

### Text-to-Speech

- Automatic TTS for text messages
- Multiple voice options (varies by provider)
- SSML support for advanced control

### Interactive Calls

- Webhook integration for IVR
- DTMF keypad input handling
- Call recording (provider-dependent)

### Call Analytics

- Status tracking (queued, ringing, in-progress, completed, failed)
- Duration tracking
- Cost tracking

## When to Use

Use this skill when:
- User needs to make urgent phone calls
- Sending voice alerts for critical events
- Implementing phone-based notifications
- Creating interactive voice response systems

## Examples

### Emergency Alert

```python
# Urgent security alert
python voice_call.py \
  --to "+15555550123" \
  --message "Security alert: Unusual activity detected on your account. Please check immediately." \
  --priority "urgent"
```

### Appointment Reminder

```python
# Appointment reminder with SSML
python voice_call.py \
  --to "+15555550123" \
  --ssml "<speak>Hello! This is a reminder about your appointment <break time='500ms'/> tomorrow at 3 PM.</speak>"
```

### Two-Factor Authentication

```python
# Call with verification code
python voice_call.py \
  --to "+15555550123" \
  --message "Your verification code is 8-4-7-2. Repeat: 8-4-7-2."
```

## Limitations

- Requires valid API credentials
- International calling may have restrictions
- Costs vary by provider and destination
- Mock provider for testing only (no real calls)

## Security Notes

- Never expose API credentials in logs
- Validate phone numbers before calling
- Respect Do Not Call (DNC) regulations
- Implement rate limiting to prevent abuse
