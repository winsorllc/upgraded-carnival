---
name: summarize
description: Summarize or extract text from URLs, YouTube videos, and local files. Use when: user asks to summarize content, extract text from a link, or get a transcript from YouTube.
---

# Summarize Skill

Fast CLI tool to summarize URLs, local files, and YouTube links.

## When to Use

✅ **USE this skill when:**

- "Summarize this article"
- "What's this link about?"
- "Extract text from this PDF"
- "Get a transcript from this YouTube video"
- "What does this webpage say?"

## When NOT to Use

❌ **DON'T use this skill when:**

- Simple factual queries → search directly
- Code review tasks → use coding skills
- Very short content → just read it yourself

## Installation

```bash
# Install via npm (requires Node.js)
npm install -g summarize-sh

# Or use npx
npx summarize-sh
```

## Usage

### Summarize a URL

```bash
summarize "https://example.com/article"
```

### Summarize a YouTube Video

```bash
summarize "https://youtu.be/dQw4w9WgXcQ"
summarize "https://youtube.com/watch?v=XYZ" --youtube auto
```

### Extract transcript only (YouTube)

```bash
summarize "https://youtu.be/dQw4w9WgXcQ" --extract-only
```

### Local file (PDF, text, etc.)

```bash
summarize "/path/to/document.pdf"
summarize "/path/to/file.txt"
```

### Control Summary Length

```bash
summarize "https://example.com" --length short
summarize "https://example.com" --length medium
summarize "https://example.com" --length long
```

## Configuration

Set API key for the LLM provider:

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GEMINI_API_KEY="AI..."
```

Default model is `google/gemini-3-flash-preview`.

## Environment Variables

| Variable | Provider |
|----------|----------|
| `OPENAI_API_KEY` | OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic |
| `GEMINI_API_KEY` | Google |
| `FIRECRAWL_API_KEY` | Firecrawl (for blocked sites) |
| `APIFY_API_TOKEN` | YouTube fallback |

## Options

- `--length short|medium|long|xl|xxl|<chars>` - Summary length
- `--extract-only` - Extract content without summarizing
- `--json` - Machine-readable JSON output
- `--model <provider/model>` - Specify LLM model
- `--youtube auto|off|always` - YouTube extraction mode
