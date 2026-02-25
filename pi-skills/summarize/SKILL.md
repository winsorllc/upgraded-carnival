---
name: summarize
description: "Summarize text, documents, or content using LLM. Use when user wants to: extract key points from long text, get a TL;DR of articles/documents, create executive summaries, or condense information."
---

# Summarize Skill

Summarize text and documents using LLM capabilities.

## When to Use

- Extract key points from long text
- Get a TL;DR of articles or documents
- Create executive summaries
- Condense meeting notes
- Quick overview of code changes

## How It Works

This skill uses the LLM to summarize content. Provide the text or file to summarize.

## Input Methods

### Direct Text
```
Summarize this: [paste text here]
```

### File Summary
```bash
# Summarize a file
cat /path/to/file.txt | head -500

# Summarize multiple files
cat file1.txt file2.txt
```

### URL Content
```
Summarize the content at: https://example.com/article
```

## Output Formats

### Brief Summary (2-3 sentences)
```
Brief summary of: [content]
```

### Detailed Summary (paragraph format)
```
Summarize: [content]
```

### Bullet Points
```
Extract key points from: [content]
```

## Examples

**Summarize an article:**
```
Can you summarize https://example.com/tech-news article about AI?
```

**Summarize text:**
```
Summarize this meeting notes:
- Discussed Q1 goals
- Reviewed budget allocation  
- Team A completed project X
- Team B facing delays on Y
```

**Extract key points:**
```
What are the key takeaways from this research paper?
```

## Tips

- For best results, provide clear context about what type of summary is needed
- Specify length preference (brief, detailed, bullet points)
- Include any specific focus areas
