---
name: stt
description: Convert speech/audio to text using Whisper. Use when: user wants to transcribe audio files, convert voice recordings to text, or get transcripts from spoken audio.
---

# Speech-to-Text (STT) Skill

Convert audio/speech to text using Whisper.

## When to Use

✅ **USE this skill when:**

- "Transcribe this audio"
- "Convert speech to text"
- "Get transcript from this recording"
- "Transcribe meeting recording"

## When NOT to Use

❌ **DON'T use this skill when:**

- Real-time transcription → use streaming APIs
- Video transcription → use video-specific tools
- Very short clips → type it yourself
- Non-English audio → ensure Whisper model supports language

## Requirements

- `whisper.cpp` CLI OR
- `whisper` (Python) OR  
- `yt-dlp` (for YouTube transcription)

## Installation

```bash
# Install whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make
sudo cp main /usr/local/bin/whisper-cpp

# Download a model
bash ./models/download-ggml-model.sh base

# Or use Python whisper
pip install openai-whisper
```

## Usage

### Basic Transcription

```bash
# Transcribe an audio file
stt-transcribe.sh audio.mp3

# Specify language
stt-transcribe.sh audio.mp3 --language English

# Use different model size
stt-transcribe.sh audio.mp3 --model medium
```

### Options

```bash
--model SIZE     Model size: tiny, base, small, medium, large (default: base)
--language LANG  Language code (en, es, fr, de, etc.)
--output FORMAT  Output format: txt, json, srt, vtt (default: txt)
```

## Commands

### stt-transcribe.sh

Transcribe audio files to text.

```bash
./stt-transcribe.sh <audio_file> [options]

Options:
  --model SIZE      Model: tiny, base, small, medium, large
  --language LANG   Language code (en, es, fr, etc.)
  --output FORMAT   Output: txt, json, srt, vtt
```

### stt-youtube.sh

Transcribe YouTube videos.

```bash
./stt-youtube.sh <youtube_url> [options]

Options:
  --language LANG   Language code
  --output FORMAT   Output: txt, json, srt, vtt
```

## Model Sizes

| Model | Parameters | English | Other Languages |
|-------|------------|---------|------------------|
| tiny | 39M | ✅ | ✅ |
| base | 74M | ✅ | ✅ |
| small | 244M | ✅ | ✅ |
| medium | 769M | ✅ | ✅ |
| large | 1550M | ✅ | ✅ |

## Examples

### Simple Transcription

```bash
stt-transcribe.sh meeting.mp3
```

### With Language

```bash
stt-transcribe.sh french_audio.mp3 --language fr
```

### YouTube Video

```bash
stt-youtube.sh "https://youtu.be/dQw4w9WgXcQ"
```

### Save as SRT (subtitles)

```bash
stt-transcribe.sh audio.mp3 --output srt > subtitles.srt
```

## Notes

- Larger models = better accuracy but slower
- Base model is good balance for most cases
- First run downloads model (~75MB for base)
- Works best with clear audio, single speaker
- For best results: use small or larger model
