---
name: sag
description: ElevenLabs text-to-speech with mac-style say UX.
homepage: https://sag.sh
metadata:
  {
    "openclaw":
      {
        "emoji": "🗣️",
        "requires": { "bins": ["sag"], "env": ["ELEVENLABS_API_KEY"] },
        "primaryEnv": "ELEVENLABS_API_KEY",
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "steipete/tap/sag",
              "bins": ["sag"],
              "label": "Install sag (brew)",
            },
          ],
      },
  }
---

# sag

Use `sag` for ElevenLabs TTS with local playback.

## API Key (required)

Set one of these environment variables:
- `ELEVENLABS_API_KEY` (preferred)
- `SAG_API_KEY` (also supported)

## Quick start

```bash
# Basic TTS
sag "Hello there"

# Use specific voice
sag speak -v "Roger" "Hello"

# List available voices
sag voices

# Get prompting tips
sag prompting
```

## Models

| Model | Description |
|-------|-------------|
| `eleven_v3` | Default, expressive |
| `eleven_multilingual_v2` | Stable, multilingual |
| `eleven_flash_v2_5` | Fast, low latency |

## Pronunciation & Delivery

### First fix for mispronunciations:
- Respelling (e.g., "key-note")
- Add hyphens
- Adjust casing

### Numbers, units, URLs:
```bash
sag --normalize auto "..."
# or
sag --normalize off "..."
```

### Language bias:
```bash
sag --lang en|de|fr "..."
```

### v3 audio tags (at start of line):
- `[whispers]`, `[shouts]`, `[sings]`
- `[laughs]`, `[starts laughing]`, `[sighs]`, `[exhales]`
- `[sarcastic]`, `[curious]`, `[excited]`, `[crying]`, `[mischievously]`

Example:
```bash
sag "[whispers] keep this quiet. [short pause] ok?"
```

### v2 SSML:
```xml
<break time="1.5s" />
```

## Voice Defaults

Set via environment:
- `ELEVENLABS_VOICE_ID`
- `SAG_VOICE_ID`

## Chat Voice Responses

When user asks for a "voice" reply (e.g., "crazy scientist voice", "explain in voice"):

```bash
# Generate audio file
sag -v Clawd -o /tmp/voice-reply.mp3 "Your message here"

# Then include in reply:
# MEDIA:/tmp/voice-reply.mp3
```

### Voice character tips:

- **Crazy scientist**: Use `[excited]` tags, dramatic pauses `[short pause]`, vary intensity
- **Calm**: Use `[whispers]` or slower pacing
- **Dramatic**: Use `[sings]` or `[shouts]` sparingly

Default voice: `lj2rvANS3gaWWnczSX` (or use `-v Clawd`)

## Notes

- Confirm voice + speaker before long output
- v3 doesn't support SSML `<break>`, use `[pause]` instead
