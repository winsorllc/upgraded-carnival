---
name: sherpa-onnx-tts
description: Local text-to-speech via sherpa-onnx (offline, no cloud). Use when: you need to generate speech audio without using cloud APIs, for offline TTS generation, or when you want fast local voice synthesis.
metadata:
  {
    "os": ["darwin", "linux", "win32"],
    "requires": { "env": ["SHERPA_ONNX_RUNTIME_DIR", "SHERPA_ONNX_MODEL_DIR"] }
  }
---

# sherpa-onnx-tts

Local TTS using the sherpa-onnx offline CLI. Generate speech without cloud APIs.

## Setup

### 1. Download Runtime

**macOS:**
```bash
curl -L -o sherpa-onnx.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.23/sherpa-onnx-v1.12.23-osx-universal2-shared.tar.bz2
tar xjf sherpa-onnx.tar.bz2
export SHERPA_ONNX_RUNTIME_DIR=$(pwd)/sherpa-onnx-v1.12.23-osx-universal2-shared
```

**Linux x64:**
```bash
curl -L -o sherpa-onnx.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.23/sherpa-onnx-v1.12.23-linux-x64-shared.tar.bz2
tar xjf sherpa-onnx.tar.bz2
export SHERPA_ONNX_RUNTIME_DIR=$(pwd)/sherpa-onnx-v1.12.23-linux-x64-shared
```

### 2. Download Voice Model

```bash
curl -L -o models.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-lessac-high.tar.bz2
tar xjf models.tar.bz2
export SHERPA_ONNX_MODEL_DIR=$(pwd)/vits-piper-en_US-lessac-high
```

### 3. Set Environment Variables

```bash
export SHERPA_ONNX_RUNTIME_DIR=/path/to/runtime
export SHERPA_ONNX_MODEL_DIR=/path/to/models/vits-piper-en_US-lessac-high
```

## Usage

### Generate Speech

```bash
{baseDir}/sherpa-onnx-tts.js -o output.wav "Hello, this is local text to speech."
```

### With Custom Voice Settings

```bash
{baseDir}/sherpa-onnx-tts.js --text "Hello!" --output speech.wav --speed 1.0 --pitch 0
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output` | Output WAV file | stdout |
| `-t, --text` | Text to speak | Required |
| `--speed` | Speech speed (0.5-2.0) | 1.0 |
| `--pitch` | Pitch adjustment (-10 to 10) | 0 |

## Models

Choose different voices from [sherpa-onnx releases](https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models):

- `vits-piper-en_US-lessac-high` - English (high quality)
- `vits-piper-en_US-lessac-medium` - English (medium quality)
- Multi-language models available

## Notes

- Requires no internet connection after downloading runtime and model
- Very fast inference compared to cloud APIs
- Supports various languages depending on model
- Output is WAV format by default
