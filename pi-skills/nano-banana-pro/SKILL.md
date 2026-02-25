---
name: nano-banana-pro
description: Generate or edit images via Gemini 3 Pro Image (Nano Banana Pro). Uses Google's Gemini API to create or edit images with text prompts.
metadata:
  {
    "openclaw": {
      "emoji": "🍌",
      "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"] },
      "primaryEnv": "GEMINI_API_KEY"
    }
  }
---

# Nano Banana Pro (Gemini 3 Pro Image)

Generate or edit images using Google's Gemini 3 Pro Image model.

## Capabilities

- **Generate** images from text descriptions
- **Edit** existing images with natural language instructions
- **Compose** multiple images (up to 14) into a single scene
- Support for various resolutions: 1K, 2K, 4K

## Usage

Generate an image:

```bash
uv run /job/pi-skills/nano-banana-pro/scripts/generate_image.py --prompt "a cat sitting on a moon" --filename "cat-moon.png" --resolution 1K
```

Edit an existing image:

```bash
uv run /job/pi-skills/nano-banana-pro/scripts/generate_image.py --prompt "add a hat to the cat" --filename "cat-with-hat.png" -i "/path/to/input.png" --resolution 2K
```

Compose multiple images:

```bash
uv run /job/pi-skills/nano-banana-pro/scripts/generate_image.py --prompt "combine these into one scene" --filename "output.png" -i img1.png -i img2.png -i img3.png
```

## Environment

- `GEMINI_API_KEY`: Required Google AI API key
- Can also be set in `~/.thepopebot/secrets.json` as `gemini_api_key`

## Notes

- Use timestamps in filenames: `$(date +%Y-%m-%d-%H-%M-%S)-name.png`
- The script prints a `MEDIA:` line for auto-attachment to messages
- Resolution options: 1K (default), 2K, 4K
