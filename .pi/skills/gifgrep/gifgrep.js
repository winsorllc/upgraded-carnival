/**
 * Gifgrep Skill
 * Search GIF providers (GIPHY, Tenor), download and extract frames
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { URL } = require('url');

class Gifgrep {
  constructor(options = {}) {
    this.giphyApiKey = options.giphyApiKey || process.env.GIPHY_API_KEY;
    this.tenorApiKey = options.tenorApiKey || process.env.TENOR_API_KEY;
    this.outputDir = options.outputDir || '/job/tmp';
    this.limit = options.limit || 10;
  }

  /**
   * Make HTTP request
   */
  request(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ raw: data });
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Search GIPHY for GIFs
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Array} Array of GIF results
   */
  async searchGiphy(query, options = {}) {
    if (!this.giphyApiKey) {
      throw new Error('GIPHY_API_KEY not set');
    }

    const params = new URLSearchParams({
      api_key: this.giphyApiKey,
      q: query,
      limit: options.limit || this.limit,
      rating: options.rating || 'g'
    });

    const url = `https://api.giphy.com/v1/gifs/search?${params}`;
    const response = await this.request(url);

    return (response.data || []).map(gif => ({
      id: gif.id,
      title: gif.title,
      url: gif.images.original.url,
      previewUrl: gif.images.downsized_small?.url || gif.images.fixed_height.url,
      width: gif.images.original.width,
      height: gif.images.original.height,
      source: 'giphy'
    }));
  }

  /**
   * Search Tenor for GIFs
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Array} Array of GIF results
   */
  async searchTenor(query, options = {}) {
    const apiKey = this.tenorApiKey || 'demo_key'; // Tenor provides a demo key
    const params = new URLSearchParams({
      key: apiKey,
      q: query,
      limit: options.limit || this.limit,
      media_filter: 'minimal'
    });

    const url = `https://tenor.googleapis.com/v2/search?${params}`;
    const response = await this.request(url);

    return (response.results || []).map(gif => ({
      id: gif.id,
      title: gif.content_description,
      url: gif.media_formats.gif.url,
      previewUrl: gif.media_formats.tinygif.url,
      width: gif.media_formats.gif.dims[0],
      height: gif.media_formats.gif.dims[1],
      source: 'tenor'
    }));
  }

  /**
   * Search both providers and merge results
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Array} Combined GIF results
   */
  async search(query, options = {}) {
    const {
      source = 'auto', // 'auto', 'giphy', 'tenor'
      limit = this.limit
    } = options;

    let results = [];

    if (source === 'auto' || source === 'giphy') {
      try {
        const giphyResults = await this.searchGiphy(query, { limit: source === 'auto' ? Math.ceil(limit / 2) : limit });
        results = results.concat(giphyResults);
      } catch (e) {
        console.error('GIPHY search failed:', e.message);
      }
    }

    if (source === 'auto' || source === 'tenor') {
      try {
        const tenorResults = await this.searchTenor(query, { limit: source === 'auto' ? Math.ceil(limit / 2) : limit });
        results = results.concat(tenorResults);
      } catch (e) {
        console.error('Tenor search failed:', e.message);
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Download a GIF from URL
   * @param {string} url - GIF URL
   * @param {string} filename - Output filename (optional)
   * @returns {string} Path to downloaded file
   */
  async download(url, filename = null) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      
      const outputFile = filename || path.join(
        this.outputDir,
        `gif_${Date.now()}.gif`
      );

      const file = fs.createWriteStream(outputFile);
      
      client.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Follow redirect
          file.close();
          fs.unlinkSync(outputFile);
          this.download(response.headers.location, filename)
            .then(resolve)
            .catch(reject);
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(outputFile);
        });
      }).on('error', (err) => {
        fs.unlink(outputFile, () => reject(err));
      });
    });
  }

  /**
   * Extract a still frame from a GIF
   * @param {string} gifPath - Path to GIF file
   * @param {object} options - Extraction options
   * @returns {string} Path to output image
   */
  extractStill(gifPath, options = {}) {
    const {
      timestamp = '0', // Time in seconds
      format = 'png',
      output = null
    } = options;

    if (!fs.existsSync(gifPath)) {
      throw new Error(`GIF not found: ${gifPath}`);
    }

    const outputFile = output || path.join(
      this.outputDir,
      `still_${Date.now()}.${format}`
    );

    execSync(
      `ffmpeg -i "${gifPath}" -ss ${timestamp} -frames:v 1 -vsync vfr "${outputFile}"`,
      { stdio: 'pipe' }
    );

    return outputFile;
  }

  /**
   * Create a contact sheet from a GIF
   * @param {string} gifPath - Path to GIF file
   * @param {object} options - Sheet options
   * @returns {string} Path to output image
   */
  createContactSheet(gifPath, options = {}) {
    const {
      frames = 9,
      columns = 3,
      width = 100,
      output = null
    } = options;

    if (!fs.existsSync(gifPath)) {
      throw new Error(`GIF not found: ${gifPath}`);
    }

    const outputFile = output || path.join(
      this.outputDir,
      `sheet_${Date.now()}.png`
    );

    const rows = Math.ceil(frames / columns);

    execSync(
      `ffmpeg -i "${gifPath}" -vf "fps=${frames/10},scale=${width}:-1,tile=${columns}x${rows}" "${outputFile}"`,
      { stdio: 'pipe' }
    );

    return outputFile;
  }

  /**
   * Get trending GIFs from GIPHY
   * @param {object} options - Search options
   * @returns {Array} Trending GIFs
   */
  async getTrending(options = {}) {
    if (!this.giphyApiKey) {
      throw new Error('GIPHY_API_KEY not set');
    }

    const params = new URLSearchParams({
      api_key: this.giphyApiKey,
      limit: options.limit || this.limit,
      rating: options.rating || 'g'
    });

    const url = `https://api.giphy.com/v1/gifs/trending?${params}`;
    const response = await this.request(url);

    return (response.data || []).map(gif => ({
      id: gif.id,
      title: gif.title,
      url: gif.images.original.url,
      previewUrl: gif.images.downsized_small?.url || gif.images.fixed_height.url,
      width: gif.images.original.width,
      height: gif.images.original.height,
      source: 'giphy'
    }));
  }

  /**
   * Search and download top result
   * @param {string} query - Search query
   * @returns {object} Download result with metadata
   */
  async searchAndDownload(query) {
    const results = await this.search(query, { limit: 1 });
    
    if (results.length === 0) {
      return { success: false, error: 'No results found' };
    }

    const gif = results[0];
    const downloadedPath = await this.download(gif.url);

    return {
      success: true,
      gif: gif,
      path: downloadedPath
    };
  }
}

module.exports = Gifgrep;
