#!/usr/bin/env node

/**
 * Link Scraper - Wrapper script for easy integration
 * 
 * Provides a simple interface for extracting and summarizing web content.
 * Can be used standalone or integrated with other skills.
 * 
 * Usage:
 *   node scrape-wrapper.js <command> [args...]
 *   
 * Commands:
 *   extract <url>           - Extract content from URL (JSON output)
 *   summary <url>           - Get summary of URL
 *   title <url>             - Get just the title
 *   content <url>           - Get full content
 *   test                    - Run self-test
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
 * Extract all data from HTML
 */
function extractData(html, baseUrl) {
  if (cheerio) {
    const $ = cheerio.load(html);
    
    // Title
    const title = $('title').text().trim() || 
                  $('meta[property="og:title"]').attr('content') || 
                  $('h1').first().text().trim() || '';
    
    // Description
    const description = $('meta[name="description"]').attr('content') || 
                        $('meta[property="og:description"]').attr('content') || '';
    
    // Site name
    const siteName = $('meta[property="og:site_name"]').attr('content') || '';
    
    // Content - try common selectors
    let content = '';
    const contentSelectors = ['article', 'main', '[role="main"]', '.post-content', '.article-content', '.entry-content', '.content', '.post', '.article', '#content', '#main', 'body'];
    
    for (const sel of contentSelectors) {
      const text = $(sel).text().trim();
      if (text.length > 100) {
        content = text.replace(/\s+/g, ' ').trim();
        break;
      }
    }
    
    if (!content) {
      content = $('body').text().replace(/\s+/g, ' ').trim();
    }
    
    // Links
    const links = [];
    $('a[href]').each((i, el) => {
      if (links.length >= 20) return;
      const href = $(el).attr('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          links.push(new URL(href, baseUrl).href);
        } catch {}
      }
    });
    
    // Images
    const images = [];
    $('img[src]').each((i, el) => {
      if (images.length >= 10) return;
      const src = $(el).attr('src');
      if (src) {
        try {
          images.push(new URL(src, baseUrl).href);
        } catch {}
      }
    });
    
    return { title, description, siteName, content, links, images: [...new Set(images)] };
  }
  
  // Fallback without cheerio
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  const description = descMatch ? descMatch[1] : '';
  
  let content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  content = content.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  content = bodyMatch ? bodyMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
  
  return { title, description, siteName: '', content, links: [], images: [] };
}

/**
 * Generate summary
 */
function generateSummary(content, maxLength = 300) {
  if (!content || content.length <= maxLength) return content;
  
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  let summary = '';
  
  for (const sentence of sentences) {
    if ((summary + sentence).length > maxLength) break;
    summary += (summary ? '. ' : '') + sentence.trim();
  }
  
  return summary + '.';
}

/**
 * Extract key points
 */
function extractKeyPoints(content, maxPoints = 5) {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
  
  const scored = sentences.map((sentence, index) => ({
    sentence: sentence.trim(),
    score: (1 - index / sentences.length) * 0.3 + Math.min(sentence.trim().length / 100, 1) * 0.7
  }));
  
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, maxPoints).map(s => s.sentence.replace(/\s+/g, ' ').trim()).filter(s => s.length > 20);
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
    images: data.images,
    summary: generateSummary(truncatedContent),
    keyPoints: extractKeyPoints(truncatedContent),
    readTime: estimateReadTime(wordCount)
  };
}

/**
 * Run test
 */
async function runTest() {
  console.log('🧪 Running Link Scraper self-test...\n');
  
  // Test URLs
  const testUrls = [
    'https://example.com',
    'https://news.ycombinator.com'
  ];
  
  for (const url of testUrls) {
    console.log(`Testing: ${url}`);
    try {
      const start = Date.now();
      const result = await extract(url);
      const elapsed = Date.now() - start;
      
      console.log(`  ✅ Success (${elapsed}ms)`);
      console.log(`  Title: ${result.title || '(none)'}`);
      console.log(`  Word count: ${result.wordCount}`);
      console.log(`  Summary: ${result.summary ? result.summary.substring(0, 100) + '...' : '(none)'}`);
      console.log('');
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
      console.log('');
    }
  }
  
  console.log('✅ Self-test complete!');
}

/**
 * Main CLI
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const url = args[1];
  
  if (!command) {
    console.log(`
Link Scraper - Extract and summarize web content

Usage:
  node scrape-wrapper.js extract <url>    - Extract all data (JSON)
  node scrape-wrapper.js summary <url>      - Get summary only
  node scrape-wrapper.js title <url>        - Get title only
  node scrape-wrapper.js content <url>      - Get full content
  node scrape-wrapper.js test               - Run self-test

Examples:
  node scrape-wrapper.js extract "https://example.com"
  node scrape-wrapper.js summary "https://news.ycombinator.com"
`);
    process.exit(0);
  }
  
  try {
    switch (command) {
      case 'test':
        await runTest();
        break;
        
      case 'extract':
        if (!url) throw new Error('URL required');
        const result = await extract(url);
        console.log(JSON.stringify(result, null, 2));
        break;
        
      case 'summary':
        if (!url) throw new Error('URL required');
        const summaryResult = await extract(url);
        console.log(summaryResult.summary);
        break;
        
      case 'title':
        if (!url) throw new Error('URL required');
        const titleResult = await extract(url);
        console.log(titleResult.title);
        break;
        
      case 'content':
        if (!url) throw new Error('URL required');
        const contentResult = await extract(url);
        console.log(contentResult.content);
        break;
        
      default:
        console.error(`Unknown command: ${command}`);
        console.error('Run with no args to see usage');
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { extract, fetch };
