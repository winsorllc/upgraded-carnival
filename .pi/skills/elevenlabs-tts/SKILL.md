---
name: elevenlabs-tts
description: Convert text to speech using ElevenLabs API. Use when you need to generate voice audio for messages, narrations, or accessibility.
---

# ElevenLabs Text-to-Speech

Generate high-quality speech from text using ElevenLabs API.

## Quick Start

```bash
/job/.pi/skills/elevenlabs-tts/elevenlabs-tts.js "Hello there" /tmp/output.mp3
```

## Usage

### Basic TTS
```bash
/job/.pi/skills/elevenlabs-tts/elevenlabs-tts.js "<text>" <output_file>
```

### With Voice Selection
```bash
job/.pi/skills/elevenlabs-tts/elevenlabs-tts.js "<text>" <output_file> <voice_id>
```

### List Available Voices
```bash
/job/.pi/skills/elevenlabs-tts/elevenlabs-tts.js --list-voices
```

## Configuration

Requires environment variable:
- `ELEVENLABS_API_KEY` - ElevenLabs API key

## Available Voices

Default voices (get IDs with --list-voices):
- `rachel` - Calm, professional female
- `drew` - Conversational male
- `clive` - Authoritative male
- `bella` - Soft female
- `antoni` - Versatile male
- `charlie` - Energetic male

## SSML Support

Use SSML for advanced control:
```xml
<speak>
  <break time="1s"/>
  Hello there!
  <break time="500ms"/>
  How can I help you?
</speak>
```

## Output Format

Creates MP3 file at specified path. Returns path on success.

## Examples

```bash
# Generate speech with default voice
/job/.pi/skills/elevenlabs-tts/elevenlabs-tts.js "Welcome to our service" /tmp/welcome.mp3

# Generate with specific voice
/job/.pi/skills/elevenlabs-tts/elevenlabs-tts.js "This is important" /tmp/alert.mp3 EXAVITQu4vr4xnSDxMaL

# List all available voices
/job/.pi/skills/elevenlabs-tts/elevenlabs-tts.js --list-voices
```

## Tips

- Keep text under 5000 characters per request
- Use breaks and pauses for natural speech
- Preview with short clips before generating long audio
- For emotional delivery, use voice-specific prompts in the text

## When to Use

- User requests voice message or audio narration
- Creating accessibility audio content
- Generating voice responses for chatbots
- Text-to-speech for notifications
