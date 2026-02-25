---
name: summarize
description: Summarize URLs, articles, podcasts, YouTube videos, and documents. Extract transcripts and generate concise summaries.
homepage: https://summarize.sh
metadata:
  {
    "popebot":
      {
        "emoji": "🧾",
        "requires": { "bins": ["uv"] },
        "env": ["GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"]
      }
  }
---

# Summarize

Fast summarization for URLs, articles, podcasts, YouTube videos, and local files. Use this skill to quickly extract key information from long-form content.

## When to Use

Use this skill when the user:
- Shares a link and asks "what's this about?"
- Requests a summary of an article or video
- Wants to transcribe YouTube/podcast content
- Needs to extract key points from a document
- Says "summarize this" with any URL or file

## Quick Start

```bash
# Summarize a URL
python summarize.py --url "https://example.com/article"

# Summarize YouTube video
python summarize.py --youtube "https://youtu.be/dQw4w9WgXcQ"

# Summarize local file
python summarize.py --file "/path/to/document.pdf"

# Get transcript only
python summarize.py --youtube "URL" --transcript-only
```

## Supported Sources

### URLs & Articles
- News sites, blogs, documentation
- Automatic content extraction
- Firecrawl fallback for blocked sites

### YouTube Videos
- Auto transcript extraction
- Fallback to speech-to-text if needed
- Chapter-aware summaries

### Podcasts
- Audio file transcription
- Speaker diarization (when available)
- Timestamp-aware summaries

### Local Files
- PDF, DOCX, TXT, MD
- Markdown and HTML
- Images with text (OCR)

## Configuration

### API Keys

Choose your preferred LLM provider:

**Google (default):**
- `GEMINI_API_KEY`
- Model: `gemini-2.0-flash` (fast, cheap)

**OpenAI:**
- `OPENAI_API_KEY`
- Model: `gpt-4o-mini` or `gpt-4-turbo`

**Anthropic:**
- `ANTHROPIC_API_KEY`
- Model: `claude-3-haiku` or `claude-3-sonnet`

### Optional Services

**Firecrawl** (for blocked sites):
- `FIRECRAWL_API_KEY`

**Apify** (YouTube fallback):
- `APIFY_API_TOKEN`

## Summary Lengths

- `short` - 1-2 sentences, key point only
- `medium` - 3-5 sentences, main ideas
- `long` - Full paragraph summary
- `xl` - Detailed with supporting points
- `xxl` - Comprehensive with quotes

## Examples

### Quick Article Summary

```bash
python summarize.py \
  --url "https://techcrunch.com/article" \
  --length medium
```

### YouTube with Timestamps

```bash
python summarize.py \
  --youtube "https://youtube.com/watch?v=abc123" \
  --with-timestamps \
  --length long
```

### Podcast Transcription

```bash
python summarize.py \
  --file "podcast-episode.mp3" \
  --transcript-only \
  --output transcript.txt
```

### PDF Analysis

```bash
python summarize.py \
  --file "whitepaper.pdf" \
  --length xl \
  --extract-key-points
```

## Output Formats

**Default:** Plain text summary

**JSON:**
```bash
python summarize.py --url "URL" --json
```

**Markdown:**
```bash
python summarize.py --url "URL" --format markdown
```

## Tips

- Start with short summary, expand if needed
- Use `--transcript-only` for full transcripts
- YouTube videos: auto-extracts transcript if available
- Large files: summarizes in chunks then combines
- Ask for timestamps if user wants to jump to specific sections
