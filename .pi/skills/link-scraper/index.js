#!/usr/bin/env node

/**
 * Link Scraper - PopeBot Skill
 * 
 * Fetches, extracts, and summarizes content from URLs.
 * Created based on research from OpenClaw's link-understanding feature.
 * 
 * Location: /job/.pi/skills/link-scraper/
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const MAX_CONTENT_LENGTH = 50000;
const DEFAULT_TIMEOUT = 15000;

// Try to load cheerio
let cheerio;
try {
  cheerio = require('cheerio');
} catch (e) {
  cheerio = null;
}

/**
 * Fetch URL content
 */
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.get(url, {
      timeout: options.timeout || DEFAULT_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        ...options.headers
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).href;
        fetch(redirectUrl, options).then(resolve).catch(reject);
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
 * Extract data from HTML
 */
function extractData(html, baseUrl) {
  if (cheerio) {
    const $ = cheerio.load(html);
    const title = $('title').text().trim() || 
                  $('meta[property="og:title"]').attr('content') || 
                  $('h1').first().text().trim() || '';
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '';
    const siteName = $('meta[property="og:site_name"]').attr('content') || '';
    
    // Content - try common selectors
    let content = '';
    const selectors = ['article', 'main', '[role="main"]', '.post-content', 
                       '.article-content', '.entry-content', '.content', 
                       '.post', '.article', '#content', '#main', 'body'];
    for (const sel of selectors) {
      const text = $(sel).text().trim();
      if (text.length > 100) {
        content = text.replace(/\s+/g, ' ').trim();
        break;
      }
    }
    if (!content) content = $('body').text().replace(/\s+/g, ' ').trim();
    
    // Links
    const links = [];
    $('a[href]').each((i, el) => {
      if (links.length >= 20) return;
      const href = $(el).attr('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try { links.push(new URL(href, baseUrl).href); } catch {}
      }
    });
    
    // Images
    const images = [];
    $('img[src]').each((i, el) => {
      if (images.length >= 10) return;
      const src = $(el).attr('src');
      if (src) {
        try { images.push(new URL(src, baseUrl).href); } catch {}
      }
    });
    
    return { title, description, siteName, content, links, images };
  }
  
  // Fallback without cheerio
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  let content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  
  return {
    title: titleMatch ? titleMatch[1].trim() : '',
    description: descMatch ? descMatch[1] : '',
    siteName: '',
    content: bodyMatch ? bodyMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '',
    links: [],
    images: []
  };
}

/**
 * Generate extractive summary
 */
function generateSummary(content, maxLength = 300) {
  if (!content || content.length <= maxLength) return content;
  
  // Split by sentence-ending punctuation or newlines
  const sentences = content.split(/[.!?\n]+/).filter(s => s.trim().length > 20);
  
  if (sentences.length === 0) {
    // If no sentences found, just truncate
    return content.substring(0, maxLength) + '...';
  }
  
  let summary = '';
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if ((summary + trimmed).length > maxLength) break;
    summary += (summary ? '. ' : '') + trimmed;
  }
  
  return summary || content.substring(0, maxLength) + '...';
}

/**
 * Extract key points
 */
function extractKeyPoints(content, maxPoints = 5) {
  // Split by sentence-ending punctuation or newlines
  const sentences = content.split(/[.!?\n]+/).filter(s => s.trim().length > 30);
  
  if (sentences.length === 0) return [];
  
  const scored = sentences.map((s, i) => ({
    sentence: s.trim(),
    score: (1 - i/sentences.length) * 0.3 + Math.min(s.trim().length/100, 1) * 0.7
  }));
  
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, maxPoints)
    .map(s => s.sentence.replace(/\s+/g, ' ').trim())
    .filter(s => s.length > 20);
}

/**
 * Estimate reading time
 */
function estimateReadTime(wordCount) {
  const minutes = Math.ceil(wordCount / 200);
  if (minutes < 1) return '< 1 min';
  if (minutes === 1) return '1 min';
  return `${minutes} min`;
}

/**
 * Main extract function
 */
async function extract(url) {
  const html = await fetch(url);
  const data = extractData(html, url);
  
  const truncatedContent = data.content.length > MAX_CONTENT_LENGTH 
    ? data.content.substring(0, MAX_CONTENT_LENGTH) + '...'
    : data.content;
  
  const wordCount = truncatedContent.split(/\s+/).filter(w => w.length > 0).length;
  
  return {
    url,
    title: data.title,
    description: data.description,
    siteName: data.siteName,
    content: truncatedContent,
    wordCount,
    links: data.links,
    images: [...new Set(data.images)],
    summary: generateSummary(truncatedContent),
    keyPoints: extractKeyPoints(truncatedContent),
    readTime: estimateReadTime(wordCount)
  };
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const url = args[0];
  
  if (!url) {
    console.log('Usage: node index.js <url>');
    process.exit(1);
  }
  
  try {
    const result = await extract(url);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { extract, fetch };
