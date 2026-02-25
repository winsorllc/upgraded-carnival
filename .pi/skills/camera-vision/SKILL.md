---
name: camera-vision
description: Camera capture with vision model analysis. Captures images and describes or analyzes them using vision-capable LLMs.
---

# Camera Vision

Camera capture tool with vision model integration. Inspired by ZeroClaw's Look tool.

## Capabilities

- Capture images from camera devices
- Vision model analysis (Ollama, GPT-4 Vision, etc.)
- Object detection and description
- Scene understanding
- Text extraction (OCR)

## Usage

```bash
# Capture and analyze an image
/job/.pi/skills/camera-vision/capture.js --describe "What do you see?"

# Capture to file only
/job/.pi/skills/camera-vision/capture.js --output /path/to/image.jpg

# Analyze existing image
/job/.pi/skills/camera-vision/analyze.js /path/to/image.jpg --prompt "Find all objects"

# OCR / text extraction
/job/.pi/skills/camera-vision/ocr.js /path/to/image.jpg
```

## Configuration

Environment variables:
- `VISION_MODEL` - Model to use (ollama/llava, gpt-4-vision, etc.)
- `OLLAMA_URL` - Ollama API endpoint
- `OPENAI_API_KEY` - For GPT-4 Vision

## When to Use

- When visual analysis is needed
- Screen capture and interpretation
- Object recognition tasks
- Visual QA tasks

## Inspired By

- ZeroClaw Look tool (ffmpeg + Ollama vision)
