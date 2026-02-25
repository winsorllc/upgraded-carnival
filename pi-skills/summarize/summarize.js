#!/usr/bin/env node

/**
 * Summarize - LLM-powered content summarization
 * 
 * Supports: URLs, YouTube videos, PDFs, and local text files
 * 
 * Usage:
 *   node summarize.js <input> [options]
 *   node summarize.js --length short|medium|long|xl "https://example.com"
 *   node summarize.js --extract-only "https://youtu.be/..."
 *   node summarize.js --json "https://example.com"
 */

const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const https = require('https');
const http = require('http');
const { spawn } = require('child_process');
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Try to load optional dependencies
let cheerio, pdfParse;
try { cheerio = require('cheerio'); } catch {}
try { pdfParse = require('pdf-parse'); } catch {}

// Configuration
const DEFAULT_TIMEOUT = 30000;
const MAX_CONTENT_LENGTH = 50000;
const MAX_RETRIES = 2;

// LLM Configuration
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'anthropic';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

/**
 * Fetch URL content with proper headers
 */
function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    
    const req = client.get(url, {
      timeout,
      agent: parsedUrl.protocol === 'https:' ? httpsAgent : undefined,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SummarizeBot/1.0; +https://github.com/stephengpope/thepopebot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        ...options.headers
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).href;
        fetchUrl(redirectUrl, options).then(resolve).catch(reject);
        return;
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data).toString('utf8')));
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Extract title from HTML
 */
function extractTitle(html) {
  if (cheerio) {
    const $ = cheerio.load(html);
    return $('title').text().trim() || 
           $('meta[property="og:title"]').attr('content') || 
           $('h1').first().text().trim() || '';
  }
  
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) return titleMatch[1].trim();
  return '';
}

/**
 * Extract main content from HTML
 */
function extractContent(html) {
  if (cheerio) {
    const $ = cheerio.load(html);
    
    // Try common content selectors
    const contentSelectors = [
      'article', 'main', '[role="main"]',
      '.post-content', '.article-content', '.entry-content',
      '.content', '.post', '.article', '#content', '#main', 'body'
    ];
    
    for (const sel of contentSelectors) {
      const content = $(sel).text().trim();
      if (content.length > 100) {
        return cleanText(content);
      }
    }
    
    return cleanText($('body').text());
  }
  
  // Fallback
  let content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  content = content.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  
  const textMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (textMatch) content = textMatch[1];
  
  return cleanText(content);
}

/**
 * Clean extracted text
 */
function cleanText(text) {
  // First strip HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#\d+;/g, ' ');
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n\n');
  
  return text.trim();
}

/**
 * Check if URL is YouTube
 */
function isYouTubeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('youtube.com') || 
           parsed.hostname.includes('youtu.be');
  } catch {
    return false;
  }
}

/**
 * Extract YouTube video ID
 */
function getYouTubeVideoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1);
    }
    return parsed.searchParams.get('v');
  } catch {
    return null;
  }
}

/**
 * Get YouTube transcript using yt-dlp
 */
function getYouTubeTranscript(videoUrl) {
  return new Promise((resolve, reject) => {
    const args = ['--write-subs', '--write-auto-subs', '--sub-lang', 'en', 
                  '--skip-download', '--output', '/tmp/youtube_%(id)s', videoUrl];
    
    const yt = spawn('yt-dlp', args);
    let stderr = '';
    
    yt.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    yt.on('close', (code) => {
      // Try to find the subtitle file
      const videoId = getYouTubeVideoId(videoUrl);
      const subtitlePaths = [
        `/tmp/youtube_${videoId}.en.vtt`,
        `/tmp/youtube_${videoId}.en.srt`,
        `/tmp/youtube_${videoId}.vtt`,
        `/tmp/youtube_${videoId}.srt`
      ];
      
      for (const subtitlePath of subtitlePaths) {
        if (fs.existsSync(subtitlePath)) {
          try {
            let content = fs.readFileSync(subtitlePath, 'utf8');
            // Convert VTT/SRT to plain text
            content = content.replace(/<[^>]+>/g, '');
            content = content.replace(/\d+\n\d{2}:\d{2}:\d{2}[.,]\d{3} --> \d{2}:\d{2}:\d{2}[.,]\d{3}/g, '');
            content = content.replace(/\n+/g, ' ').trim();
            resolve(content);
            return;
          } catch (e) {
            // Continue to next
          }
        }
      }
      
      // If no subtitles found, try to get description as fallback
      const descArgs = ['--get-description', '--', videoUrl];
      const yt2 = spawn('yt-dlp', descArgs);
      let desc = '';
      
      yt2.stdout.on('data', (data) => { desc += data.toString(); });
      yt2.on('close', () => {
        if (desc.trim()) {
          resolve(desc.trim());
        } else {
          reject(new Error('No transcript or description available for this video'));
        }
      });
    });
  });
}

/**
 * Read PDF file
 */
function readPdf(filePath) {
  return new Promise((resolve, reject) => {
    if (!pdfParse) {
      reject(new Error('pdf-parse not installed. Install with: npm install pdf-parse'));
      return;
    }
    
    try {
      const dataBuffer = fs.readFileSync(filePath);
      pdfParse(dataBuffer).then(data => {
        resolve(data.text);
      }).catch(reject);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Read text file
 */
function readTextFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Call LLM to summarize content
 */
async function summarizeWithLLM(content, options = {}) {
  const length = options.length || 'medium';
  
  // Estimate word count
  const wordCount = content.split(/\s+/).length;
  
  // Truncate content if too long (leave room for prompt)
  const maxInputWords = 15000;
  let truncatedContent = content;
  if (wordCount > maxInputWords) {
    const words = content.split(/\s+/);
    truncatedContent = words.slice(0, maxInputWords).join(' ') + '...[content truncated]';
  }
  
  // Build prompt based on length
  const lengthInstructions = {
    short: 'Provide a brief 2-3 sentence summary and 3 key points.',
    medium: 'Provide a concise summary (2-4 sentences) and 5 key points.',
    long: 'Provide a detailed summary (4-6 paragraphs) and 7-10 key points.',
    xl: 'Provide a comprehensive summary (full article overview) and list all important key points.'
  };
  
  const prompt = `You are a helpful assistant that summarizes content. 
${lengthInstructions[length]}

Content to summarize:
---
${truncatedContent}
---

Respond in JSON format:
{
  "summary": "Your summary here",
  "keyPoints": ["Point 1", "Point 2", ...]
}`;

  // Try provider based on availability
  if (ANTHROPIC_API_KEY) {
    return summarizeWithAnthropic(prompt, truncatedContent);
  } else if (OPENAI_API_KEY) {
    return summarizeWithOpenAI(prompt, truncatedContent);
  } else if (GOOGLE_API_KEY) {
    return summarizeWithGoogle(prompt, truncatedContent);
  } else {
    // Fallback to extractive summarization
    return extractiveSummary(content, length);
  }
}

/**
 * Summarize using Anthropic
 */
async function summarizeWithAnthropic(prompt, content) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  
  const anthropic = new Anthropic({
    apiKey: ANTHROPIC_API_KEY
  });
  
  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }]
  });
  
  try {
    const result = JSON.parse(response.content[0].text);
    return {
      summary: result.summary || '',
      keyPoints: result.keyPoints || []
    };
  } catch {
    // If not JSON, return as raw
    return {
      summary: response.content[0].text,
      keyPoints: []
    };
  }
}

/**
 * Summarize using OpenAI
 */
async function summarizeWithOpenAI(prompt, content) {
  const { default: OpenAI } = await import('openai');
  
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
  });
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2048
  });
  
  try {
    const result = JSON.parse(response.choices[0].message.content);
    return {
      summary: result.summary || '',
      keyPoints: result.keyPoints || []
    };
  } catch {
    return {
      summary: response.choices[0].message.content,
      keyPoints: []
    };
  }
}

/**
 * Summarize using Google Gemini
 */
async function summarizeWithGoogle(prompt, content) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7
        }
      })
    }
  );
  
  const data = await response.json();
  
  if (data.candidates && data.candidates[0]) {
    const text = data.candidates[0].content.parts[0].text;
    try {
      const result = JSON.parse(text);
      return {
        summary: result.summary || '',
        keyPoints: result.keyPoints || []
      };
    } catch {
      return { summary: text, keyPoints: [] };
    }
  }
  
  throw new Error('Failed to get summary from Google');
}

/**
 * Extractive summarization (fallback when no LLM available)
 */
function extractiveSummary(content, length = 'medium') {
  const maxPoints = { short: 3, medium: 5, long: 7, xl: 10 }[length];
  
  // Split into sentences
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  // Score sentences by position and length
  const scored = sentences.map((sentence, index) => {
    const lengthScore = Math.min(sentence.trim().length / 100, 1);
    const positionScore = 1 - (index / sentences.length);
    return {
      sentence: sentence.trim(),
      score: positionScore * 0.3 + lengthScore * 0.7
    };
  });
  
  // Sort and take top points
  scored.sort((a, b) => b.score - a.score);
  
  const keyPoints = scored.slice(0, maxPoints)
    .map(s => s.sentence.replace(/\s+/g, ' ').trim());
  
  // Generate summary from top sentences
  const topSentences = scored.slice(0, 3).map(s => s.sentence).join('. ');
  
  return {
    summary: topSentences + '.',
    keyPoints
  };
}

/**
 * Estimate reading time
 */
function estimateReadTime(wordCount) {
  const wordsPerMinute = 200;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  if (minutes < 1) return '< 1 min';
  if (minutes === 1) return '1 min';
  return `${minutes} min`;
}

/**
 * Main processing function
 */
async function processInput(input, options = {}) {
  let content = '';
  let title = '';
  let sourceType = 'unknown';
  let source = input;
  
  // Check if it's a URL
  try {
    const parsed = new URL(input);
    
    if (isYouTubeUrl(input)) {
      sourceType = 'youtube';
      console.error('Fetching YouTube transcript...');
      content = await getYouTubeTranscript(input);
      title = `YouTube Video`;
    } else {
      sourceType = 'url';
      console.error('Fetching URL...');
      const html = await fetchUrl(input);
      title = extractTitle(html);
      content = extractContent(html);
    }
  } catch (urlError) {
    // Not a URL, try as file
    if (fs.existsSync(input)) {
      const ext = path.extname(input).toLowerCase();
      source = path.resolve(input);
      
      if (ext === '.pdf') {
        sourceType = 'pdf';
        console.error('Reading PDF...');
        content = await readPdf(input);
        title = path.basename(input, ext);
      } else if (ext === '.txt' || ext === '.md' || ext === '.json') {
        sourceType = 'text';
        console.error('Reading file...');
        content = readTextFile(input);
        title = path.basename(input, ext);
      } else {
        throw new Error(`Unsupported file type: ${ext}`);
      }
    } else {
      throw urlError;
    }
  }
  
  // Truncate content if too long
  if (content.length > MAX_CONTENT_LENGTH) {
    content = content.substring(0, MAX_CONTENT_LENGTH) + '...[content truncated]';
  }
  
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  let summary = null;
  let keyPoints = [];
  
  // Generate summary (unless extract-only mode)
  if (!options.extractOnly) {
    console.error('Generating summary...');
    try {
      const llmResult = await summarizeWithLLM(content, options);
      summary = llmResult.summary;
      keyPoints = llmResult.keyPoints;
    } catch (e) {
      console.error(`LLM failed: ${e.message}, using extractive summary`);
      const extractive = extractiveSummary(content, options.length || 'medium');
      summary = extractive.summary;
      keyPoints = extractive.keyPoints;
    }
  }
  
  return {
    source,
    sourceType,
    title,
    content: options.extractOnly ? content.substring(0, 5000) : undefined,
    summary,
    keyPoints,
    wordCount,
    readTime: estimateReadTime(wordCount)
  };
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Summarize - LLM-powered content summarization

Usage:
  node summarize.js <input> [options]
  node summarize.js "https://example.com/article"
  node summarize.js "https://youtu.be/..."
  node summarize.js "/path/to/file.pdf"
  node summarize.js --length short "https://example.com"
  node summarize.js --extract-only "https://youtu.be/..."
  node summarize.js --json "https://example.com"

Options:
  --length         Summary length: short, medium, long, xl (default: medium)
  --extract-only   Extract content without summarization
  --json           Output as JSON
  --help, -h       Show this help

Supported inputs:
  - URLs (web pages)
  - YouTube video URLs
  - PDF files
  - Text files (.txt, .md, .json)

Environment:
  LLM_PROVIDER     Set to anthropic, openai, or google
  ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY

Examples:
  node summarize.js "https://news.ycombinator.com"
  node summarize.js --length short "https://youtu.be/dQw4w9WgXcQ"
  node summarize.js --json "/path/to/document.pdf"
`);
    process.exit(0);
  }
  
  // Parse options
  const options = {
    length: 'medium',
    extractOnly: false,
    json: false
  };
  
  const inputs = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--length' && i + 1 < args.length) {
      options.length = args[++i];
    } else if (arg === '--extract-only') {
      options.extractOnly = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (!arg.startsWith('--')) {
      inputs.push(arg);
    }
  }
  
  if (inputs.length === 0) {
    console.error('Error: No input provided');
    process.exit(1);
  }
  
  try {
    const result = await processInput(inputs[0], options);
    
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      // Human-readable output
      console.log('\n' + '='.repeat(60));
      console.log(`${result.sourceType.toUpperCase()}: ${result.title || result.source}`);
      console.log('='.repeat(60));
      
      if (result.summary) {
        console.log('\n--- Summary ---');
        console.log(result.summary);
        
        if (result.keyPoints.length > 0) {
          console.log('\n--- Key Points ---');
          result.keyPoints.forEach((point, i) => {
            console.log(`${i + 1}. ${point}`);
          });
        }
        
        console.log(`\nRead time: ${result.readTime} (${result.wordCount} words)`);
      } else if (result.content) {
        console.log('\n--- Content (extracted) ---');
        console.log(result.content.substring(0, 2000) + (result.content.length > 2000 ? '...' : ''));
      }
    }
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { processInput, summarizeWithLLM };
