#!/usr/bin/env node

/**
 * Link Scraper - Fetch and extract content from URLs
 * 
 * Usage:
 *   node scrape.js <url> [url2] [url3]...
 *   node scrape.js --title <url>
 *   node scrape.js --full <url>
 *   node scrape.js --selector "css-selector" <url>
 *   node scrape.js --json <url>
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

// Configuration
const MAX_CONTENT_LENGTH = 50000;
const DEFAULT_TIMEOUT = 10000;
const MAX_REDIRECTS = 5;

// Try to load cheerio, fall back to regex if not available
let cheerio;
try {
  cheerio = require('cheerio');
} catch (e) {
  cheerio = null;
  console.error('Note: cheerio not installed. Using basic extraction.');
}

/**
 * Make an HTTP/HTTPS request
 */
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    
    const req = client.get(url, {
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkScraper/1.0; +https://github.com/stephengpope/thepopebot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        ...options.headers
      }
    }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).href;
        if ((options.redirects || 0) < MAX_REDIRECTS) {
          fetch(redirectUrl, { ...options, redirects: (options.redirects || 0) + 1 })
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error('Too many redirects'));
        }
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
           $('h1').first().text().trim() ||
           '';
  }
  
  // Fallback without cheerio
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) return titleMatch[1].trim();
  
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitleMatch) return ogTitleMatch[1];
  
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) return h1Match[1].trim();
  
  return '';
}

/**
 * Extract description from HTML
 */
function extractDescription(html) {
  if (cheerio) {
    const $ = cheerio.load(html);
    return $('meta[name="description"]').attr('content') || 
           $('meta[property="og:description"]').attr('content') || 
           $('meta[name="twitter:description"]').attr('content') ||
           '';
  }
  
  // Fallback without cheerio
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (descMatch) return descMatch[1];
  
  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  if (ogDescMatch) return ogDescMatch[1];
  
  return '';
}

/**
 * Extract site name from HTML
 */
function extractSiteName(html, baseUrl) {
  if (cheerio) {
    const $ = cheerio.load(html);
    return $('meta[property="og:site_name"]').attr('content') || 
           $('meta[name="application-name"]').attr('content') ||
           '';
  }
  
  const ogSiteMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  if (ogSiteMatch) return ogSiteMatch[1];
  
  try {
    return new URL(baseUrl).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * Extract main content from HTML
 */
function extractContent(html, selector = null) {
  if (cheerio) {
    const $ = cheerio.load(html);
    
    // If selector provided, use it
    if (selector) {
      return $(selector).text().trim();
    }
    
    // Try common content selectors in order
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      '.post',
      '.article',
      '#content',
      '#main',
      'body'
    ];
    
    for (const sel of contentSelectors) {
      const content = $(sel).text().trim();
      if (content.length > 100) {
        return cleanText(content);
      }
    }
    
    // Fallback to body
    return cleanText($('body').text());
  }
  
  // Fallback without cheerio - basic extraction
  // Remove script and style tags
  let content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  content = content.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  
  // Get text content
  const textMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (textMatch) {
    content = textMatch[1];
  }
  
  return cleanText(content);
}

/**
 * Clean extracted text
 */
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Extract all links from HTML
 */
function extractLinks(html, baseUrl) {
  if (cheerio) {
    const $ = cheerio.load(html);
    const links = [];
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          links.push(absoluteUrl);
        } catch {}
      }
    });
    return [...new Set(links)].slice(0, 20);
  }
  
  // Fallback without cheerio
  const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
  const links = [];
  let match;
  while ((match = linkRegex.exec(html)) !== null && links.length < 20) {
    try {
      const absoluteUrl = new URL(match[1], baseUrl).href;
      links.push(absoluteUrl);
    } catch {}
  }
  return [...new Set(links)];
}

/**
 * Extract all images from HTML
 */
function extractImages(html, baseUrl) {
  if (cheerio) {
    const $ = cheerio.load(html);
    const images = [];
    $('img[src]').each((i, el) => {
      const src = $(el).attr('src');
      if (src) {
        try {
          const absoluteUrl = new URL(src, baseUrl).href;
          images.push(absoluteUrl);
        } catch {}
      }
    });
    return [...new Set(images)].slice(0, 10);
  }
  
  // Fallback without cheerio
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const images = [];
  let match;
  while ((match = imgRegex.exec(html)) && images.length < 10) {
    try {
      const absoluteUrl = new URL(match[1], baseUrl).href;
      images.push(absoluteUrl);
    } catch {}
  }
  return [...new Set(images)];
}

/**
 * Generate a simple summary using extractive method
 */
function generateSummary(content, maxLength = 300) {
  if (!content || content.length <= maxLength) {
    return content;
  }
  
  // Simple extractive summary: take first few sentences
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  let summary = '';
  
  for (const sentence of sentences) {
    if ((summary + sentence).length > maxLength) {
      break;
    }
    summary += (summary ? '. ' : '') + sentence.trim();
  }
  
  return summary + '.';
}

/**
 * Extract key points from content
 */
function extractKeyPoints(content, maxPoints = 5) {
  // Split into sentences
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
  
  // Score sentences by position (earlier = more important) and length
  const scored = sentences.map((sentence, index) => {
    const length = sentence.trim().length;
    const positionScore = 1 - (index / sentences.length); // Earlier = higher
    const lengthScore = Math.min(length / 100, 1); // Longer = potentially more content
    
    return {
      sentence: sentence.trim(),
      score: positionScore * 0.3 + lengthScore * 0.7
    };
  });
  
  // Sort by score and take top points
  scored.sort((a, b) => b.score - a.score);
  
  return scored
    .slice(0, maxPoints)
    .map(s => s.sentence.replace(/\s+/g, ' ').trim())
    .filter(s => s.length > 20);
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
 * Main scrape function
 */
async function scrape(url, options = {}) {
  console.error(`Fetching ${url}...`);
  
  const html = await fetch(url);
  
  const title = extractTitle(html);
  const description = extractDescription(html);
  const siteName = extractSiteName(html, url);
  const content = options.full ? extractContent(html, options.selector) : extractContent(html, options.selector);
  const links = extractLinks(html, url);
  const images = extractImages(html, url);
  
  // Truncate content if too long
  const truncatedContent = content.length > MAX_CONTENT_LENGTH 
    ? content.substring(0, MAX_CONTENT_LENGTH) + '...'
    : content;
  
  const wordCount = truncatedContent.split(/\s+/).filter(w => w.length > 0).length;
  
  const result = {
    url,
    title,
    description,
    siteName,
    content: truncatedContent,
    wordCount,
    links,
    images
  };
  
  // Add summary if requested (and content is long enough)
  if (options.summary !== false && wordCount > 50) {
    result.summary = generateSummary(truncatedContent, options.maxSummaryLength || 300);
    result.keyPoints = extractKeyPoints(truncatedContent);
    result.readTime = estimateReadTime(wordCount);
  }
  
  return result;
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Link Scraper - Fetch and extract content from URLs

Usage:
  node scrape.js <url> [url2] [url3]...
  node scrape.js --title <url>
  node scrape.js --full <url>
  node scrape.js --selector "css-selector" <url>
  node scrape.js --json <url>

Options:
  --title       Show only title
  --full        Show full content (no summary)
  --selector    Extract specific elements (CSS selector)
  --json        Output as JSON
  --no-summary  Skip summary generation

Examples:
  node scrape.js "https://example.com"
  node scrape.js --json "https://news.ycombinator.com"
  node scrape.js --selector "article" "https://blog.example.com/post"
`);
    process.exit(0);
  }
  
  // Parse options
  const options = {
    title: false,
    full: false,
    json: false,
    selector: null,
    summary: true
  };
  
  const urls = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--title') {
      options.title = true;
    } else if (arg === '--full') {
      options.full = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--no-summary') {
      options.summary = false;
    } else if (arg === '--selector' && i + 1 < args.length) {
      options.selector = args[++i];
    } else if (arg.startsWith('--')) {
      // Unknown option, skip
    } else {
      urls.push(arg);
    }
  }
  
  if (urls.length === 0) {
    console.error('Error: No URLs provided');
    process.exit(1);
  }
  
  try {
    const results = [];
    
    for (const url of urls) {
      const result = await scrape(url, options);
      
      if (options.title) {
        console.log(result.title || '(No title)');
      } else if (options.json) {
        results.push(result);
      } else {
        // Human-readable output
        console.log('\n' + '='.repeat(60));
        console.log(`URL: ${result.url}`);
        console.log('='.repeat(60));
        console.log(`Title: ${result.title || '(No title)'}`);
        if (result.siteName) console.log(`Site: ${result.siteName}`);
        if (result.description) console.log(`Description: ${result.description}`);
        if (result.summary) {
          console.log('\n--- Summary ---');
          console.log(result.summary);
          console.log('\n--- Key Points ---');
          result.keyPoints.forEach((point, i) => {
            console.log(`${i + 1}. ${point}`);
          });
          console.log(`\nRead time: ${result.readTime} (${result.wordCount} words)`);
        } else if (result.content) {
          console.log('\n--- Content ---');
          console.log(result.content.substring(0, 1000) + (result.content.length > 1000 ? '...' : ''));
        }
        console.log(`\nFound ${result.links.length} links and ${result.images.length} images`);
      }
    }
    
    if (options.json && results.length > 0) {
      console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
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

module.exports = { scrape, fetch, extractContent };
