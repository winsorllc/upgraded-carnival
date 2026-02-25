#!/usr/bin/env node

/**
 * Web Fetch - Fetch web pages and convert HTML to readable text
 * 
 * Features:
 * - Converts HTML to plain text
 * - Optional Markdown output
 * - Follows redirects
 * - Size limits
 * - Timeout control
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const DEFAULT_TIMEOUT = 30;
const DEFAULT_MAX_SIZE = 1048576;
const MAX_REDIRECTS = 10;

/**
 * Strip HTML tags and decode entities
 */
function stripHtml(html) {
  // Remove script and style elements
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Replace block elements with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  
  // Remove all remaining tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");
  text = text.replace(/&[a-z]+;/gi, '');
  
  // Clean up whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n\n');
  
  return text.trim();
}

/**
 * Extract title from HTML
 */
function extractTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    return stripHtml(titleMatch[1]);
  }
  
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    return stripHtml(h1Match[1]);
  }
  
  return '';
}

/**
 * Simple HTML to Markdown conversion
 */
function htmlToMarkdown(html) {
  let md = html;
  
  // Headers
  md = md.replace(/<h1[^>]*>([^<]+)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>([^<]+)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>([^<]+)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>([^<]+)<\/h4>/gi, '#### $1\n\n');
  md = md.replace(/<h5[^>]*>([^<]+)<\/h5>/gi, '##### $1\n\n');
  md = md.replace(/<h6[^>]*>([^<]+)<\/h6>/gi, '###### $1\n\n');
  
  // Bold and italic
  md = md.replace(/<strong[^>]*>([^<]+)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>([^<]+)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>([^<]+)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>([^<]+)<\/i>/gi, '*$1*');
  
  // Links
  md = md.replace(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '[$2]($1)');
  
  // Images
  md = md.replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*alt="([^"]+)"[^>]*src="([^"]+)"[^>]*\/?>/gi, '![$1]($2)');
  md = md.replace(/<img[^>]*src="([^"]+)"[^>]*\/?>/gi, '![]($1)');
  
  // Code blocks and inline
  md = md.replace(/<pre[^>]*><code[^>]*>([^<]+)<\/code><\/pre>/gi, '```\n$1\n```\n');
  md = md.replace(/<code[^>]*>([^<]+)<\/code>/gi, '`$1`');
  
  // Lists
  md = md.replace(/<li[^>]*>([^<]+)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/ul>/gi, '\n');
  md = md.replace(/<\/ol>/gi, '\n');
  
  // Paragraphs
  md = md.replace(/<p[^>]*>([^<]+)<\/p>/gi, '\n$1\n\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  
  // Remove remaining tags
  md = md.replace(/<[^>]+>/g, '');
  
  // Clean up whitespace
  md = md.replace(/\n\s*\n/g, '\n\n');
  
  return md.trim();
}

/**
 * Fetch a URL with redirects
 */
function fetchUrl(urlString, options = {}) {
  return new Promise((resolve, reject) => {
    let redirects = 0;
    const maxRedirects = options.maxRedirects || MAX_REDIRECTS;
    
    function attemptFetch(url) {
      let parsedUrl;
      try {
        parsedUrl = new URL(url);
      } catch (e) {
        reject(new Error(`Invalid URL: ${url}`));
        return;
      }
      
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        reject(new Error(`Only http and https protocols are allowed`));
        return;
      }
      
      const client = parsedUrl.protocol === 'https:' ? https : http;
      const isHttps = parsedUrl.protocol === 'https:';
      
      // Create agent with relaxed TLS settings for testing
      const agent = isHttps ? new https.Agent({ 
        rejectUnauthorized: false 
      }) : undefined;
      
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'thepopebot-web-fetch/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: (options.timeout || DEFAULT_TIMEOUT) * 1000,
        agent: agent
      };
      
      const req = client.request(requestOptions, (res) => {
        // Handle redirects
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          redirects++;
          if (redirects > maxRedirects) {
            reject(new Error(`Too many redirects (${maxRedirects})`));
            return;
          }
          
          // Construct new URL
          const newUrl = new URL(res.headers.location, url).toString();
          attemptFetch(newUrl);
          return;
        }
        
        const chunks = [];
        let bytesReceived = 0;
        const maxSize = options.maxSize || DEFAULT_MAX_SIZE;
        
        res.on('data', (chunk) => {
          bytesReceived += chunk.length;
          if (bytesReceived > maxSize) {
            req.destroy();
            reject(new Error(`Response too large: ${bytesReceived} bytes (max: ${maxSize})`));
            return;
          }
          chunks.push(chunk);
        });
        
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          const contentType = res.headers['content-type'] || '';
          
          const result = {
            url: url,
            finalUrl: url,
            status: res.statusCode,
            contentType: contentType,
            text: stripHtml(body),
            markdown: htmlToMarkdown(body),
            title: extractTitle(body)
          };
          
          resolve(result);
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${options.timeout || DEFAULT_TIMEOUT}s`));
      });
      
      req.end();
    }
    
    attemptFetch(urlString);
  });
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const result = {
    url: '',
    options: {
      timeout: DEFAULT_TIMEOUT,
      maxSize: DEFAULT_MAX_SIZE,
      markdown: false
    }
  };
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if (arg === '--max-size' && args[i + 1]) {
      result.options.maxSize = parseInt(args[i + 1], 10);
      i += 2;
    } else if (arg === '--timeout' && args[i + 1]) {
      result.options.timeout = parseInt(args[i + 1], 10);
      i += 2;
    } else if (arg === '--markdown') {
      result.options.markdown = true;
      i++;
    } else if (!arg.startsWith('--')) {
      result.url = arg;
      i++;
    } else {
      i++;
    }
  }
  
  return result;
}

// CLI handling
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Web Fetch CLI');
  console.log('');
  console.log('Usage: web-fetch.js <URL> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --max-size <bytes>   Max response size (default: 1048576)');
  console.log('  --timeout <seconds>  Request timeout (default: 30)');
  console.log('  --markdown           Output as Markdown');
  console.log('');
  console.log('Examples:');
  console.log('  web-fetch.js https://example.com');
  console.log('  web-fetch.js https://example.com --markdown');
  process.exit(1);
}

const parsed = parseArgs(args);

if (!parsed.url) {
  console.error('Error: URL is required');
  process.exit(1);
}

fetchUrl(parsed.url, parsed.options)
  .then(response => {
    if (parsed.options.markdown) {
      console.log(response.markdown);
    } else {
      console.log(JSON.stringify(response, null, 2));
    }
  })
  .catch(error => {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  });
