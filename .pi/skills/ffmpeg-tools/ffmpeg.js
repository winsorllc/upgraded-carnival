#!/usr/bin/env node
/**
 * FFmpeg-Tools - Production-Grade Media Processing
 * 
 * Architecture:
 * - Modular command structure with standardized error handling
 * - Progress tracking with real-time updates
 * - Comprehensive input validation
 * - Signal handling for graceful interruption
 * - Disk space verification before operations
 * 
 * @version 2.0.0
 * @author Pi Agent
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');

// Promisify utilities
const stat = util.promisify(fs.stat);
const mkdir = util.promisify(fs.mkdir);
const unlink = util.promisify(fs.unlink);
const access = util.promisify(fs.access);

// ============================================================
// CONFIGURATION & CONSTANTS
// ============================================================

const CONFIG = {
  // FFmpeg quality presets (CRF values)
  QUALITY: {
    low: { crf: 28, preset: 'ultrafast', bitrate: '800k' },
    medium: { crf: 23, preset: 'fast', bitrate: '2000k' },
    high: { crf: 18, preset: 'slow', bitrate: '5000k' },
    lossless: { crf: 0, preset: 'veryslow', bitrate: 'unlimited' }
  },
  
  // Format codecs
  CODECS: {
    mp4: { video: 'libx264', audio: 'aac', container: 'mp4' },
    webm: { video: 'libvpx-vp9', audio: 'libopus', container: 'webm' },
    mp3: { audio: 'libmp3lame', container: 'mp3' },
    ogg: { audio: 'libvorbis', container: 'ogg' },
    aac: { audio: 'aac', container: 'm4a' },
    wav: { audio: 'pcm_s16le', container: 'wav' },
    flac: { audio: 'flac', container: 'flac' },
    mov: { video: 'libx264', audio: 'aac', container: 'mov' },
    mkv: { video: 'libx264', audio: 'aac', container: 'mkv' },
    avi: { video: 'libx264', audio: 'aac', container: 'avi' }
  },
  
  // Safety limits
  SAFETY: {
    minFreeSpaceMB: 100,  // Minimum 100MB free
    maxInputSizeGB: 10,    // Max 10GB input
    maxOutputSizeGB: 50,   // Max 50GB output
    maxDurationHours: 24,  // Max 24 hours duration
    timeoutSeconds: 7200   // 2 hour timeout
  },
  
  // Progress update interval (ms)
  PROGRESS_INTERVAL: 500
};

// Error codes
const ERROR_CODES = {
  SUCCESS: 0,
  INVALID_INPUT: 1,
  FILE_NOT_FOUND: 2,
  PERMISSION_DENIED: 3,
  DISK_FULL: 4,
  INVALID_FORMAT: 5,
  FFMPEG_ERROR: 6,
  TIMEOUT: 7,
  INTERRUPTED: 8,
  VALIDATION_FAILED: 9,
  UNKNOWN: 99
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format duration to HH:MM:SS
 */
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Parse time string (HH:MM:SS or seconds)
 */
function parseTime(timeStr) {
  if (typeof timeStr === 'number') return timeStr;
  if (!isNaN(parseFloat(timeStr))) return parseFloat(timeStr);
  
  const parts = timeStr.split(':').map(Number).reverse();
  let seconds = 0;
  if (parts[0]) seconds += parts[0];
  if (parts[1]) seconds += parts[1] * 60;
  if (parts[2]) seconds += parts[2] * 3600;
  return seconds;
}

/**
 * Generate unique temporary file path
 */
function getTempPath(prefix = 'tmp', ext = '') {
  const hash = crypto.randomBytes(8).toString('hex');
  return path.join('/tmp', `${prefix}_${hash}${ext ? '.' + ext : ''}`);
}

/**
 * Check if FFmpeg is available
 */
function checkFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Check available disk space
 */
async function checkDiskSpace(filePath) {
  try {
    const dir = path.dirname(path.resolve(filePath));
    const stats = execSync(`df -m "${dir}" | tail -1`, { encoding: 'utf-8' });
    const parts = stats.trim().split(/\s+/);
    const availableMB = parseInt(parts[3]);
    return {
      availableMB,
      sufficient: availableMB >= CONFIG.SAFETY.minFreeSpaceMB
    };
  } catch (e) {
    return { availableMB: Infinity, sufficient: true }; // Assume OK if we can't check
  }
}

// ============================================================
// ERROR HANDLING
// ============================================================

class FFmpegError extends Error {
  constructor(message, code = ERROR_CODES.UNKNOWN, details = {}) {
    super(message);
    this.name = 'FFmpegError';
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
// PROGRESS TRACKING
// ============================================================

class ProgressTracker {
  constructor(duration = null, operation = 'Processing') {
    this.operation = operation;
    this.duration = duration;
    this.startTime = Date.now();
    this.lastUpdate = 0;
    this.currentFrame = 0;
    this.fps = 0;
    this.percent = 0;
  }
  
  update(frame, fps, timeMs) {
    const now = Date.now();
    this.currentFrame = frame;
    this.fps = fps;
    
    if (this.duration) {
      this.percent = Math.min((timeMs / 1000) / this.duration * 100, 100);
    }
    
    // Throttle output (every CONFIG.PROGRESS_INTERVAL ms)
    if (now - this.lastUpdate < CONFIG.PROGRESS_INTERVAL) return;
    this.lastUpdate = now;
    
    const elapsed = (now - this.startTime) / 1000;
    const eta = this.percent > 0 ? elapsed / (this.percent / 100) - elapsed : null;
    
    const progress = {
      operation: this.operation,
      frame: this.currentFrame,
      fps: this.fps.toFixed(1),
      percent: this.percent.toFixed(1),
      elapsed: formatDuration(elapsed),
      eta: eta ? formatDuration(eta) : 'N/A'
    };
    
    // Print progress on stderr for non-interactive use
    if (process.stderr.isTTY) {
      process.stderr.clearLine();
      process.stderr.cursorTo(0);
      process.stderr.write(
        `⏳ ${progress.operation}: ${progress.percent}% | ` +
        `Frame ${progress.frame}@${progress.fps}fps | ` +
        `Elapsed: ${progress.elapsed} | ETA: ${progress.eta}`
      );
    }
  }
  
  finish() {
    if (process.stderr.isTTY) {
      process.stderr.clearLine();
      process.stderr.cursorTo(0);
    }
    const elapsed = (Date.now() - this.startTime) / 1000;
    return {
      frames: this.currentFrame,
      fps: this.fps,
      duration: formatDuration(elapsed)
    };
  }
}

// ============================================================
// MEDIA INFO
// ============================================================

async function getMediaInfo(inputFile) {
  if (!fs.existsSync(inputFile)) {
    throw new FFmpegError(`File not found: ${inputFile}`, ERROR_CODES.FILE_NOT_FOUND);
  }
  
  try {
    const output = execSync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${inputFile}"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    return JSON.parse(output);
  } catch (e) {
    throw new FFmpegError(`Failed to probe media: ${e.message}`, ERROR_CODES.FFMPEG_ERROR);
  }
}

async function validateMediaFile(inputFile) {
  const stats = await stat(inputFile);
  const sizeGB = stats.size / (1024 ** 3);
  
  if (sizeGB > CONFIG.SAFETY.maxInputSizeGB) {
    throw new FFmpegError(
      `File too large: ${sizeGB.toFixed(2)}GB (max: ${CONFIG.SAFETY.maxInputSizeGB}GB)`,
      ERROR_CODES.VALIDATION_FAILED
    );
  }
  
  const info = await getMediaInfo(inputFile);
  const duration = parseFloat(info.format?.duration || 0);
  
  if (duration > CONFIG.SAFETY.maxDurationHours * 3600) {
    throw new FFmpegError(
      `Duration too long: ${formatDuration(duration)} (max: ${CONFIG.SAFETY.maxDurationHours} hours)`,
      ERROR_CODES.VALIDATION_FAILED
    );
  }
  
  return { stats, info, duration };
}

// ============================================================
// CORE FFMPEG EXECUTOR
// ============================================================

async function runFFmpeg(args, options = {}) {
  const {
    duration = null,
    operation = 'Processing',
    onProgress = null,
    timeout = CONFIG.SAFETY.timeoutSeconds * 1000
  } = options;
  
  return new Promise((resolve, reject) => {
    const tracker = new ProgressTracker(duration, operation);
    const ffmpeg = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'info', '-stats', ...args]);
    
    let stderr = '';
    let killed = false;
    let timeoutId;
    
    // Set timeout
    timeoutId = setTimeout(() => {
      killed = true;
      ffmpeg.kill('SIGTERM');
      reject(new FFmpegError('Operation timed out', ERROR_CODES.TIMEOUT, { timeout }));
    }, timeout);
    
    // Handle stderr for progress
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
      
      // Parse progress from FFmpeg output
      const frameMatch = data.toString().match(/frame=\s*(\d+)/);
      const fpsMatch = data.toString().match(/fps=\s*([\d.]+)/);
      const timeMatch = data.toString().match(/time=([\d:.]+)/);
      
      if (frameMatch && timeMatch) {
        const frame = parseInt(frameMatch[1]);
        const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 0;
        const timeParts = timeMatch[1].split(':').map(Number);
        const timeMs = (timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2]) * 1000;
        
        tracker.update(frame, fps, timeMs);
        if (onProgress) onProgress({ frame, fps, time: timeMs / 1000 });
      }
    });
    
    // Handle process completion
    ffmpeg.on('close', (code) => {
      clearTimeout(timeoutId);
      
      if (killed) return; // Already handled
      
      if (code === 0) {
        const stats = tracker.finish();
        resolve({ success: true, stats });
      } else {
        const errorMsg = stderr.split('\n').filter(l => l.includes('Error')).pop() || 'FFmpeg failed';
        reject(new FFmpegError(
          errorMsg,
          ERROR_CODES.FFMPEG_ERROR,
          { exitCode: code, stderr: stderr.slice(-500) }
        ));
      }
    });
    
    // Handle spawn errors
    ffmpeg.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(new FFmpegError(`FFmpeg spawn error: ${err.message}`, ERROR_CODES.FFMPEG_ERROR));
    });
    
    // Handle SIGINT gracefully
    const handleSigint = () => {
      killed = true;
      ffmpeg.stdin.end();
      ffmpeg.kill('SIGTERM');
      process.removeListener('SIGINT', handleSigint);
      reject(new FFmpegError('Operation interrupted by user', ERROR_CODES.INTERRUPTED));
    };
    process.on('SIGINT', handleSigint);
  });
}

// ============================================================
// COMMAND IMPLEMENTATIONS
// ============================================================

/**
 * Convert media to different format
 */
async function convert(inputFile, outputFile, options = {}) {
  const { quality = 'high', format = null, codec = null, extraArgs = [] } = options;
  
  // Validate
  const { info, duration } = await validateMediaFile(inputFile);
  
  // Determine output format
  const outputFormat = format || path.extname(outputFile).slice(1) || 'mp4';
  
  if (!CONFIG.CODECS[outputFormat]) {
    throw new FFmpegError(`Unsupported format: ${outputFormat}`, ERROR_CODES.INVALID_FORMAT);
  }
  
  // Check disk space
  const diskCheck = await checkDiskSpace(outputFile);
  if (!diskCheck.sufficient) {
    throw new FFmpegError(
      `Insufficient disk space: ${diskCheck.availableMB}MB available`,
      ERROR_CODES.DISK_FULL
    );
  }
  
  // Build argument list
  const args = ['-i', inputFile];
  
  // Apply quality settings
  const qualitySettings = CONFIG.QUALITY[quality] || CONFIG.QUALITY.high;
  
  const codecs = CONFIG.CODECS[outputFormat];
  if (codecs.video) {
    args.push('-c:v', codec || codecs.video);
    if (qualitySettings.crf) args.push('-crf', qualitySettings.crf.toString());
    if (qualitySettings.preset) args.push('-preset', qualitySettings.preset);
  }
  if (codecs.audio) {
    args.push('-c:a', codecs.audio);
  }
  
  args.push(...extraArgs);
  args.push('-y', outputFile);
  
  // Execute
  await runFFmpeg(args, { duration, operation: 'Converting' });
  
  // Verify output
  if (!fs.existsSync(outputFile)) {
    throw new FFmpegError('Output file was not created', ERROR_CODES.FFMPEG_ERROR);
  }
  
  const outputStats = fs.statSync(outputFile);
  return {
    input: { path: inputFile, duration, format: info.format?.format_name },
    output: { path: outputFile, size: formatBytes(outputStats.size), format: outputFormat },
    quality,
    duration: formatDuration(duration)
  };
}

/**
 * Compress video to target size or quality
 */
async function compress(inputFile, outputFile, options = {}) {
  const { quality = 'medium', targetSize = null } = options;
  
  const { info, duration } = await validateMediaFile(inputFile);
  
  // Calculate bitrate for target size if specified
  let targetBitrate = null;
  if (targetSize) {
    const sizeMatch = targetSize.match(/(\d+(?:\.\d+)?)\s*(MB|GB|KB)?/i);
    if (!sizeMatch) {
      throw new FFmpegError(`Invalid size format: ${targetSize}`, ERROR_CODES.INVALID_FORMAT);
    }
    
    const size = parseFloat(sizeMatch[1]);
    const unit = (sizeMatch[2] || 'MB').toLowerCase();
    const multipliers = { kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };
    const bytes = size * (multipliers[unit] || multipliers.mb);
    
    // Calculate bitrate: (target_bytes * 8 * 0.95) / duration
    targetBitrate = Math.floor((bytes * 8 * 0.92) / duration / 1000); // kbps
    
    if (targetBitrate < 100) {
      throw new FFmpegError(
        `Target size ${targetSize} is too small for ${formatDuration(duration)} video`,
        ERROR_CODES.VALIDATION_FAILED
      );
    }
  }
  
  const args = ['-i', inputFile];
  
  if (targetBitrate) {
    args.push('-c:v', 'libx264');
    args.push('-b:v', `${targetBitrate}k`);
    args.push('-bufsize', `${Math.floor(targetBitrate * 2)}k`);
    args.push('-maxrate', `${Math.floor(targetBitrate * 1.5)}k`);
  } else {
    const settings = CONFIG.QUALITY[quality] || CONFIG.QUALITY.medium;
    args.push('-c:v', 'libx264');
    args.push('-crf', settings.crf.toString());
    args.push('-preset', settings.preset);
  }
  
  args.push('-c:a', 'aac', '-b:a', '128k');
  args.push('-y', outputFile);
  
  await runFFmpeg(args, { duration, operation: 'Compressing' });
  
  const inputSize = fs.statSync(inputFile).size;
  const outputSize = fs.statSync(outputFile).size;
  const ratio = inputSize / outputSize;
  
  return {
    input: { path: inputFile, size: formatBytes(inputSize) },
    output: { path: outputFile, size: formatBytes(outputSize) },
    ratio: `${ratio.toFixed(2)}:1`,
    compression: `${((1 - outputSize/inputSize) * 100).toFixed(1)}%`
  };
}

/**
 * Trim video segment
 */
async function trim(inputFile, outputFile, options = {}) {
  const { start, end = null, duration = null } = options;
  
  const { info } = await validateMediaFile(inputFile);
  const videoDuration = parseFloat(info.format.duration);
  
  const startSec = parseTime(start);
  const endSec = end ? parseTime(end) : duration ? startSec + parseTime(duration) : videoDuration;
  const segmentDuration = Math.min(endSec - startSec, videoDuration - startSec);
  
  if (startSec < 0 || endSec > videoDuration) {
    throw new FFmpegError(
      `Invalid trim range: ${formatDuration(startSec)} to ${formatDuration(endSec)} (video: ${formatDuration(videoDuration)})`,
      ERROR_CODES.VALIDATION_FAILED
    );
  }
  
  const args = [
    '-i', inputFile,
    '-ss', startSec.toString(),
    '-t', segmentDuration.toString(),
    '-c:v', 'libx264', '-c:a', 'aac',
    '-y', outputFile
  ];
  
  await runFFmpeg(args, { duration: segmentDuration, operation: 'Trimming' });
  
  return {
    input: { path: inputFile, duration: formatDuration(videoDuration) },
    trim: { start: formatDuration(startSec), end: formatDuration(endSec), duration: formatDuration(segmentDuration) },
    output: outputFile
  };
}

/**
 * Extract audio from video
 */
async function extractAudio(inputFile, outputFile, options = {}) {
  const { format = 'mp3', quality = '320k' } = options;
  
  await validateMediaFile(inputFile);
  
  const codecMap = {
    mp3: 'libmp3lame',
    aac: 'aac',
    ogg: 'libvorbis',
    flac: 'flac',
    wav: 'pcm_s16le'
  };
  
  const codec = codecMap[format] || codecMap.mp3;
  const args = [
    '-i', inputFile,
    '-vn',
    '-c:a', codec
  ];
  
  if (format === 'mp3') {
    args.push('-q:a', '2');
  } else if (format === 'ogg') {
    args.push('-q:a', '5');
  } else if (quality && !format.match(/^(ogg|flac|wav)$/)) {
    args.push('-b:a', quality);
  }
  
  args.push('-y', outputFile);
  
  await runFFmpeg(args, { operation: 'Extracting audio' });
  
  return {
    input: inputFile,
    output: outputFile,
    format,
    codec
  };
}

/**
 * Merge multiple media files
 */
async function merge(inputFiles, outputFile, options = {}) {
  if (!Array.isArray(inputFiles) || inputFiles.length < 2) {
    throw new FFmpegError('At least 2 input files required', ERROR_CODES.INVALID_INPUT);
  }
  
  // Create concat file list
  const concatFile = getTempPath('concat', 'txt');
  const list = inputFiles.map(f => `file '${path.resolve(f)}'`).join('\n');
  fs.writeFileSync(concatFile, list);
  
  try {
    const args = [
      '-f', 'concat', '-safe', '0',
      '-i', concatFile,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-y', outputFile
    ];
    
    await runFFmpeg(args, { operation: 'Merging' });
    
    return {
      inputs: inputFiles,
      output: outputFile,
      count: inputFiles.length
    };
  } finally {
    try { fs.unlinkSync(concatFile); } catch {}
  }
}

/**
 * Resize video
 */
async function resize(inputFile, outputFile, options = {}) {
  const { width = null, height = null, scale = null } = options;
  
  const { info } = await validateMediaFile(inputFile);
  
  let scaleFilter = '';
  if (scale) {
    scaleFilter = `scale=iw*${scale}:ih*${scale}`;
  } else if (width && height) {
    scaleFilter = `scale=${width}:${height}`;
  } else if (width) {
    scaleFilter = `scale=${width}:-2`;
  } else if (height) {
    scaleFilter = `scale=-2:${height}`;
  } else {
    throw new FFmpegError('Must specify width, height, or scale', ERROR_CODES.INVALID_INPUT);
  }
  
  const args = [
    '-i', inputFile,
    '-vf', scaleFilter,
    '-c:v', 'libx264',
    '-c:a', 'copy',
    '-y', outputFile
  ];
  
  await runFFmpeg(args, { operation: 'Resizing' });
  
  return {
    input: inputFile,
    scale: scale || `${width}x${height}`,
    output: outputFile
  };
}

// ============================================================
// COMMAND LINE INTERFACE
// ============================================================

function showUsage() {
  console.log(`
FFmpeg-Tools - Production-Grade Media Processing

Usage: ffmpeg.js <command> [options]

Commands:
  convert <input> --output <output>           Convert media format
            [--quality low|medium|high]       Set output quality
            [--format <fmt>]                  Force output format
            
  compress <input> --output <output>          Compress video
            [--quality low|medium|high]       Quality preset
            [--size 10MB]                     Target file size
            
  trim <input> --start <time>                Extract segment
            [--end <time> | --duration <sec>] End point or duration
            --output <output>
            
  extract-audio <input> --output <output>      Extract audio track
            [--format mp3|aac|ogg|flac|wav]   Audio format
            
  merge <input1> <input2> [...] --output <o> Merge multiple files
  
  resize <input> --output <output>            Resize video
            [--width <px>] [--height <px>]    New dimensions
            [--scale <factor>]                Scale factor (e.g., 0.5)
            
  info <file> [--json]                      Show media information

Examples:
  ffmpeg.js convert video.mov --output video.mp4 --quality high
  ffmpeg.js compress video.mp4 --size 10MB --output small.mp4
  ffmpeg.js trim video.mp4 --start 00:01:30 --duration 60 --output clip.mp4
  ffmpeg.js info media.mp4 --json
`);
  process.exit(0);
}

async function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0) showUsage();
  
  const command = args[0];
  const options = {};
  const positional = [];
  
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '').replace(/-/g, '_');
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        options[key] = args[++i];
      } else {
        options[key] = true;
      }
    } else {
      positional.push(args[i]);
    }
  }
  
  return { command, options, positional };
}

async function main() {
  // Check dependencies
  if (!checkFFmpeg()) {
    console.error('❌ FFmpeg is not installed. Install with: brew install ffmpeg (macOS) || sudo apt install ffmpeg (Linux)');
    process.exit(ERROR_CODES.FFMPEG_ERROR);
  }
  
  const { command, options, positional } = await parseArgs();
  
  if (['help', '-h', '--help'].includes(command)) {
    showUsage();
  }
  
  const output = options.output || options.o || options.out;
  
  try {
    let result;
    
    switch (command) {
      case 'convert':
        if (!positional[0]) throw new FFmpegError('Input file required', ERROR_CODES.INVALID_INPUT);
        if (!output) throw new FFmpegError('--output required', ERROR_CODES.INVALID_INPUT);
        result = await convert(positional[0], output, {
          quality: options.quality || 'high',
          format: options.format
        });
        break;
        
      case 'compress':
        if (!positional[0]) throw new FFmpegError('Input file required', ERROR_CODES.INVALID_INPUT);
        result = await compress(positional[0], output || `${positional[0].replace(/\.[^.]+$/, '')}_compressed$1`, {
          quality: options.quality || 'medium',
          targetSize: options.size
        });
        break;
        
      case 'trim':
        if (!positional[0]) throw new FFmpegError('Input file required', ERROR_CODES.INVALID_INPUT);
        if (!options.start) throw new FFmpegError('--start required', ERROR_CODES.INVALID_INPUT);
        if (!output) throw new FFmpegError('--output required', ERROR_CODES.INVALID_INPUT);
        result = await trim(positional[0], output, {
          start: options.start,
          end: options.end,
          duration: options.duration
        });
        break;
        
      case 'extract-audio':
      case 'extract_audio':
        if (!positional[0]) throw new FFmpegError('Input file required', ERROR_CODES.INVALID_INPUT);
        result = await extractAudio(positional[0], output || 'output.mp3', {
          format: options.format || 'mp3'
        });
        break;
        
      case 'merge':
        if (positional.length < 2) throw new FFmpegError('At least 2 input files required', ERROR_CODES.INVALID_INPUT);
        if (!output) throw new FFmpegError('--output required', ERROR_CODES.INVALID_INPUT);
        result = await merge(positional, output);
        break;
        
      case 'resize':
        if (!positional[0]) throw new FFmpegError('Input file required', ERROR_CODES.INVALID_INPUT);
        if (!output) throw new FFmpegError('--output required', ERROR_CODES.INVALID_INPUT);
        result = await resize(positional[0], output, {
          width: options.width ? parseInt(options.width) : null,
          height: options.height ? parseInt(options.height) : null,
          scale: options.scale ? parseFloat(options.scale) : null
        });
        break;
        
      case 'info':
        if (!positional[0]) throw new FFmpegError('File required', ERROR_CODES.INVALID_INPUT);
        result = await getMediaInfo(positional[0]);
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('Media Information:');
          console.log('==================');
          console.log(`Format: ${result.format?.format_name}`);
          console.log(`Duration: ${formatDuration(parseFloat(result.format?.duration || 0))}`);
          console.log(`Size: ${formatBytes(parseInt(result.format?.size || 0))}`);
          console.log(`Bitrate: ${Math.round(parseInt(result.format?.bit_rate || 0) / 1000)} kbps`);
          console.log('');
          
          const videoStream = result.streams.find(s => s.codec_type === 'video');
          if (videoStream) {
            console.log('Video Stream:');
            console.log(`  Codec: ${videoStream.codec_name}`);
            console.log(`  Resolution: ${videoStream.width}x${videoStream.height}`);
            const fps = eval(videoStream.r_frame_rate);
            console.log(`  Frame Rate: ${fps.toFixed(2)} fps`);
          }
          
          const audioStream = result.streams.find(s => s.codec_type === 'audio');
          if (audioStream) {
            console.log('Audio Stream:');
            console.log(`  Codec: ${audioStream.codec_name}`);
            console.log(`  Sample Rate: ${audioStream.sample_rate} Hz`);
            const chNames = {1: 'Mono', 2: 'Stereo', 6: '5.1', 8: '7.1'};
            console.log(`  Channels: ${chNames[audioStream.channels] || audioStream.channels}`);
          }
        }
        return;
        
      default:
        throw new FFmpegError(`Unknown command: ${command}`, ERROR_CODES.INVALID_INPUT);
    }
    
    // Print success result
    console.log('\n✅ SUCCESS');
    console.log(JSON.stringify(result, null, 2));
    process.exit(ERROR_CODES.SUCCESS);
    
  } catch (error) {
    if (error instanceof FFmpegError) {
      console.error('\n❌ ERROR:', error.message);
      if (options.verbose) {
        console.error(error.toJSON());
      }
      process.exit(error.code);
    } else {
      console.error('\n❌ UNEXPECTED ERROR:', error.message);
      if (options.verbose) {
        console.error(error);
      }
      process.exit(ERROR_CODES.UNKNOWN);
    }
  }
}

main();
