---
name: voice-call
description: Start voice calls via voice-call plugin (Twilio, Telnyx, Plivo, or mock). Use when you need to initiate outbound voice calls from the agent.
---

# Voice Call

Make outbound voice calls via Twilio, Telnyx, Plivo, or mock provider.

## Setup

Configure the voice-call plugin in your config:

```yaml
plugins:
  entries:
    voice-call:
      enabled: true
      config:
        provider: "twilio"  # or "telnyx", "plivo", "mock"
        twilio:
          accountSid: "your-account-sid"
          authToken: "your-auth-token"
          fromNumber: "+15550000000"
```

## CLI Usage

```bash
# Make a call
openclaw voicecall call --to "+15555550123" --message "Hello from the agent"

# Check status
openclaw voicecall status --call-id <call-id>
```

## Tool Actions

Use the `voice_call` tool for agent-initiated calls:

| Action | Description |
|--------|-------------|
| `initiate_call` | Start a new call |
| `continue_call` | Continue with message |
| `speak_to_user` | Speak to user during call |
| `end_call` | End the call |
| `get_status` | Check call status |

## Providers

### Twilio
```yaml
provider: "twilio"
twilio:
  accountSid: "ACxxxx"
  authToken: "xxx"
  fromNumber: "+15550000000"
```

### Telnyx
```yaml
provider: "telnyx"
telnyx:
  apiKey: "your-api-key"
  connectionId: "conn_xxx"
  fromNumber: "+15550000000"
```

### Plivo
```yaml
provider: "plivo"
plivo:
  authId: "your-auth-id"
  authToken: "your-auth-token"
  fromNumber: "+15550000000"
```

### Mock (Development)
```yaml
provider: "mock"
```

## Notes

- Requires voice-call plugin enabled
- Plugin config under `plugins.entries.voice-call.config`
- Use mock provider for development/testing
- Check call status to ensure delivery
