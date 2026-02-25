---
name: songsee
description: Generate spectrograms and feature-panel visualizations from audio with the songsee CLI.
homepage: https://github.com/steipete/songsee
metadata:
  {
    "openclaw":
      {
        "emoji": "🌊",
        "requires": { "bins": ["songsee"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "steipete/tap/songsee",
              "bins": ["songsee"],
              "label": "Install songsee (brew)",
            },
          ],
      },
  }
---

# songsee

Generate spectrograms + feature panels from audio.

## Quick start

```bash
# Basic spectrogram
songsee track.mp3

# Multi-panel visualization
songsee track.mp3 --viz spectrogram,mel,chroma,hpss,selfsim,loudness,tempogram,mfcc,flux

# Time slice (extract a portion)
songsee track.mp3 --start 12.5 --duration 8 -o slice.jpg

# Read from stdin
cat track.mp3 | songsee - --format png -o out.png
```

## Common flags

- `--viz` — Visualization types (repeatable or comma-separated)
  - `spectrogram` — Standard spectrogram
  - `mel` — Mel spectrogram
  - `chroma` — Chromagram
  - `hpss` — Harmonic-percussive source separation
  - `selfsim` — Self-similarity matrix
  - `loudness` — Loudness curve
  - `tempogram` — Tempogram
  - `mfcc` — MFCC features
  - `flux` — Spectral flux
- `--style` — Color palette (classic, magma, inferno, viridis, gray)
- `--width` / `--height` — Output dimensions
- `--window` / `--hop` — FFT settings
- `--min-freq` / `--max-freq` — Frequency range (Hz)
- `--start` / `--duration` — Time slice
- `--format` — Output format (jpg, png)

## Notes

- WAV/MP3 decoding is native; other formats require ffmpeg
- Multiple `--viz` flags render a grid layout
