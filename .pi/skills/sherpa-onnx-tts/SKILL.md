---
name: sherpa-onnx-tts
description: Local text-to-speech via sherpa-onnx (offline, no cloud). Use when you need to generate speech without cloud APIs, for privacy or offline scenarios.
---

# sherpa-onnx-tts

Local offline text-to-speech using sherpa-onnx.

## Setup

Download runtime and models:

```bash
# Download runtime (macOS)
curl -L -o sherpa-onnx.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.23/sherpa-onnx-v1.12.23-osx-universal2-shared.tar.bz2
tar xjf sherpa-onnx.tar.bz2

# Download a voice model (e.g., English - lessac)
curl -L -o model.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-lessac-high.tar.bz2
tar xjf model.tar.bz2

# Set environment
export SHERPA_ONNX_RUNTIME_DIR=/path/to/sherpa-onnx
export SHERPA_ONNX_MODEL_DIR=/path/to/models
```

## Usage

```bash
# Generate speech
sherpa-onnx-offline-tts \
  --model=/path/to/model.onnx \
  --output=speech.wav \
  "Hello, this is a test of offline text to speech."

# With speaker ID (for multi-speaker models)
sherpa-onnx-offline-tts \
  --model=/path/to/model.onnx \
  --speaker-id=0 \
  --output=speech.wav \
  "Hello world"
```

## Options

| Flag | Description |
|------|-------------|
| `--model` | Path to ONNX model |
| `--output` | Output WAV file |
| `--speaker-id` | Speaker ID for multi-speaker |
| `--noise-scale` | Noise scale (0-1) |
| `--length-scale` | Length scale (0.5-2) |

## Available Models

- `vits-piper-en_US-lessac-high` - English (lessac, high quality)
- `vits-piper-en_US-lessac-medium` - English (lessac, medium)
- `vits-piper-es_ES-sharper` - Spanish
- `vits-piper-de_DE_thorsten-high` - German

## Benefits

- Completely offline - no cloud needed
- Privacy-friendly
- Low latency
- Multiple languages available
- Runs locally on CPU

## Notes

- Requires downloaded runtime and models
- Quality varies by model
- Check model licenses before use
