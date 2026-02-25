---
name: local-tts
description: "Local text-to-speech using espeak-ng for headless Linux environments. Use when: (1) job completes and you want to announce results with voice, (2) user asks for voice output in a container/Docker environment, (3) you need reliable TTS without cloud APIs or macOS-specific tools."
---

# Local TTS Skill

Text-to-speech using espeak-ng for reliable headless Linux environments. Provides pitch modulation, speed control, and multiple voice options.

## Setup

No additional setup required if espeak-ng is available. Check availability:

```bash
which espeak-ng || which espeak
```

Install if needed:
- Debian/Ubuntu: `sudo apt install espeak-ng`
- Alpine: `apk add espeak-ng`
- macOS: `brew install espeak-ng`

## Usage

### Basic speech

```bash
{baseDir}/scripts/speak.sh "Hello, the job has completed successfully!"
```

### Adjust pitch (0-100, default 50)

```bash
{baseDir}/scripts/speak.sh "Hello" --pitch 75
```

### Adjust speed (words per minute, default 175)

```bash
{baseDir}/scripts/speak.sh "Hello" --speed 150
```

### Use a different voice

```bash
# List available voices
{baseDir}/scripts/list-voices.sh

# Use a specific voice
{baseDir}/scripts/speak.sh "Hello" --voice "en-us"
```

### Save to audio file

```bash
{baseDir}/scripts/speak.sh "Hello" --output "/tmp/speech.wav"
```

### Combine options

```bash
{baseDir}/scripts/speak.sh "Job complete!" --pitch 65 --speed 200 --output "/tmp/job-done.wav"
```

## Voice Options

### Common voices

| Voice | Description |
|-------|-------------|
| `en` | English (default) |
| `en-us` | US English |
| `en-gb` | British English |
| `en-sc` | Scottish English |
| `en-au` | Australian English |
| `en-rc` | Caribbean English |
| `es` | Spanish |
| `fr` | French |
| `de` | German |
| `it` | Italian |
| `nl` | Dutch |
| `pl` | Polish |
| `ru` | Russian |
| `zh` | Chinese |
| `ja` | Japanese |
| `ko` | Korean |

### Pitch adjustment

| Pitch | Effect |
|-------|--------|
| 0-30 | Very low, deep |
| 40-50 | Normal |
| 60-80 | Higher, more energetic |
| 90-100 | Very high |

### Speed adjustment

| Speed | Effect |
|-------|--------|
| 80-120 | Slow, deliberate |
| 140-175 | Normal conversation |
| 200-260 | Fast, rapid |

## Trigger Patterns

Use this skill when:
- User asks for "voice", "speak", "say", "text to speech", "TTS"
- Job completes and you want audio announcement
- Creating accessible output for visually impaired users
- Need reliable TTS in Docker/headless environments (not macOS)
- Want to avoid cloud API dependencies

## Examples

### Announce job completion

```bash
{baseDir}/scripts/speak.sh "Job complete! Processed 50 files, found 3 issues."
```

### Success/failure notification

```bash
# Success - higher pitch, faster
{baseDir}/scripts/speak.sh "Build successful!" --pitch 70 --speed 200

# Failure - lower pitch
{baseDir}/scripts/speak.sh "Build failed with errors." --pitch 40
```

### Read a summary

```bash
{baseDir}/scripts/speak.sh "Summary: Four files were modified, two tests added."
```

### Save speech for later

```bash
{baseDir}/scripts/speak.sh "Reminder: Review pull request" --output "/tmp/reminder.wav"
```

## Notes

- Works in Linux containers and headless environments
- Uses espeak-ng (enhanced espeak) for better quality
- Synchronous by default - blocks until speech completes
- For non-blocking, append `&` to run in background
- Audio file output (WAV) is more portable than playing directly
