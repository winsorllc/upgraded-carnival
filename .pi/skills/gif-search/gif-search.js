#!/usr/bin/env node

/**
 * GIF Search Skill
 * Search for GIFs from GIPHY and Tenor APIs
 */

const https = require('https');

// Get API keys from environment
const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
const TENOR_API_KEY = process.env.TENOR_API_KEY;

async function searchGiphy(query, limit = 5) {
  return new Promise((resolve, reject) => {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const gifs = result.data.map(gif => ({
            id: gif.id,
            title: gif.title,
            url: gif.images.original.url,
            preview_url: gif.images.fixed_height.url,
            width: parseInt(gif.images.original.width),
            height: parseInt(gif.images.original.height)
          }));
          resolve(gifs);
        } catch (e) {
          reject(new Error(`GIPHY API error: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function searchTenor(query, limit = 5) {
  return new Promise((resolve, reject) => {
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=${limit}&media_filter=gif`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const gifs = result.results.map(gif => ({
            id: gif.id,
            title: gif.content_description,
            url: gif.media_formats.gif.url,
            preview_url: gif.media_formats.tinygif.url,
            width: gif.media_formats.gif.dims[0],
            height: gif.media_formats.gif.dims[1]
          }));
          resolve(gifs);
        } catch (e) {
          reject(new Error(`Tenor API error: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: gif-search.js <query> [limit] [format]');
    console.error('  query: search term');
    console.error('  limit: number of results (default: 5)');
    console.error('  format: "url" for URL-only output');
    process.exit(1);
  }
  
  const query = args[0];
  const limit = parseInt(args[1]) || 5;
  const format = args[2];
  
  if (!GIPHY_API_KEY && !TENOR_API_KEY) {
    console.error('Error: No API key found. Set GIPHY_API_KEY or TENOR_API_KEY environment variable.');
    process.exit(1);
  }
  
  try {
    let results;
    
    // Prefer GIPHY, fall back to Tenor
    if (GIPHY_API_KEY) {
      results = await searchGiphy(query, limit);
    } else {
      results = await searchTenor(query, limit);
    }
    
    if (results.length === 0) {
      console.log('No GIFs found for your search.');
      process.exit(0);
    }
    
    if (format === 'url') {
      console.log(results[0].url);
    } else {
      console.log(JSON.stringify(results, null, 2));
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
