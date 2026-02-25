#!/usr/bin/env node
/**
 * Web Fetcher - Fetch and extract web content
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function parseArgs(args) {
  const result = {
    url: null,
    extract: false,
    headers: false,
    raw: false,
    output: null,
    timeout: 30,
    userAgent: 'Mozilla/5.0 (compatible; WebFetcher/1.0) Node.js/' + process.version
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url': result.url = args[++i]; break;
      case '--extract': result.extract = true; break;
      case '--headers': result.headers = true; break;
      case '--raw': result.raw = true; break;
      case '--output': result.output = args[++i]; break;
      case '--timeout': result.timeout = parseInt(args[++i]); break;
      case '--user-agent': result.userAgent = args[++i]; break;
    }
  }
  return result;
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function fetchUrl(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': options.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive'
      },
      timeout: options.timeout * 1000
    };
    
    const req = client.request(requestOptions, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http') 
          ? res.headers.location 
          : `${urlObj.protocol}//${urlObj.hostname}${res.headers.location}`;
        
        if (options.redirectCount > 5) {
          reject(new Error('Too many redirects'));
          return;
        }
        
        fetchUrl(redirectUrl, { ...options, redirectCount: (options.redirectCount || 0) + 1 })
          .then(resolve)
          .catch(reject);
        return;
      }
      
      let data = '';
      res.setEncoding('utf8');
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

function extractReadableContent(html, url) {
  // Remove script and style elements
  let text = html.replace(/<script[^\u003e]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^\u003e]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[^\u003e]*>[\s\S]*?<\/noscript>/gi, '');
  
  // Try to find title
  const titleMatch = html.match(/<title[^\u003e]*>([^\u003c]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  
  // Try to find main content
  // Common content containers
  const contentPatterns = [
    /<main[^\u003e]*>([\s\S]*?)<\/main>/i,
    /<article[^\u003e]*>([\s\S]*?)<\/article>/i,
    /<div[^\u003e]*class=["'][^"']*content[^"']*["'][^\u003e]*>([\s\S]*?)<\/div>/i,
    /<div[^\u003e]*id=["']content["'][^\u003e]*>([\s\S]*?)<\/div>/i,
    /<div[^\u003e]*class=["'][^"']*post[^"']*["'][^\u003e]*>([\s\S]*?)<\/div>/i,
    /<div[^\u003e]*class=["'][^"']*entry[^"']*["'][^\u003e]*>([\s\S]*?)<\/div>/i
  ];
  
  let content = '';
  for (const pattern of contentPatterns) {
    const match = html.match(pattern);
    if (match) {
      content = match[1];
      break;
    }
  }
  
  // If no content container found, use body
  if (!content) {
    const bodyMatch = html.match(/<body[^\u003e]*>([\s\S]*?)<\/body>/i);
    content = bodyMatch ? bodyMatch[1] : html;
  }
  
  // Convert to plain text
  content = content
    .replace(/<[^\u003e]+>/g, '\n')  // Replace tags with newlines
    .replace(/\n\s*\n+/g, '\n\n')           // Collapse multiple newlines
    .replace(/^[\s\u00a0]+|[\s\u00a0]+$/gm, '')  // Trim whitespace
    .replace(/\u00a0/g, ' ');                // Non-breaking space
  
  // Remove extra whitespace
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  return {
    title,
    url,
    content: lines.join('\n'),
    wordCount: lines.join(' ').split(/\s+/).filter(w => w.length > 0).length
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.url) {
    console.log('Web Fetcher - Fetch and extract web content');
    console.log('');
    console.log('Usage: web-fetch.js --url <url> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --url <url>          URL to fetch');
    console.log('  --extract            Extract readable content');
    console.log('  --headers            Show HTTP headers');
    console.log('  --raw                Show raw HTML');
    console.log('  --output <file>     Save to file');
    console.log('  --timeout <seconds>  Timeout (default: 30)');
    console.log('  --user-agent <ua>    Custom user agent');
    console.log('');
    console.log('Examples:');
    console.log('  web-fetch.js --url https://example.com');
    console.log('  web-fetch.js --url https://example.com/blog --extract');
    console.log('  web-fetch.js --url https://api.example.com --output response.json');
    process.exit(1);
  }
  
  if (!isValidUrl(args.url)) {
    console.error(`Error: Invalid URL: ${args.url}`);
    process.exit(1);
  }
  
  try {
    console.log(`Fetching: ${args.url}`);
    const response = await fetchUrl(args.url, args);
    
    if (args.headers) {
      console.log('\nHTTP Headers:');
      console.log(`  Status: ${response.statusCode}`);
      for (const [key, value] of Object.entries(response.headers)) {
        if (typeof value === 'string') {
          console.log(`  ${key}: ${value}`);
        } else if (Array.isArray(value)) {
          value.forEach(v => console.log(`  ${key}: ${v}`));
        }
      }
    }
    
    let output = response.data;
    let extracted = null;
    
    if (args.extract) {
      extracted = extractReadableContent(response.data, args.url);
      output = extracted.content;
    }
    
    if (args.output) {
      fs.writeFileSync(args.output, output);
      console.log(`\nSaved to: ${args.output}`);
      
      if (extracted) {
        console.log(`Title: ${extracted.title}`);
        console.log(`Words: ${extracted.wordCount}`);
      }
    } else {
      console.log('');
      if (extracted) {
        console.log(`Title: ${extracted.title}`);
        console.log(`URL: ${extracted.url}`);
        console.log(`Words: ${extracted.wordCount}\n`);
      }
      console.log(output.substring(0, 10000));
      if (output.length > 10000) {
        console.log(`\n... (${output.length - 10000} more characters)`);
      }
    }
    
    console.log(`\nStatus: ${response.statusCode} OK`);
    console.log(`Size: ${response.data.length} bytes`);
    
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

main();