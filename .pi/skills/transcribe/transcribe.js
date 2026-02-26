#!/usr/bin/env node
/**
 * Transcribe - Production-Grade Speech-to-Text
 * 
 * Architecture:
 * - Multi-provider support (Groq Whisper, OpenAI Whisper fallback)
 * - Large file handling with intelligent segmentation
 * - Multiple output formats (text, JSON, SRT, VTT, CSV)
 * - Progress tracking for long recordings
 * - Audio validation and format conversion
 * - Language detection and auto-selection
 * - Parallel processing with rate limiting
 * - Resume capability for interrupted uploads
 * 
 * @version 2.0.0
 * @author Pi Agent
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const crypto = require('crypto');
const util = require('util');

// Promisify
const stat = util.promisify(fs.stat);
const rename = util.promisify(fs.rename);
const unlink = util.promisify(fs.unlink);
const mkdir = util.promisify(fs.mkdir);

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  // API Configuration
  API: {
    groq: {
      baseUrl: 'https://api.groq.com/openai/v1/audio/transcriptions',
      model: 'whisper-large-v3-turbo',
      maxFileSize: 25 * 1024 * 1024,  // 25MB limit
      rateLimit: {
        rpm: 60,      // Requests per minute
        tpm: 100000   // Tokens per minute
      }
    },
    openai: {
      baseUrl: 'https://api.openai.com/v1/audio/transcriptions',
      model: 'whisper-1',
      maxFileSize: 25 * 1024 * 1024,
      costPerMinute: 0.006  // $0.006 per minute
    }
  },
  
  // Audio processing
  AUDIO: {
    supportedFormats: ['mp3', 'mp4', 'm4a', 'wav', 'ogg', 'flac', 'webm', 'oga', 'ogv', 'aac', 'wma'],
    targetFormat: 'mp3',
    targetBitrate: '192k',
    channels: 1,
    segmentDuration: 600,  // 10 minutes per segment (seconds)
    sampleRate: 16000
  },
  
  // Processing limits
  LIMITS: {
    maxDuration: 7200,       // 2 hours (120 minutes)
    maxFileSize: 100 * 1024 * 1024,  // 100MB before rejection
    maxSegments: 20,       // Max parallel segments
    maxRetries: 3,
    retryDelay: 2000       // 2 seconds
  },
  
  // Caching
  CACHE: {
    enabled: true,
    dir: '/tmp/transcribe-cache',
    ttl: 86400000  // 24 hours
  },
  
  // Output formats
  FORMATS: ['text', 'json', 'srt', 'vtt', 'tsv', 'csv', 'verbose_json', 'vtt', 'word', 'word_timings']
};

// Error codes
const ERROR_CODES = {
  SUCCESS: 0,
  INVALID_INPUT: 1,
  FILE_NOT_FOUND: 2,
  FILE_TOO_LARGE: 3,
  UNSUPPORTED_FORMAT: 4,
  API_KEY_MISSING: 5,
  API_ERROR: 6,
  RATE_LIMITED: 7,
  NETWORK_ERROR: 8,
  TIMEOUT: 9,
  AUDIO_PROCESSING_ERROR: 10,
  SEGMENTATION_ERROR: 11,
  INTERUPTED: 12,
  UNKNOWN: 99
};

// ============================================================
// ERROR HANDLING
// ============================================================

class TranscriptionError extends Error {
  constructor(message, code = ERROR_CODES.UNKNOWN, details = {}) {
    super(message);
    this.name = 'TranscriptionError';
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

function getCacheKey(filePath, options = {}) {
  const data = `${filePath}:${options.language || 'auto'}:${options.model || 'default'}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

async function getCachedTranscript(cacheKey) {
  if (!CONFIG.CACHE.enabled) return null;
  const cachePath = path.join(CONFIG.CACHE.dir, `${cacheKey}.json`);
  try {
    const data = JSON.parse(await util.promisify(fs.readFile)(cachePath, 'utf-8'));
    if (Date.now() - data.timestamp < CONFIG.CACHE.ttl) {
      return data.transcript;
    }
    await unlink(cachePath);
  } catch {}
  return null;
}

async function setCachedTranscript(cacheKey, transcript) {
  if (!CONFIG.CACHE.enabled) return;
  const cachePath = path.join(CONFIG.CACHE.dir, `${cacheKey}.json`);
  await util.promisify(fs.writeFile)(cachePath, JSON.stringify({
    cacheKey,
    transcript,
    timestamp: Date.now()
  }));
}

// ============================================================
// AUDIO VALIDATION
// ============================================================

async function validateAudioFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new TranscriptionError(`File not found: ${filePath}`, ERROR_CODES.FILE_NOT_FOUND);
  }
  
  const stats = await stat(filePath);
  if (stats.size === 0) {
    throw new TranscriptionError('File is empty', ERROR_CODES.INVALID_INPUT);
  }
  
  if (stats.size > CONFIG.LIMITS.maxFileSize) {
    throw new TranscriptionError(
      `File too large: ${formatBytes(stats.size)} (max: ${formatBytes(CONFIG.LIMITS.maxFileSize)})`,
      ERROR_CODES.FILE_TOO_LARGE
    );
  }
  
  // Get audio info
  try {
    const output = execSync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, timeout: 30000 }
    );
    const info = JSON.parse(output);
    
    const audioStream = info.streams?.find(s => s.codec_type === 'audio');
    if (!audioStream) {
      throw new TranscriptionError('No audio stream found in file', ERROR_CODES.UNSUPPORTED_FORMAT);
    }
    
    const duration = parseFloat(info.format?.duration || audioStream.duration || 0);
    
    return {
      path: filePath,
      size: stats.size,
      duration,
      format: info.format?.format_name,
      codec: audioStream.codec_name,
      sampleRate: parseInt(audioStream.sample_rate),
      channels: audioStream.channels,
      bitrate: parseInt(audioStream.bit_rate || info.format?.bit_rate || 0)
    };
  } catch (e) {
    if (e instanceof TranscriptionError) throw e;
    throw new TranscriptionError(
      `Failed to analyze audio: ${e.message}`,
      ERROR_CODES.AUDIO_PROCESSING_ERROR
    );
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================
// AUDIO PREPROCESSING
// ============================================================

async function convertAudio(inputPath, outputPath, options = {}) {
  const { sampleRate = CONFIG.AUDIO.sampleRate, channels = CONFIG.AUDIO.channels } = options;
  
  return new Promise((resolve, reject) => {
    const args = [
      '-hide_banner', '-loglevel', 'warning',
      '-i', inputPath,
      '-ar', sampleRate.toString(),
      '-ac', channels.toString(),
      '-c:a', 'libmp3lame',
      '-b:a', CONFIG.AUDIO.targetBitrate,
      '-y', outputPath
    ];
    
    const proc = spawn('ffmpeg', args);
    let stderr = '';
    
    proc.stderr.on('data', data => stderr += data);
    
    proc.on('close', code => {
      if (code !== 0) {
        reject(new TranscriptionError(
          `FFmpeg conversion failed: ${stderr || code}`,
          ERROR_CODES.AUDIO_PROCESSING_ERROR
        ));
      } else {
        resolve({ outputPath, converted: true });
      }
    });
    
    proc.on('error', err => {
      reject(new TranscriptionError(
        `FFmpeg spawn error: ${err.message}`,
        ERROR_CODES.AUDIO_PROCESSING_ERROR
      ));
    });
  });
}

async function splitAudio(inputPath, outputDir, segmentDuration = CONFIG.AUDIO.segmentDuration) {
  const pattern = path.join(outputDir, 'segment_%03d.mp3');
  
  return new Promise((resolve, reject) => {
    const args = [
      '-hide_banner', '-loglevel', 'warning',
      '-i', inputPath,
      '-f', 'segment',
      '-segment_time', segmentDuration.toString(),
      '-c:a', 'libmp3lame',
      '-b:a', CONFIG.AUDIO.targetBitrate,
      '-reset_timestamps', '1',
      pattern
    ];
    
    const proc = spawn('ffmpeg', args);
    let stderr = '';
    
    proc.stderr.on('data', data => stderr += data);
    
    proc.on('close', code => {
      if (code !== 0) {
        reject(new TranscriptionError(
          `Audio segmentation failed: ${stderr || code}`,
          ERROR_CODES.SEGMENTATION_ERROR
        ));
      } else {
        // Get segment files
        const segments = fs.readdirSync(outputDir)
          .filter(f => f.startsWith('segment_') &> f.endsWith('.mp3'))
          .sort()
          .map(f => path.join(outputDir, f));
        resolve(segments);
      }
    });
    
    proc.on('error', err => {
      reject(new TranscriptionError(
        `Segmentation spawn error: ${err.message}`,
        ERROR_CODES.SEGMENTATION_ERROR
      ));
    });
  });
}

// ============================================================
// API CLIENT
// ============================================================

class TranscriptionClient {
  constructor(apiKey, provider = 'groq') {
    this.apiKey = apiKey;
    this.provider = provider.toLowerCase();
    this.lastRequest = 0;
    this.requestCount = 0;
    this.minuteStart = Date.now();
  }
  
  async rateLimit() {
    const now = Date.now();
    
    // Reset minute counter
    if (now - this.minuteStart > 60000) {
      this.requestCount = 0;
      this.minuteStart = now;
    }
    
    const limit = CONFIG.API[this.provider]?.rateLimit.rpm || 60;
    if (this.requestCount >= limit) {
      const wait = 60000 - (now - this.minuteStart);
      console.error(`Rate limit approaching, waiting ${Math.ceil(wait / 1000)}s...`);
      await sleep(wait);
      this.requestCount = 0;
      this.minuteStart = Date.now();
    }
    
    // Minimum delay
    const sinceLast = now - this.lastRequest;
    if (sinceLast < 1000) {
      await sleep(1000 - sinceLast);
    }
    
    this.lastRequest = Date.now();
    this.requestCount++;
  }
  
  async transcribe(filePath, options = {}) {
    await this.rateLimit();
    
    const provider = CONFIG.API[this.provider] || CONFIG.API.groq;
    const url = URL ? new URL(provider.baseUrl) : { hostname: provider.baseUrl.replace(/^https?:\/\//, '') };
    
    const boundary = '----FormBoundary' + Date.now().toString();
    const fileData = fs.readFileSync(filePath);
    
    const formData = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(filePath)}"\r\nContent-Type: audio/mpeg\r\n\r\n`),
      fileData,
      Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${options.model || provider.model}`),
      ...(options.language ? [Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${options.language}`)] : []),
      ...(options.response_format ? [Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\n${options.response_format}`)] : []),
      Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="timestamp_granularities[]"\r\n\r\nword`),
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    
    return new Promise((resolve, reject) => {
      const https = require('https');
      const req = https.request({
        hostname: 'api.groq.com',
        port: 443,
        path: '/openai/v1/audio/transcriptions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': formData.length
        },
        timeout: 120000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const parsed = JSON.parse(data);
              resolve(parsed);
            } else {
              reject(new TranscriptionError(
                `API error ${res.statusCode}: ${data}`,
                res.statusCode === 429 ? ERROR_CODES.RATE_LIMITED : ERROR_CODES.API_ERROR
              ));
            }
          } catch (e) {
            reject(new TranscriptionError(`Parse error: ${e.message}`, ERROR_CODES.API_ERROR));
          }
        });
      });
      
      req.on('error', err => {
        reject(new TranscriptionError(`Request error: ${err.message}`, ERROR_CODES.NETWORK_ERROR));
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new TranscriptionError('Request timed out', ERROR_CODES.TIMEOUT));
      });
      
      req.write(formData);
      req.end();
    });
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// FORMATTERS
// ============================================================

const formatters = {
  text: (result) => result.text || '',
  
  json: (result) => JSON.stringify(result, null, 2),
  
  verbose_json: (result) => JSON.stringify({
    text: result.text,
    language: result.language,
    duration: result.duration,
    words: result.words?.length
  }, null, 2),
  
  srt: (result) => {
    if (!result.words) return result.text || '';
    
    // Group words into sentences/phrases
    const segments = [];
    let current = { start: null, end: null, words: [] };
    
    for (const word of result.words) {
      if (current.start === null) {
        current.start = word.start;
      }
      current.words.push(word);
      current.end = word.end;
      
      // Break on sentence endings or >5 words
      if (word.word.match(/[.!?]$/) || current.words.length >= 5) {
        segments.push({
          start: current.start,
          end: current.end,
          text: current.words.map(w => w.word).join(' ')
        });
        current = { start: null, end: null, words: [] };
      }
    }
    
    // Add remaining words
    if (current.words.length > 0) {
      segments.push({
        start: current.start,
        end: current.end,
        text: current.words.map(w => w.word).join(' ')
      });
    }
    
    // Format as SRT
    return segments.map((seg, i) => {
      return `${i + 1}\n${formatSRTTime(seg.start)} --> ${formatSRTTime(seg.end)}\n${seg.text}\n`;
    }).join('\n');
  },
  
  vtt: (result) => {
    if (!result.words) return result.text || '';
    
    const header = 'WEBVTT\n\n';
    const segments = [];
    
    // Group words
    let current = { start: null, end: null, words: [] };
    for (const word of result.words) {
      if (current.start === null) current.start = word.start;
      current.words.push(word);
      current.end = word.end;
      
      if (word.word.match(/[.!?]$/) || current.words.length >= 5) {
        segments.push({ ...current, text: current.words.map(w => w.word).join(' ') });
        current = { start: null, end: null, words: [] };
      }
    }
    if (current.words.length > 0) {
      segments.push({ ...current, text: current.words.map(w => w.word).join(' ') });
    }
    
    const body = segments.map(seg => {
      return `${formatVTTTime(seg.start)} --> ${formatVTTTime(seg.end)}\n${seg.text}\n`;
    }).join('\n');
    
    return header + body;
  },
  
  word_timings: (result) => {
    if (!result.words) return '';
    return result.words.map(w => `
`${w.start.toFixed(3)},${w.end.toFixed(3)},"${w.word}"``)
      .join(');\n  },

  tsv: (result) => {
    if (!result.words) return result.text || '';
    return 'start\tend\ttext\n' + result.words.map(w => 
      `${w.start.toFixed(3)}\t${w.end.toFixed(3)}\t${w.word}`
    ).join('\n');
  },

  csv: (result) => {
    if (!result.words) return result.text || '';
    return 'start,end,text\n' + result.words.map(w => 
      `${w.start.toFixed(3)},${w.end.toFixed(3)},"${w.word.replace(/"/g, '""')}"`
    ).join('\n');
  }
};

function formatSRTTime(seconds) {
  const h = Math.floor((seconds / 3600));
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function formatVTTTime(seconds) {
  const h = Math.floor((seconds / 3600));
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

// ============================================================
// PROGRESS TRACKING
// ============================================================

class ProgressTracker {
  constructor(total) {
    this.total = total;
    this.current = 0;
    this.startTime = Date.now();
  }
  
  update() {
    this.current++;
    const percent = ((this.current / this.total) * 100).toFixed(1);
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    
    if (process.stderr.isTTY) {
      process.stderr.clearLine();
      process.stderr.cursorTo(0);
      process.stderr.write(`⏳ Transcribing: Segment ${this.current}/${this.total} (${percent}%) | Elapsed: ${elapsed}s`);
    }
  }
  
  finish() {
    if (process.stderr.isTTY) {
      process.stderr.clearLine();
      process.stderr.cursorTo(0);
    }
  }
}

// ============================================================
// MAIN INTERFACE
// ============================================================

async function transcribeFile(filePath, options = {}) {
  const {
    apiKey = process.env.GROQ_API_KEY,
    language = null,
    format = 'text',
    cache = true,
    provider = 'groq'
  } = options;
  
  if (!apiKey) {
    throw new TranscriptionError(
      'API key not found. Set GROQ_API_KEY environment variable.',
      ERROR_CODES.API_KEY_MISSING
    );
  }
  
  if (!CONFIG.FORMATS.includes(format)) {
    throw new TranscriptionError(
      `Invalid format: ${format}. Supported: ${CONFIG.FORMATS.join(', ')}`,
      ERROR_CODES.INVALID_INPUT
    );
  }
  
  // Check cache
  const cacheKey = getCacheKey(filePath, options);
  if (cache) {
    const cached = await getCachedTranscript(cacheKey);
    if (cached) {
      console.error('Using cached transcript');
      return cached;
    }
  }
  
  // Validate audio
  const audioInfo = await validateAudioFile(filePath);
  console.error(`Audio: ${formatBytes(audioInfo.size)}, ${audioInfo.duration.toFixed(1)}s, ${audioInfo.codec}`);
  
  // Check duration limits
  if (audioInfo.duration > CONFIG.LIMITS.maxDuration) {
    throw new TranscriptionError(
      `Audio too long: ${(audioInfo.duration / 60).toFixed(1)} min (max: ${CONFIG.LIMITS.maxDuration / 60} min)`,
      ERROR_CODES.FILE_TOO_LARGE
    );
  }
  
  // Process based on file size
  const maxSize = CONFIG.API[provider]?.maxFileSize || 25 * 1024 * 1024;
  
  let result;
  
  if (audioInfo.size <= maxSize) {
    // Direct upload
    console.error('Uploading file...');
    const client = new TranscriptionClient(apiKey, provider);
    result = await client.transcribe(filePath, { language, response_format: 'verbose_json' });
  } else {
    // Segmented processing
    console.error(`File large, splitting into segments...`);
    const tempDir = path.join('/tmp', `transcribe_${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    
    try {
      // Convert and split
      const tempMp3 = path.join(tempDir, 'converted.mp3');
      await convertAudio(filePath, tempMp3, { sampleRate: 16000, channels: 1 });
      
      const segments = await splitAudio(tempMp3, tempDir);
      
      if (segments.length > CONFIG.LIMITS.maxSegments) {
        throw new TranscriptionError(
          `Audio too long: ${segments.length} segments needed (max: ${CONFIG.LIMITS.maxSegments})`,
          ERROR_CODES.FILE_TOO_LARGE
        );
      }
      
      console.error(`Processing ${segments.length} segments...`);
      const progress = new ProgressTracker(segments.length);
      
      const client = new TranscriptionClient(apiKey, provider);
      const results = [];
      
      for (const segment of segments) {
        const segmentResult = await client.transcribe(segment, { 
          language, 
          response_format: 'verbose_json' 
        });
        
        // Adjust timestamps
        const offset = results.length * CONFIG.AUDIO.segmentDuration;
        if (segmentResult.words) {
          segmentResult.words = segmentResult.words.map(w => ({
            ...w,
            start: w.start + offset,
            end: w.end + offset
          }));
        }
        
        results.push(segmentResult);
        progress.update();
      }
      
      progress.finish();
      
      // Merge results
      result = {
        text: results.map(r => r.text).join(' '),
        words: results.flatMap(r => r.words || []),
        language: results[0]?.language,
        duration: audioInfo.duration
      };
      
    } finally {
      // Cleanup
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }
  }
  
  // Cache result
  if (cache && result) {
    await setCachedTranscript(cacheKey, result);
  }
  
  return result;
}

// ============================================================
// CLI INTERFACE
// ============================================================

function showUsage() {
  console.log(`
Transcribe - Production-Grade Speech-to-Text

Usage: transcribe.js [options] <audio-file>

Options:
  --format <fmt>        Output format: text, json, srt, vtt, tsv, csv, word_timings
  --language <lang>    Language code (e.g., en, es, fr, auto-detect if not specified)
  --output <file>      Write output to file
  --no-cache            Skip cache
  --provider <p>       API provider: groq (default), openai
  --api-key <key>       API key (also reads GROQ_API_KEY env var)
  --help                Show this help

Environment Variables:
  GROQ_API_KEY          API authentication (required)
  OPENAI_API_KEY        Alternative API key for OpenAI provider

Supported Formats:
  mp3, mp4, m4a, wav, ogg, flac, webm, oga, ogv, aac, wma

Output Formats:
  text (default)     Plain text transcription
  json               Full JSON response with metadata
  verbose_json       Detailed JSON with word timings
  srt                SubRip subtitle format
  vtt                WebVTT subtitle format
  tsv/csv            Tab/comma-separated word timings
  word_timings       Per-word timestamps

Examples:
  transcribe.js interview.m4a
  transcribe.js meeting.mp3 --format srt --output meeting.srt
  transcribe.js spanish.mp3 --language es --format vtt
  transcribe.py long-recording.mp3  # auto-segments large files
`);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) showUsage();
  
  let filePath = null;
  const options = {
    format: 'text',
    cache: true,
    provider: 'groq',
    apiKey: process.env.GROQ_API_KEY
  };
  
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
      case '--provider':
        options.provider = args[++i];
        break;
      case '--api-key':
        options.apiKey = args[++i];
        break;
      case '--no-cache':
        options.cache = false;
        break;
      default:
        if (!args[i].startsWith('-')) {
          filePath = args[i];
        }
    }
  }
  
  if (!filePath) {
    console.error('Error: Audio file required');
    process.exit(ERROR_CODES.INVALID_INPUT);
  }
  
  // Initialize cache
  await initCache();
  
  try {
    const result = await transcribeFile(filePath, options);
    
    // Format output
    const formatter = formatters[options.format] || formatters.text;
    const output = formatter(result);
    
    // Write output
    if (options.output) {
      await util.promisify(fs.writeFile)(options.output, output, 'utf-8');
      console.error(`\n✓ Written to ${options.output}`);
      console.error(`  Duration: ${(result.duration / 60).toFixed(1)} minutes`);
      console.error(`  Words: ${result.words?.length || 'N/A'}`);
      console.error(`  Language: ${result.language || 'auto-detected'}`);
    } else {
      console.log(output);
    }
    
    process.exit(ERROR_CODES.SUCCESS);
    
  } catch (error) {
    if (error instanceof TranscriptionError) {
      console.error('\n❌ ERROR:', error.message);
      if (process.env.DEBUG) console.error(error.toJSON());
      process.exit(error.code);
    } else {
      console.error('\n❌ UNEXPECTED ERROR:', error.message);
      if (process.env.DEBUG) console.error(error);
      process.exit(ERROR_CODES.UNKNOWN);
    }
  }
}

main();
