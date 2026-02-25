---
name: gemini
description: Use Google's Gemini AI models via CLI. Generate text, images, analyze content with Gemini 2.0 and other models.
metadata:
  {
    "openclaw": {
      "emoji": "🌟",
      "requires": { "env": ["GEMINI_API_KEY"] }
    }
  }
---

# Gemini CLI

Access Google Gemini AI from the command line.

## Configuration

```bash
export GEMINI_API_KEY="your-api-key"
```

Get API key from: https://aistudio.google.com/app/apikey

## Usage

Quick chat:

```bash
gemini "Hello, how are you?"
gemini "Explain quantum computing"
```

With context:

```bash
gemini --file code.js "What does this do?"
gemini --context "You are a senior developer" "Review this code"
```

Vision (multimodal):

```bash
gemini --image photo.jpg "What's in this image?"
```

Generate text:

```bash
gemini --model gemini-pro "Write a Python function"
gemini --model gemini-pro-vision "Analyze this diagram"
```

Streaming:

```bash
gemini --stream "Tell me a story"
```

## Models

- `gemini-pro`: Text generation
- `gemini-pro-vision`: Images + text
- `gemini-ultra`: Most capable
- `gemini-2.0-flash-exp`: Experimental