---
name: tts
description: Convert text to speech using Piper TTS or say command. Use when: user wants to hear text read aloud, create audio from text, or add voice output to applications.
---

# Text-to-Speech (TTS) Skill

Convert text to speech using various TTS engines.

## When to Use

✅ **USE this skill when:**

- "Read this text aloud"
- "Convert this to speech"
- "Say something"
- Create audio output for applications
- Accessibility - text to audio conversion

## When NOT to Use

❌ **DON'T use this skill when:**

- Video/podcast production → use dedicated audio tools
- High-quality voiceovers → use ElevenLabs, WellSaid, etc.
- Real-time conversation → use live TTS APIs

## Requirements

- `say` command (macOS) OR
- `espeak` (Linux) OR
- `piper` (Piper TTS - high quality)

## Installation

```bash
# macOS (already installed)
# No installation needed

# Linux - espeak (quick, low quality)
sudo apt-get install espeak

# Linux - Piper TTS (high quality)
# Download from https://github.com/rhasspy/piper/releases
```

## Usage

### Basic Speech

```bash
# Simple text-to-speech
tts-say.sh "Hello, this is a test"

# Save to file (macOS)
tts-say.sh "Hello" --output hello.mp3

# Using espeak (Linux)
tts-espeak.sh "Hello world"
```

### Advanced Options

```bash
# Different voices (macOS)
tts-say.sh "Hello" --voice "Samantha"
tts-say.sh "Hello" --voice "Alex"

# Adjust speed (macOS)
tts-say.sh "Hello" --rate 200

# Using Piper (high quality)
tts-piper.sh "Hello world" --model en_US-lessac-medium
```

## Commands

### tts-say.sh

Use the macOS `say` command or emulate on Linux.

```bash
./tts-say.sh <text> [options]

Options:
  --voice NAME     Select voice (default: system default)
  --rate N         Speaking rate (words per minute)
  --output FILE    Save to audio file instead of playing
```

### tts-espeak.sh

Use espeak for cross-platform TTS.

```bash
./tts-espeak.sh <text> [options]

Options:
  --voice NAME     Select voice variant
  --speed N        Words per minute (default: 170)
  --output FILE    Save to audio file
```

## Available Voices

### macOS (say)

| Voice | Description |
|-------|-------------|
| `Samantha` | Default US female |
| `Alex` | Default US male |
| `Daniel` | British male |
| `Fiona` | Scottish female |
| `Moira` | Irish female |

List all voices: `say -v '?'`

### espeak

| Voice Code | Language |
|------------|----------|
| `en` | English |
| `en-us` | US English |
| `en-sc` | Scottish |
| `en-n` | Northern England |

## Examples

### Simple Hello

```bash
tts-say.sh "Hello, how are you today?"
```

### Save to File

```bash
tts-say.sh "This is my audio message" --output message.mp3
```

### Different Voice

```bash
tts-say.sh "Hello" --voice "Daniel"
```

### Batch Processing

```bash
# Convert multiple lines to audio files
for i in {1..5}; do
    tts-say.sh "Item $i" --output "item_$i.mp3"
done
```

## Notes

- macOS `say` supports MP3 output (macOS 13+)
- espeak is fastest but lowest quality
- Piper offers best quality but requires model download
- For best results in Docker, use espeak as fallback
