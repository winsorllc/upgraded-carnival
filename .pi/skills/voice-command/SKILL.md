---
name: voice-command
description: Speech-to-text command processor using Whisper. Records audio and transcribes spoken commands for voice-controlled automation.
---

# Voice Command

Speech-to-text command processor that records audio and transcribes spoken commands using OpenAI Whisper or local Whisper.cpp. Inspired by ZeroClaw's Listen tool.

## Capabilities

- Record audio from microphone
- Transcribe speech to text using Whisper
- Command pattern matching
- Voice-activated automation triggers
- Support for multiple languages

## Usage

```bash
# Record and transcribe (default 5 seconds)
/job/.pi/skills/voice-command/voice-record.js --duration 5

# Transcribe existing audio file
/job/.pi/skills/voice-command/voice-transcribe.js /path/to/audio.wav

# Process voice commands with pattern matching
/job/.pi/skills/voice-command/voice-process.js --patterns "patterns.json"

# Start voice command listener (continuous)
/job/.pi/skills/voice-command/voice-listen.js --trigger-word "hey agent"
```

## Output Format

```json
{
  "transcription": "hello computer please open the file",
  "confidence": 0.95,
  "language": "en",
  "duration": 3.2,
  "commands": [
    {"action": "open", "target": "file"}
  ]
}
```

## When to Use

- When users want voice-controlled automation
- For accessibility features
- Hands-free operation scenarios
- Voice note transcription

## Requirements

- OpenAI API key (for cloud transcription) or whisper.cpp binary (for local)
- Microphone access (arecord/ffmpeg on Linux)
- Node.js 18+

## Inspired By

- ZeroClaw Listen tool (whisper.cpp + arecord)
