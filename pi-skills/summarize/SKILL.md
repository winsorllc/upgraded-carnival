---
name: summarize
description: "Summarize or extract text/transcripts from URLs, YouTube videos, PDFs, and local files using LLM-powered summarization. Use when: (1) user wants to summarize a URL or article, (2) user asks about a YouTube video, (3) user wants to transcribe audio/video content, (4) user shares a PDF and wants key takeaways."
---

# Summarize

LLM-powered CLI tool for summarizing URLs, YouTube videos, PDFs, and local files with support for multiple LLM providers.

## When to Use

Use this skill immediately when the user asks any of:

- "summarize this"
- "what's this about?"
- "summarize this URL/article"
- "summarize this PDF"
- "transcribe this YouTube/video"
- "what does this file say?"
- "give me the key points from [URL]"

## Setup

No additional installation required. Uses built-in LLM configuration from the agent environment.

If YouTube transcript extraction is needed, ensure `yt-dlp` is available:
```bash
# Install yt-dlp for YouTube support
pip install yt-dlp
```

## Usage

### Summarize a URL

```bash
node /job/pi-skills/summarize/summarize.js "https://example.com/article"
```

### Summarize a YouTube video

```bash
node /job/pi-skills/summarize/summarize.js "https://youtu.be/dQw4w9WgXcQ"
node /job/pi-skills/summarize/summarize.js "https://youtube.com/watch?v=..."
```

### Summarize a local file (PDF, TXT, MD)

```bash
node /job/pi-skills/summarize/summarize.js "/path/to/document.pdf"
node /job/pi-skills/summarize/summarize.js "/path/to/notes.txt"
```

### Summarize with custom length

```bash
node /job/pi-skills/summarize/summarize.js --length short "https://example.com"
node /job/pi-skills/summarize/summarize.js --length long "https://example.com"
```

### Extract only (no summarization)

```bash
node /job/pi-skills/summarize/summarize.js --extract-only "https://youtu.be/..."
```

### JSON output (for automation)

```bash
node /job/pi-skills/summarize/summarize.js --json "https://example.com"
```

## Supported Input Types

| Type | Description | Method |
|------|-------------|--------|
| URL | Web pages | HTTP fetch + content extraction |
| YouTube | Video URLs | yt-dlp for transcript + LLM summary |
| PDF | PDF documents | pdf-parse for text extraction |
| TXT/MD | Text files | Direct file reading |

## LLM Providers

Uses the same LLM configuration as the agent environment:

- **Anthropic** (default): Uses `ANTHROPIC_API_KEY`
- **OpenAI**: Uses `OPENAI_API_KEY`
- **Google**: Uses `GOOGLE_API_KEY` or `GEMINI_API_KEY`

Set default provider via environment variable `LLM_PROVIDER`.

## Output Format

### Human-readable (default)

```
============================================================
URL: https://example.com/article
============================================================

Title: Article Title

--- Summary ---
A concise 2-3 sentence summary of the article...

--- Key Points ---
1. First key point from the article
2. Second key point
3. Third key point

Read time: 3 min (750 words)
```

### JSON output

```json
{
  "url": "https://example.com/article",
  "title": "Article Title",
  "summary": "A concise 2-3 sentence summary...",
  "keyPoints": [
    "First key point",
    "Second key point",
    "Third key point"
  ],
  "wordCount": 750,
  "readTime": "3 min"
}
```

## Common Workflows

### Quick URL Summary
```
User: Check out https://github.com/openclaw/openclaw for me
Agent: [Uses summarize to fetch and summarize]
```

### YouTube Video Summary
```
User: What's this video about? https://youtu.be/...
Agent: [Uses summarize with YouTube transcript extraction]
```

### Document Review
```
User: Can you summarize this PDF? /path/to/report.pdf
Agent: [Uses summarize with PDF extraction]
```

### Research Task
```
User: Find and summarize recent articles about AI agents
Agent: [Uses blog-watcher to find articles, then summarize each]
```

## Integration with Other Skills

- **With blog-watcher**: Summarize new articles found via RSS feeds
- **With link-scraper**: Use for deeper content extraction before summarization
- **With memory-agent**: Store summarized information for future reference
- **With transcribe**: Use for audio/video transcription (alternative to YouTube)
- **With voice-output**: Announce summaries aloud

## Limitations

- Requires valid LLM API key for summarization
- Some websites may block automated requests (use browser-tools as fallback)
- YouTube transcripts unavailable for some videos (age-restricted, no captions)
- Large PDFs may be truncated for token limits
- Password-protected content not supported
