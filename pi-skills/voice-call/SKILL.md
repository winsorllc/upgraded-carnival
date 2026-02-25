---
name: voice-call
description: Initiate and manage voice calls via Twilio, Telnyx, Plivo, or mock providers. Use when you need to make outbound voice calls, check call status, or manage call workflows.
metadata:
  {
    "requires": { "config": ["voice_call_enabled"] }
  }
---

# Voice Call

Use this skill to initiate voice calls through various providers (Twilio, Telnyx, Plivo, or mock for testing).

## Trigger

Use this skill when:
- User asks to make a voice call
- User wants to initiate a phone call from the agent
- Need to check status of an ongoing call
- Need to continue or end an active call

## Configuration

Voice calls require configuration in your environment or config file:

### Twilio
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15555550000
VOICE_PROVIDER=twilio
```

### Telnyx
```bash
TELNYX_API_KEY=your_api_key
TELNYX_CONNECTION_ID=your_connection_id
TELNYX_PHONE_NUMBER=+15555550000
VOICE_PROVIDER=telnyx
```

### Plivo
```bash
PLIVO_AUTH_ID=your_auth_id
PLIVO_AUTH_TOKEN=your_auth_token
PLIVO_PHONE_NUMBER=+15555550000
VOICE_PROVIDER=plivo
```

### Mock (for testing)
```bash
VOICE_PROVIDER=mock
```

## Usage

### Initiate a call

```bash
# Basic call with message
voice-call initiate --to "+15555550123" --message "Hello from PopeBot"

# Or use the helper script
./scripts/voice-call.sh call "+15555550123" "Your message here"
```

### Check call status

```bash
voice-call status --call-id <call_id>
./scripts/voice-call.sh status <call_id>
```

### Continue a call (send more speech)

```bash
voice-call continue --call-id <call_id> --message "Additional message"
```

### End a call

```bash
voice-call end --call-id <call_id>
```

## Available Actions

| Action | Description |
|--------|-------------|
| `initiate_call` | Start a new outbound call |
| `continue_call` | Send additional speech to ongoing call |
| `speak_to_user` | Speak text to the user on the call |
| `end_call` | Terminate an active call |
| `get_status` | Check the current status of a call |

## Notes

- Calls are asynchronous - you get a call ID immediately
- Check status periodically for call completion
- Mock provider is useful for testing without incurring costs
- Supported providers: Twilio, Telnyx, Plivo
