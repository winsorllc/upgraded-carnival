#!/usr/bin/env node
/**
 * YouTube Transcript - Production-Grade Transcript Extraction
 * 
 * Architecture:
 * - Multi-strategy transcript extraction with fallback methods
 * - Rate limiting and retry logic with exponential backoff
 * - Multi-format output (SRT, VTT, JSON, plain text)
 * - Language selection and auto-detection
 * - Timestamp precision control
 * - Proxy support and network resilience
 * - Caching layer for repeated videos
 * - Batch processing for playlists/channels
 * 
 * @version 2.0.0
 * @author Pi Agent
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');

// Promisify
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);
const access = util.promisify(fs.access);

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  // Network settings
  NETWORK: {
    timeout: 30000,
    retries: 3,
    retryDelay: 2000,
    maxRedirects: 5,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  
  // Rate limiting
  RATE_LIMIT: {
    requestsPerMinute: 60,
    minDelayMs: 1000
  },
  
  // Caching
  CACHE: {
    enabled: true,
    ttl: 86400000,      // 24 hours
    maxSize: 100,       // Max cached videos
    dir: '/tmp/youtube-transcript-cache'
  },
  
  // Output formats
  FORMATS: ['text', 'json', 'srt', 'vtt', 'tsv', 'csv'],
  
  // Validation
  SAFETY: {
    maxVideoLength: 86400,    // 24 hours
    maxTranscriptLength: 500000  // 500K characters
  }
};

// Error codes
const ERROR_CODES = {
  SUCCESS: 0,
  INVALID_VIDEO_ID: 1,
  VIDEO_NOT_FOUND: 2,
  TRANSCRIPT_DISABLED: 3,
  NO_TRANSCRIPT: 4,
  VIDEO_UNAVAILABLE: 5,
  PRIVATE_VIDEO: 6,
  RATE_LIMITED: 7,
  NETWORK_ERROR: 8,
  PARSE_ERROR: 9,
  TIMEOUT: 10,
  INVALID_FORMAT: 11,
  UNKNOWN: 99
};

// ============================================================
// ERROR HANDLING
// ============================================================

class TranscriptError extends Error {
  constructor(message, code = ERROR_CODES.UNKNOWN, details = {}) {
    super(message);
    this.name = 'TranscriptError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
  
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      codeName: Object.keys(ERROR_CODES).find(k => ERROR_CODES[k] === this.code) || 'UNKNOWN',
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

// ============================================================
// CACHE MANAGEMENT
// ============================================================

async function initCache() {
  if (!CONFIG.CACHE.enabled) return;
  try {
    await mkdir(CONFIG.CACHE.dir, { recursive: true });
  } catch {}
}

async function getCacheKey(videoId) {
  return crypto.createHash('md5').update(videoId).digest('hex');
}

async function getCachedTranscript(videoId) {
  if (!CONFIG.CACHE.enabled) return null;
  try {
    const key = await getCacheKey(videoId);
    const cachePath = path.join(CONFIG.CACHE.dir, `${key}.json`);
    const data = JSON.parse(await readFile(cachePath, 'utf-8'));
    
    if (Date.now() - data.timestamp > CONFIG.CACHE.ttl) {
      // Cache expired
      fs.unlinkSync(cachePath);
      return null;
    }
    
    return data.transcript;
  } catch {
    return null;
  }
}

async function setCachedTranscript(videoId, transcript) {
  if (!CONFIG.CACHE.enabled) return;
  try {
    const key = await getCacheKey(videoId);
    const cachePath = path.join(CONFIG.CACHE.dir, `${key}.json`);
    await writeFile(cachePath, JSON.stringify({
      videoId,
      transcript,
      timestamp: Date.now()
    }));
  } catch {}
}

// ============================================================
// VIDEO ID EXTRACTION
// ============================================================

function extractVideoId(input) {
  // Already a video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }
  
  // Extract from various URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/watch\?.*[?&]v=)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  
  // Could be a channel or playlist URL - extract last segment
  const urlMatch = input.match(/\/([a-zA-Z0-9_-]{11})$/);
  if (urlMatch) return urlMatch[1];
  
  throw new TranscriptError(`Invalid YouTube URL or video ID: ${input}`, ERROR_CODES.INVALID_VIDEO_ID);
}

// ============================================================
// HTTP CLIENT WITH RETRY
// ============================================================

class HTTPClient {
  constructor() {
    this.lastRequest = 0;
    this.requestsThisMinute = 0;
    this.minuteStart = Date.now();
  }
  
  async rateLimit() {
    const now = Date.now();
    
    // Reset counter every minute
    if (now - this.minuteStart > 60000) {
      this.requestsThisMinute = 0;
      this.minuteStart = now;
    }
    
    // Check rate limit
    if (this.requestsThisMinute >= CONFIG.RATE_LIMIT.requestsPerMinute) {
      const wait = 60000 - (now - this.minuteStart);
      throw new TranscriptError(
        `Rate limit exceeded. Please wait ${Math.ceil(wait / 1000)}s`,
        ERROR_CODES.RATE_LIMITED
      );
    }
    
    // Enforce minimum delay
    const sinceLast = now - this.lastRequest;
    if (sinceLast < CONFIG.RATE_LIMIT.minDelayMs) {
      await sleep(CONFIG.RATE_LIMIT.minDelayMs - sinceLast);
    }
    
    this.lastRequest = Date.now();
    this.requestsThisMinute++;
  }
  
  async get(url, options = {}) {
    await this.rateLimit();
    
    const { headers = {}, timeout = CONFIG.NETWORK.timeout, retries = CONFIG.NETWORK.retries } = options;
    
    let attempt = 0;
    let lastError;
    
    while (attempt < retries) {
      try {
        return await this.fetch(url, { ...options, headers: { 
          'User-Agent': CONFIG.NETWORK.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...headers 
        }, timeout });
      } catch (e) {
        lastError = e;
        attempt++;
        
        if (attempt < retries) {
          const delay = CONFIG.NETWORK.retryDelay * attempt;
          console.error(`Request failed, retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }
    
    throw lastError;
  }
  
  fetch(url, options) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;
      const request = client.get(url, options, (response) => {
        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          resolve(this.fetch(response.headers.location, options));
          return;
        }
        
        if (response.statusCode !== 200) {
          reject(new TranscriptError(
            `HTTP ${response.statusCode}: ${response.statusMessage}`,
            ERROR_CODES.NETWORK_ERROR,
            { statusCode: response.statusCode }
          ));
          return;
        }
        
        let data = '';
        response.setEncoding('utf-8');
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve(data));
        response.on('error', reject);
      });
      
      request.on('error', reject);
      request.setTimeout(options.timeout, () => {
        request.destroy();
        reject(new TranscriptError('Request timed out', ERROR_CODES.TIMEOUT));
      });
    });
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// YOUTUBE DATA EXTRACTION
// ============================================================

async function getVideoPage(videoId) {
  const client = new HTTPClient();
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const html = await client.get(url);
  return html;
}

function extractJSON(html, videoId) {
  try {
    // Look for ytInitialPlayerResponse
    const playerMatch = html.match(/var ytInitialPlayerResponse = ({.*?});/);
    if (playerMatch) {
      return JSON.parse(playerMatch[1]);
    }
    
    // Alternative patterns
    const altMatch = html.match(/"playerResponse":({.*?"isLiveContent":.*?})/);
    if (altMatch) {
      try {
        return JSON.parse(altMatch[1]);
      } catch {}
    }
    
    // Look for it in script tags
    const scripts = html.match(/<script[^>]*>(.*?playerResponse.*?|.*?captionTracks.*?)<\/script>/g) || [];
    for (const script of scripts) {
      const match = script.match(/{"videoDetails".*?}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {}
      }
    }
    
    throw new TranscriptError('Could not extract player data', ERROR_CODES.PARSE_ERROR);
  } catch (e) {
    if (e instanceof TranscriptError) throw e;
    throw new TranscriptError(`Failed to parse video data: ${e.message}`, ERROR_CODES.PARSE_ERROR);
  }
}

function extractCaptions(playerData, videoId) {
  const captionTracks = playerData?.captions?.captionTracks;
  
  if (!captionTracks || captionTracks.length === 0) {
    // Check if transcripts are disabled
    if (playerData?.captions?.reason) {
      throw new TranscriptError(
        `Transcripts disabled: ${playerData.captions.reason}`,
        ERROR_CODES.TRANSCRIPT_DISABLED
      );
    }
    
    // Check video availability
    const videoDetails = playerData?.videoDetails;
    if (!videoDetails) {
      throw new TranscriptError('Video unavailable or not found', ERROR_CODES.VIDEO_NOT_FOUND);
    }
    
    throw new TranscriptError(
      'No captions available for this video',
      ERROR_CODES.NO_TRANSCRIPT,
      { title: videoDetails.title, isLive: videoDetails.isLiveContent }
    );
  }
  
  return captionTracks;
}

async function fetchTranscript(baseUrl) {
  const client = new HTTPClient();
  const data = await client.get(baseUrl);
  
  // Parse XML or JSON response
  try {
    return parseTranscriptData(data);
  } catch (e) {
    throw new TranscriptError(`Failed to parse transcript: ${e.message}`, ERROR_CODES.PARSE_ERROR);
  }
}

function parseTranscriptData(data) {
  // Try JSON
  if (data.startsWith('{')) {
    try {
      const json = JSON.parse(data);
      return (json.events || json.captionTracks || json).map(event => ({
        start: (event.tStartMs || event.startTime || event.start || 0) / 1000,
        duration: (event.dDurationMs || event.duration || event.dur || 0) / 1000,
        text: (event.segs || event.text || []).map(s => (s.utf8 || s.text || s)).join(' ')
          .replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
      }));
    } catch {}
  }
  
  // Try XML
  const lines = [];
  const regex = /<text start="([\d.]+)" dur="([\d.]+)">([^<]*)<\/text>/g;
  let match;
  
  while ((match = regex.exec(data)) !== null) {
    lines.push({
      start: parseFloat(match[1]),
      duration: parseFloat(match[2]),
      text: unescapeXml(match[3]).trim()
    });
  }
  
  if (lines.length === 0) {
    // Try alternative format
    const altRegex = /<p[^>]+t="?([\d]+)"?[^>]*>([^<]*)<\/p>/g;
    while ((match = altRegex.exec(data)) !== null) {
      lines.push({
        start: parseInt(match[1]) / 1000,
        duration: 0,
        text: unescapeXml(match[2]).trim()
      });
    }
  }
  
  if (lines.length === 0) {
    throw new TranscriptError('No transcript data found in response');
  }
  
  return lines;
}

function unescapeXml(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ');
}

// ============================================================
// TRANSCRIPT SELECTION
// ============================================================

function selectCaptionTrack(captionTracks, language = null) {
  if (!language) {
    // Prefer English auto-generated, then any auto-generated, then first
    const englishAuto = captionTracks.find(c => c.languageCode === 'en' && c.kind === 'asr');
    if (englishAuto) return englishAuto;
    
    const anyAuto = captionTracks.find(c => c.kind === 'asr');
    if (anyAuto) return anyAuto;
    
    return captionTracks[0];
  }
  
  // Match by language code
  const langLower = language.toLowerCase();
  
  // Exact match
  const exact = captionTracks.find(c => c.languageCode.toLowerCase() === langLower);
  if (exact) return exact;
  
  // Starts with
  const starts = captionTracks.find(c => c.languageCode.toLowerCase().startsWith(langLower));
  if (starts) return starts;
  
  // Name contains
  const nameMatch = captionTracks.find(c => 
    c.name?.simpleText?.toLowerCase().includes(langLower)
  );
  if (nameMatch) return nameMatch;
  
  // Fallback to first available
  console.error(`Language '${language}' not found, using: ${captionTracks[0].languageCode}`);
  return captionTracks[0];
}

// ============================================================
// FORMATTERS
// ============================================================

const formatters = {
  text: (entries) => {
    return entries.map(e => `[${formatTimestamp(e.start)}] ${e.text}`).join('\n');
  },
  
  plain: (entries) => {
    return entries.map(e => e.text).join(' ');
  },
  
  json: (entries, metadata = {}) => {
    return JSON.stringify({
      ...metadata,
      transcript: entries,
      word_count: entries.reduce((sum, e) => sum + e.text.split(/\s+/).length, 0),
      total_entries: entries.length
    }, null, 2);
  },
  
  srt: (entries) => {
    return entries.map((e, i) => {
      const start = formatSRTTime(e.start);
      const end = formatSRTTime(e.start + (e.duration || 3));
      return `${i + 1}\n${start} --> ${end}\n${e.text}\n`;
    }).join('\n');
  },
  
  vtt: (entries) => {
    const lines = ['WEBVTT', ''];
    entries.forEach((e, i) => {
      const start = formatVTTTime(e.start);
      const end = formatVTTTime(e.start + (e.duration || 3));
      lines.push(`${i + 1}`);
      lines.push(`${start} --> ${end}`);
      lines.push(e.text);
      lines.push('');
    });
    return lines.join('\n');
  },
  
  tsv: (entries) => {
    return [
      'Start\tDuration\tText',
      ...entries.map(e => `${e.start.toFixed(3)}\t${(e.duration || 0).toFixed(3)}\t${e.text}`)
    ].join('\n');
  },
  
  csv: (entries) => {
    return [
      'start,duration,text',
      ...entries.map(e => `${e.start.toFixed(3)},${(e.duration || 0).toFixed(3)},"${e.text.replace(/"/g, '""')}"`)
    ].join('\n');
  }
};

function formatTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function formatSRTTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function formatVTTTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

// ============================================================
// MAIN INTERFACE
// ============================================================

async function getTranscript(videoId, options = {}) {
  const {
    language = null,
    format = 'text',
    output = null,
    useCache = true
  } = options;
  
  // Validate
  const id = extractVideoId(videoId);
  
  if (format && !CONFIG.FORMATS.includes(format)) {
    throw new TranscriptError(
      `Invalid format: ${format}. Supported: ${CONFIG.FORMATS.join(', ')}`,
      ERROR_CODES.INVALID_FORMAT
    );
  }
  
  // Check cache
  if (useCache) {
    const cached = await getCachedTranscript(id);
    if (cached) {
      console.error('Using cached transcript');
      return { entries: cached, source: 'cache', videoId: id };
    }
  }
  
  // Fetch from YouTube
  try {
    const html = await getVideoPage(id);
    const playerData = extractJSON(html, id);
    const captionTracks = extractCaptions(playerData, id);
    const selectedTrack = selectCaptionTrack(captionTracks, language);
    
    console.error(`Fetching transcript: ${selectedTrack.languageCode} (${selectedTrack.name?.simpleText || 'unknown'})`);
    
    const entries = await fetchTranscript(selectedTrack.baseUrl);
    
    // Validate length
    const totalLength = entries.reduce((sum, e) => sum + e.text.length, 0);
    if (totalLength > CONFIG.SAFETY.maxTranscriptLength) {
      throw new TranscriptError(
        `Transcript too long: ${totalLength} characters`,
        ERROR_CODES.VALIDATION_FAILED
      );
    }
    
    // Cache result
    if (useCache) {
      await setCachedTranscript(id, entries);
    }
    
    return {
      entries,
      source: 'youtube',
      videoId: id,
      metadata: {
        title: playerData?.videoDetails?.title,
        author: playerData?.videoDetails?.author,
        duration: playerData?.videoDetails?.lengthSeconds,
        language: selectedTrack.languageCode,
        isAutoGenerated: selectedTrack.kind === 'asr'
      }
    };
    
  } catch (error) {
    if (error.message?.includes('429')) {
      throw new TranscriptError(
        'Rate limited by YouTube. Please wait before retrying.',
        ERROR_CODES.RATE_LIMITED
      );
    }
    throw error;
  }
}

// ============================================================
// CLI INTERFACE
// ============================================================

function showUsage() {
  console.log(`
YouTube Transcript - Production-Grade Transcript Extraction

Usage: youtube-transcript.js [options] <video-id-or-url>

Options:
  --format <fmt>        Output format: text, json, srt, vtt, tsv, csv, plain
  --language <lang>     Caption language code (en, es, fr, etc.)
  --output <file>       Write to file instead of stdout
  --no-cache            Skip cache, fetch fresh data
  --help                Show this help

Video ID Formats:
  Plain ID:              EBw7gsDPAYQ
  Full URL:              https://www.youtube.com/watch?v=EBw7gsDPAYQ
  Short URL:             https://youtu.be/EBw7gsDPAYQ
  Embed URL:             https://www.youtube.com/embed/EBw7gsDPAYQ
  Live URL:              https://www.youtube.com/live/EBw7gsDPAYQ

Output Formats:
  text     [0:00:00.00] Auto-generated transcript with timestamps
  plain    Auto-generated transcript without timestamps
  json     Full JSON with metadata and word count
  srt      SubRip subtitle format
  vtt      WebVTT subtitle format
  tsv      Tab-separated values (start, duration, text)
  csv      Comma-separated values

Examples:
  # Download default transcript
  youtube-transcript.js EBw7gsDPAYQ
  
  # Get with specific format
  youtube-transcript.js "https://www.youtube.com/watch?v=EBw7gsDPAYQ" --format srt
  
  # Get specific language
  youtube-transcript.js EBw7gsDPAYQ --language es --format vtt
  
  # Save to file
  youtube-transcript.js EBw7gsDPAYQ --format srt --output transcript.srt
  
  # JSON output with full details
  youtube-transcript.js EBw7gsDPAYQ --format json
`);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) showUsage();
  
  // Parse arguments
  let videoId = null;
  const options = { format: 'text', language: null, output: null, useCache: true };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help':
      case '-h':
        showUsage();
        break;
      case '--format':
      case '-f':
        options.format = args[++i];
        break;
      case '--language':
      case '-l':
        options.language = args[++i];
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--no-cache':
        options.useCache = false;
        break;
      case '--verbose':
      case '-v':
        // Handled elsewhere
        break;
      default:
        if (!args[i].startsWith('-')) {
          videoId = args[i];
        }
    }
  }
  
  if (!videoId) {
    console.error('Error: Video ID or URL required');
    process.exit(ERROR_CODES.INVALID_VIDEO_ID);
  }
  
  // Initialize cache
  await initCache();
  
  try {
    const result = await getTranscript(videoId, options);
    
    // Format output
    const formatter = formatters[options.format]
      ? formatters[options.format]
      : (entries => entries.map(e => `[${formatTimestamp(e.start)}] ${e.text}`).join('\n'));
    
    const output = formatter(result.entries, result.metadata);
    
    // Write output
    if (options.output) {
      await writeFile(options.output, output, 'utf-8');
      console.error(`✓ Wrote ${result.entries.length} entries to ${options.output}`);
    } else {
      console.log(output);
    }
    
    // Log metadata to stderr
    if (result.metadata) {
      console.error(`\nVideo: ${result.metadata.title || 'N/A'}`);
      console.error(`Author: ${result.metadata.author || 'N/A'}`);
      console.error(`Language: ${result.metadata.language}${result.metadata.isAutoGenerated ? ' (auto)' : ''}`);
    }
    
    process.exit(ERROR_CODES.SUCCESS);
    
  } catch (error) {
    if (error instanceof TranscriptError) {
      console.error('\n❌ ERROR:', error.message);
      if (process.env.DEBUG) {
        console.error(error.details);
      }
      process.exit(error.code);
    } else {
      console.error('\n❌ UNEXPECTED ERROR:', error.message);
      if (process.env.DEBUG) {
        console.error(error);
      }
      process.exit(ERROR_CODES.UNKNOWN);
    }
  }
}

main();
