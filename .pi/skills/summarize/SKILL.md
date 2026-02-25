---
name: summarize
description: Summarize or extract text/transcripts from URLs, podcasts, and local files. Use as fallback for "transcribe this YouTube/video" tasks.
---

# Summarize

Fast CLI to summarize URLs, local files, and YouTube links.

## When to Use (trigger phrases)

Use this skill when the user asks any of:

- "use summarize"
- "what's this link/video about?"
- "summarize this URL/article"
- "transcribe this YouTube/video" (best-effort transcript extraction)

## Quick Start

```bash
summarize "https://example.com" --model google/gemini-3-flash-preview
summarize "/path/to/file.pdf" --model google/gemini-3-flash-preview
summarize "https://youtu.be/dQw4w9WgXcQ" --youtube auto
```

## YouTube: Summary vs Transcript

Best-effort transcript (URLs only):

```bash
summarize "https://youtu.be/dQw4w9WgXcQ" --youtube auto --extract-only
```

If the user asked for a transcript but it's huge, return a tight summary first, then ask which section/time range to expand.

## Model + Keys

Set the API key for your chosen provider:

- OpenAI: `OPENAI_API_KEY`
- Anthropic: `ANTHROPIC_API_KEY`
- xAI: `XAI_API_KEY`
- Google: `GEMINI_API_KEY` (aliases: `GOOGLE_GENERATIVE_AI_API_KEY`, `GOOGLE_API_KEY`)

Default model is `google/gemini-3-flash-preview` if none is set.

## Useful Flags

- `--length short|medium|long|xl|xxl|<chars>` - Output length
- `--max-output-tokens <count>` - Token limit
- `--extract-only` - Extract without summarizing (URLs only)
- `--json` - Machine readable output
- `--firecrawl auto|off|always` - Fallback extraction for blocked sites
- `--youtube auto` - Apify fallback if `APIFY_API_TOKEN` set

## Config

Optional config file: `~/.summarize/config.json`

```json
{ "model": "openai/gpt-4o" }
```

Optional services:

- `FIRECRAWL_API_KEY` for blocked sites
- `APIFY_API_TOKEN` for YouTube fallback
