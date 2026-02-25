---
name: link-understanding
description: "Extract and understand link content - fetch, summarize, extract entities. Use when: analyzing URLs, articles, documentation."
metadata: { "openclaw": { "emoji": "🔗", "requires": { "bins": ["node"], "skills": ["web-fetch"] } } }
---

# Link Understanding Skill

Fetch web pages, extract key information, and provide structured understanding of link content. Combines web fetching with NLP-powered analysis.

## When to Use

✅ **USE this skill when:**
- Analyzing articles and documentation
- Extracting key points from URLs
- Research and fact-checking
- Content categorization

❌ **DON'T use this skill when:**
- Direct API endpoints (use http-request)
- Binary content (PDFs, images - use specialized skills)
- Rate-limited crawling

## Features

- HTML to text conversion
- Key point extraction
- Entity recognition
- Content classification
- Link graph analysis
- Summary generation

## Usage

### Basic Understanding

```javascript
const { understandLink } = require('/job/.pi/skills/link-understanding/analyzer.js');

const result = await understandLink('https://example.com/article');
console.log(result);
```

### With Options

```javascript
const result = await understandLink('https://example.com/article', {
  extractKeyPoints: true,
  extractEntities: true,
  generateSummary: true,
  followInternalLinks: false,
  timeoutMs: 15000
});
```

### Batch Processing

```javascript
const urls = [
  'https://example.com/1',
  'https://example.com/2',
  'https://example.com/3'
];

const results = await Promise.all(urls.map(url => understandLink(url)));

// Aggregate insights
const allKeyPoints = results.flatMap(r => r.keyPoints);
console.log(allKeyPoints);
```

## Output Structure

```javascript
{
  url: "https://example.com/article",
  fetchedAt: "2026-02-25T13:45:00Z",
  contentType: "text/html",
  title: "Understanding AI Agents",
  author: "John Doe",
  publishedDate: "2026-02-20",
  wordCount: 1542,
  readingTimeMinutes: 6,
  
  summary: "This article explains the fundamentals of AI agents...",
  
  keyPoints: [
    "AI agents combine LLMs with tools and memory",
    "Multi-agent systems enable complex workflows",
    "Security is paramount for autonomous agents"
  ],
  
  entities: {
    people: ["John Doe", "Jane Smith"],
    organizations: ["OpenAI", "Anthropic"],
    technologies: ["LLM", "Python", "TypeScript"],
    concepts: ["autonomous agents", "multi-agent systems"]
  },
  
  categories: ["Technology", "Artificial Intelligence", "Software"],
  tone: "Educational",
  language: "en",
  
  outgoingLinks: [
    { url: "https://reference.com", anchor: "AI research", context: "..." }
  ],
  
  images: [
    { src: "/diagram.png", alt: "Agent architecture" }
  ],
  
  metadata: {
    ogTitle: "Understanding AI Agents",
    ogDescription: "A comprehensive guide...",
    ogImage: "https://example.com/og.jpg"
  }
}
```

## Extract Sections

```javascript
const result = await understandLink('https://docs.example.com', {
  extractSections: true
});

console.log(result.sections);
// [
//   { heading: "Introduction", content: "...", level: 1 },
//   { heading: "Getting Started", content: "...", level: 2 },
//   { heading: "Installation", content: "...", level: 3 }
// ]
```

## Compare Multiple Links

```javascript
const { compareLinks } = require('/job/.pi/skills/link-understanding/analyzer.js');

const comparison = await compareLinks([
  'https://site1.com/topic',
  'https://site2.com/topic'
]);

console.log(comparison);
// {
//   commonThemes: ["theme1", "theme2"],
//   differences: [...],
//   qualityScores: [8.5, 7.2],
//   recommendation: "Link 1 is more comprehensive"
// }
```

## Extract Data Tables

```javascript
const result = await understandLink('https://example.com/data', {
  extractTables: true
});

console.log(result.tables);
// [
//   {
//     caption: "Comparison",
//     headers: ["Feature", "Product A", "Product B"],
//     rows: [
//       ["Speed", "Fast", "Medium"],
//       ["Cost", "$10", "$20"]
//     ]
//   }
// ]
```

## Link Graph Analysis

```javascript
const result = await understandLink('https://example.com', {
  analyzeInternalLinks: true,
  maxDepth: 2
});

console.log(result.linkGraph);
// {
//   rootUrl: "https://example.com",
//   pages: [
//     { url: "https://example.com/about", depth: 1, title: "About" },
//     { url: "https://example.com/team", depth: 2, title: "Team" }
//   ]
// }
```

## API

```javascript
understandLink(url, options = {})
```

**Options:**
- `extractKeyPoints` - Extract main points (default: true)
- `extractEntities` - Named entity recognition (default: true)
- `generateSummary` - Generate summary (default: true)
- `extractSections` - Extract section hierarchy
- `extractTables` - Extract data tables
- `followInternalLinks` - Analyze internal link graph
- `maxDepth` - Link graph depth (default: 1)
- `timeoutMs` - Fetch timeout (default: 15000)
- `language` - Language code (default: auto-detect)

**Returns:**
```javascript
// See Output Structure above
```

## Use Cases

### Research Assistant

```javascript
async function research(topic) {
  const searchResults = await searchWeb(topic);
  
  const analyses = await Promise.all(
    searchResults.slice(0, 5).map(url => understandLink(url, {
      extractKeyPoints: true,
      generateSummary: true
    }))
  );
  
  // Combine insights
  return {
    topic,
    sources: analyses.map(a => a.url),
    combinedSummary: analyses.map(a => a.summary).join('\n\n'),
    allKeyPoints: [...new Set(analyses.flatMap(a => a.keyPoints))]
  };
}
```

### Documentation Analyzer

```javascript
async function analyzeDocs(docsUrl) {
  const result = await understandLink(docsUrl, {
    extractSections: true,
    extractTables: true
  });
  
  return {
    title: result.sections[0]?.heading || result.title,
    sections: result.sections,
    tables: result.tables,
    codeExamples: extractCodeBlocks(result.content)
  };
}
```

### Fact Checker

```javascript
async function factCheck(claim, sources) {
  const results = await Promise.all(
    sources.map(url => understandLink(url, {
      extractEntities: true,
      generateSummary: true
    }))
  );
  
  const mentions = results.flatMap(r => 
    r.entities.people.filter(p => claim.includes(p))
  );
  
  return {
    claim,
    supportingSources: sources.filter((_, i) => 
      results[i].summary.includes('supports')
    ),
    conflictingSources: sources.filter((_, i) =>
      results[i].summary.includes('contradicts')
    )
  };
}
```

## Bash CLI

```bash
# Analyze single URL
node /job/.pi/skills/link-understanding/analyzer.js \
  --url "https://example.com/article"

# Extract only key points
node /job/.pi/skills/link-understanding/analyzer.js \
  --url "https://example.com" \
  --key-points

# Batch process URLs from file
cat urls.txt | \
  node /job/.pi/skills/link-understanding/analyzer.js \
  --batch --output results.json
```

## Integration with Other Skills

```javascript
// With summarize skill
const { understandLink } = require('./link-understanding/analyzer.js');
const { summarize } = require('../summarize/summarize.js');

const linkAnalysis = await understandLink('https://example.com/long-article');
const shorterSummary = await summarize(linkAnalysis.summary, { maxLength: 100 });

// With web-fetch skill
const { fetchWeb } = require('../web-fetch/fetch.js');
const content = await fetchWeb('https://example.com');
const understanding = await understandLink('https://example.com');
```
