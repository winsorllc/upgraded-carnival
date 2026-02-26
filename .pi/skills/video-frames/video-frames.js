#!/usr/bin/env node
/**
 * Video-Frames - Production-Grade Frame Extraction
 * 
 * Architecture:
 * - Comprehensive frame extraction with multiple modes
 * - Thumbnail grid generation with intelligent layout
 * - GIF creation with palette optimization
 * - Batch processing with progress tracking
 * - Multi-format support with quality presets
 * - Video integrity validation before processing
 * 
 * @version 2.0.0
 * @author Pi Agent
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');

// Promisify
const stat = util.promisify(fs.stat);
const mkdir = util.promisify(fs.mkdir);
const readdir = util.promisify(fs.readdir);
const access = util.promisify(fs.access);

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  // Quality presets for different use cases
  QUALITY: {
    draft: { q: 5, format: 'jpg' },      // Fast preview, lowest quality
    web: { q: 3, format: 'jpg' },       // Web optimized
    default: { q: 2, format: 'jpg' },   // Standard quality
    high: { q: 1, format: 'jpg' },      // High quality
    archive: { q: 1, format: 'png' }    // Lossless archival
  },
  
  // GIF presets
  GIF_PRESETS: {
    fast: { fps: 15, scale: 480, colors: 128 },      // Quick generation
    balanced: { fps: 20, scale: 640, colors: 256 },  // Standard
    quality: { fps: 24, scale: 720, colors: 512 },    // High quality
    cinematic: { fps: 30, scale: 1080, colors: 1024 } // Best quality
  },
  
  // Safety limits
  SAFETY: {
    maxVideoSizeGB: 50,           // Max video size
    maxDurationHours: 4,          // Max video duration
    maxFrames: 1000,              // Max frames per extraction
    maxThumbnailGrid: 60,         // Max thumbnails in grid
    maxGifFrames: 300,            // Max frames in GIF
    timeout: 1800000              // 30 minute default timeout
  },
  
  // Frame extraction settings
  FRAME: {
    defaultFormat: 'jpg',
    supportedFormats: ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'],
    qualityRange: [1, 31],
    defaultQuality: 2
  }
};

// Error codes
const ERROR_CODES = {
  SUCCESS: 0,
  INVALID_INPUT: 1,
  FILE_NOT_FOUND: 2,
  INVALID_FORMAT: 3,
  INVALID_TIME_RANGE: 4,
  FFMPEG_ERROR: 5,
  OUT_OF_MEMORY: 6,
  TIMEOUT: 7,
  INTERRUPTED: 8,
  PERMISSION_DENIED: 9,
  VALIDATION_FAILED: 10,
  UNKNOWN: 99
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format timestamp (seconds to timecode)
 */
function formatTimecode(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/**
 * Format bytes
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Parse time string
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
 * Generate temp path
 */
function getTempPath(prefix, ext) {
  const hash = crypto.randomBytes(8).toString('hex');
  return path.join('/tmp', `${prefix}_${hash}${ext ? '.' + ext : ''}`);
}

// ============================================================
// ERROR HANDLING
// ============================================================

class VideoFramesError extends Error {
  constructor(message, code = ERROR_CODES.UNKNOWN, details = {}) {
    super(message);
    this.name = 'VideoFramesError';
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
  constructor(totalItems, operation = 'Processing') {
    this.total = totalItems;
    this.current = 0;
    this.operation = operation;
    this.startTime = Date.now();
    this.lastUpdate = 0;
  }
  
  increment() {
    this.current++;
    this.update();
  }
  
  update() {
    const now = Date.now();
    if (now - this.lastUpdate < 500) return;
    this.lastUpdate = now;
    
    const percent = ((this.current / this.total) * 100).toFixed(1);
    const elapsed = ((now - this.startTime) / 1000).toFixed(1);
    
    if (process.stderr.isTTY) {
      process.stderr.clearLine();
      process.stderr.cursorTo(0);
      process.stderr.write(
        `⏳ ${this.operation}: ${this.current}/${this.total} (${percent}%) | Elapsed: ${elapsed}s`
      );
    }
  }
  
  finish() {
    if (process.stderr.isTTY) {
      process.stderr.clearLine();
      process.stderr.cursorTo(0);
    }
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    return { total: this.total, processed: this.current, elapsed };
  }
}

// ============================================================
// VIDEO VALIDATION
// ============================================================

async function validateVideo(inputFile, checkDuration = true) {
  if (!fs.existsSync(inputFile)) {
    throw new VideoFramesError(`File not found: ${inputFile}`, ERROR_CODES.FILE_NOT_FOUND);
  }
  
  const stats = await stat(inputFile);
  if (stats.size === 0) {
    throw new VideoFramesError('File is empty', ERROR_CODES.VALIDATION_FAILED);
  }
  
  // Check file size limit
  const sizeGB = stats.size / (1024 ** 3);
  if (sizeGB > CONFIG.SAFETY.maxVideoSizeGB) {
    throw new VideoFramesError(
      `File too large: ${sizeGB.toFixed(2)}GB (max: ${CONFIG.SAFETY.maxVideoSizeGB}GB)`,
      ERROR_CODES.VALIDATION_FAILED
    );
  }
  
  // Probe video
  try {
    const output = execSync(
      `ffprobe -v error -print_format json -show_format -show_streams "${inputFile}"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, timeout: 30000 }
    );
    const info = JSON.parse(output);
    
    const duration = parseFloat(info.format?.duration || 0);
    if (checkDuration && duration > CONFIG.SAFETY.maxDurationHours * 3600) {
      throw new VideoFramesError(
        `Video too long: ${formatTimecode(duration)} (max: ${CONFIG.SAFETY.maxDurationHours}h)`,
        ERROR_CODES.VALIDATION_FAILED
      );
    }
    
    // Find video stream
    const videoStream = info.streams?.find(s => s.codec_type === 'video');
    if (!videoStream) {
      throw new VideoFramesError('No video stream found', ERROR_CODES.VALIDATION_FAILED);
    }
    
    return {
      stats,
      info,
      duration,
      width: videoStream.width,
      height: videoStream.height,
      fps: eval(videoStream.r_frame_rate) || 30,
      totalFrames: Math.floor(duration * (eval(videoStream.r_frame_rate) || 30))
    };
  } catch (e) {
    if (e instanceof VideoFramesError) throw e;
    throw new VideoFramesError(
      `Failed to analyze video: ${e.message}`,
      ERROR_CODES.VALIDATION_FAILED
    );
  }
}

// ============================================================
// CORE OPERATIONS
// ============================================================

/**
 * Extract single frame
 */
async function extractFrame(inputFile, options = {}) {
  const {
    time = 0,           // Timestamp (seconds or timecode)
    index = null,       // Frame index (alternative to time)
    output = null,      // Output path (auto-generated if not provided)
    format = CONFIG.FRAME.defaultFormat,
    quality = CONFIG.FRAME.defaultQuality,
    width = null,       // Resize width (height auto)
    verify = true       // Verify output
  } = options;
  
  // Validate
  const videoInfo = await validateVideo(inputFile);
  
  // Validate format and quality
  if (!CONFIG.FRAME.supportedFormats.includes(format.toLowerCase())) {
    throw new VideoFramesError(
      `Unsupported format: ${format}. Supported: ${CONFIG.FRAME.supportedFormats.join(', ')}`,
      ERROR_CODES.INVALID_FORMAT
    );
  }
  
  if (quality < CONFIG.FRAME.qualityRange[0] || quality > CONFIG.FRAME.qualityRange[1]) {
    throw new VideoFramesError(
      `Quality must be between ${CONFIG.FRAME.qualityRange[0]}-${CONFIG.FRAME.qualityRange[1]}`,
      ERROR_CODES.INVALID_INPUT
    );
  }
  
  // Calculate timestamp
  let timestamp;
  if (index !== null) {
    // Convert frame index to time
    const frameNum = parseInt(index);
    if (frameNum < 0 || frameNum >= videoInfo.totalFrames) {
      throw new VideoFramesError(
        `Frame index ${frameNum} out of range (0-${videoInfo.totalFrames - 1})`,
        ERROR_CODES.INVALID_TIME_RANGE
      );
    }
    timestamp = frameNum / videoInfo.fps;
  } else {
    timestamp = parseTime(time);
    if (timestamp < 0 || timestamp > videoInfo.duration) {
      throw new VideoFramesError(
        `Timestamp ${formatTimecode(timestamp)} out of range (0-${formatTimecode(videoInfo.duration)})`,
        ERROR_CODES.INVALID_TIME_RANGE
      );
    }
  }
  
  // Generate output path
  const outputFile = output || path.join(
    '/tmp',
    `frame_${path.basename(inputFile, path.extname(inputFile))}_${String(timestamp).replace('.', '_')}.${format}`
  );
  
  await mkdir(path.dirname(outputFile), { recursive: true });
  
  // Build FFmpeg command
  let filterComplex = '';
  if (width) {
    filterComplex = `scale=${width}:-2:flags=lanczos`;
  }
  
  const args = [
    '-ss', timestamp.toString(),
    '-i', inputFile,
    '-frames:v', '1'
  ];
  
  // Quality settings
  if (format === 'jpg' || format === 'jpeg') {
    args.push('-q:v', quality.toString());
  }
  
  if (filterComplex) {
    args.push('-vf', filterComplex);
  }
  
  args.push('-y', outputFile);
  
  // Execute
  await runFFmpeg(args, { timeout: 30000 });
  
  // Verify output
  if (verify) {
    const outStats = await stat(outputFile);
    if (outStats.size === 0) {
      await unlink(outputFile);
      throw new VideoFramesError('Frame extraction failed - empty output', ERROR_CODES.FFMPEG_ERROR);
    }
  }
  
  return {
    input: { path: inputFile, duration: videoInfo.duration },
    frame: { index: Math.floor(timestamp * videoInfo.fps), time: timestamp },
    output: { path: outputFile, size: formatBytes(fs.statSync(outputFile).size) }
  };
}

/**
 * Extract multiple frames at intervals
 */
async function extractFrames(inputFile, options = {}) {
  const {
    fps = 1,            // Frames per second to extract
    start = 0,          // Start time
    duration = null,    // Duration to extract (null = all)
    outputDir = '/tmp', // Output directory
    prefix = 'frame',   // Filename prefix
    format = 'jpg',
    quality = 2,
    width = null
  } = options;
  
  const videoInfo = await validateVideo(inputFile);
  
  const startTime = parseTime(start);
  const endTime = duration ? startTime + parseTime(duration) : videoInfo.duration;
  const extractDuration = Math.min(endTime - startTime, videoInfo.duration - startTime);
  
  // Calculate frame count
  const frameCount = Math.floor(extractDuration * fps);
  if (frameCount > CONFIG.SAFETY.maxFrames) {
    throw new VideoFramesError(
      `Too many frames requested: ${frameCount} (max: ${CONFIG.SAFETY.maxFrames})`,
      ERROR_CODES.VALIDATION_FAILED
    );
  }
  
  // Create output directory
  const timestamp = Date.now();
  const outDir = path.join(outputDir, `frames_${timestamp}`);
  await mkdir(outDir, { recursive: true });
  
  // Build pattern
  const pattern = path.join(outDir, `${prefix}_%05d.${format}`);
  
  // Build FFmpeg command
  const scaleFilter = width ? `scale=${width}:-2:flags=lanczos` : '';
  const fpsFilter = fps === 1 && startTime > 0
    ? `select=gte(t,${startTime})*iszeof${Math.floor(extractDuration)},${scaleFilter ? scaleFilter + ',' : ''}setpts=N/TB`
    : `${scaleFilter ? scaleFilter + ',' : ''}fps=${fps}`;
  
  const args = [
    '-ss', startTime.toString(),
    '-t', extractDuration.toString(),
    '-i', inputFile,
    '-vf', fpsFilter,
    '-q:v', quality.toString(),
    '-y',
    pattern
  ];
  
  // Execute with progress
  const progress = new ProgressTracker(frameCount, 'Extracting frames');
  await runFFmpeg(args, { 
    duration: extractDuration,
    onProgress: () => progress.increment()
  });
  
  const stats = progress.finish();
  
  // List generated files
  const files = (await readdir(outDir))
    .filter(f => f.endsWith(`.${format}`))
    .map(f => path.join(outDir, f))
    .sort();
  
  return {
    input: { path: inputFile, duration: videoInfo.duration },
    extraction: { fps, start: startTime, duration: extractDuration, frames: frameCount },
    output: { directory: outDir, files, count: files.length, ...stats }
  };
}

/**
 * Generate thumbnail grid (contact sheet)
 */
async function generateGrid(inputFile, options = {}) {
  const {
    count = 12,         // Number of thumbnails
    columns = 4,        // Columns in grid
    width = 320,        // Thumbnail width
    output = null,
    format = 'jpg'
  } = options;
  
  const videoInfo = await validateVideo(inputFile);
  
  // Validate limits
  if (count > CONFIG.SAFETY.maxThumbnailGrid) {
    throw new VideoFramesError(
      `Grid size ${count} exceeds maximum ${CONFIG.SAFETY.maxThumbnailGrid}`,
      ERROR_CODES.VALIDATION_FAILED
    );
  }
  
  const outputFile = output || path.join(
    '/tmp',
    `grid_${path.basename(inputFile, path.extname(inputFile))}.${format}`
  );
  
  // Calculate interval
  const interval = videoInfo.duration / (count + 1);
  const rows = Math.ceil(count / columns);
  
  // Create temp directory for thumbnails
  const tempDir = getTempPath('grid', '');
  await mkdir(tempDir, { recursive: true });
  
  try {
    const progress = new ProgressTracker(count, 'Generating thumbnails');
    const generated = [];
    
    // Generate individual thumbnails
    for (let i = 1; i <= count; i++) {
      const timestamp = interval * i;
      const thumbPath = path.join(tempDir, `thumb_${String(i).padStart(3, '0')}.${format}`);
      
      const args = [
        '-ss', timestamp.toString(),
        '-i', inputFile,
        '-frames:v', '1',
        '-vf', `scale=${width}:-2:flags=lanczos`,
        '-q:v', '3',
        '-y', thumbPath
      ];
      
      await runFFmpeg(args, { timeout: 30000 });
      generated.push(thumbPath);
      progress.increment();
    }
    
    progress.finish();
    
    // Create montage if ImageMagick available, else use ffmpeg tile
    if (checkImageMagick()) {
      const montageArgs = [
        ...generated,
        '-geometry', '+4+4',
        '-tile', `${columns}x`,
        '-background', 'black',
        outputFile
      ];
      
      await new Promise((resolve, reject) => {
        const proc = spawn('montage', montageArgs, { stdio: 'pipe' });
        proc.on('close', code => code === 0 ? resolve() : reject(new Error(`Montage failed: ${code}`)));
        proc.on('error', reject);
      });
    } else {
      // Use ffmpeg tile filter
      const inputs = generated.map(g => ['-i', g]).flat();
      const filter = `
        xstack=inputs=${generated.length}:layout=${generated.map((_, i) => 
          `${(i % columns) * width}_${Math.floor(i / columns) * 180}`
        ).join('|')}
      `;
      
      const args = [
        ...inputs,
        '-filter_complex', filter.trim(),
        '-y', outputFile
      ];
      
      await runFFmpeg(args, { timeout: 120000 });
    }
    
    return {
      input: { path: inputFile, duration: videoInfo.duration },
      grid: { count, columns, rows, width, format },
      output: { path: outputFile, size: formatBytes(fs.statSync(outputFile).size) }
    };
    
  } finally {
    // Cleanup temp files
    for (const file of (await readdir(tempDir))) {
      try { await unlink(path.join(tempDir, file)); } catch {}
    }
    try { fs.rmdirSync(tempDir); } catch {}
  }
}

/**
 * Create GIF from video
 */
async function createGif(inputFile, options = {}) {
  const {
    start = 0,
    duration = 5,
    fps = 20,
    width = 640,
    output = null,
    preset = 'balanced',
    optimize = true
  } = options;
  
  const videoInfo = await validateVideo(inputFile);
  
  const startTime = parseTime(start);
  const gifDuration = Math.min(parseTime(duration), CONFIG.SAFETY.maxDurationHours * 3600);
  const settings = CONFIG.GIF_PRESETS[preset] || CONFIG.GIF_PRESETS.balanced;
  
  // Validate frame count
  const totalFrames = Math.floor(Math.min(gifDuration * fps, CONFIG.SAFETY.maxGifFrames));
  
  if (totalFrames > CONFIG.SAFETY.maxGifFrames) {
    throw new VideoFramesError(
      `GIF too long: ${totalFrames} frames (max: ${CONFIG.SAFETY.maxGifFrames})`,
      ERROR_CODES.VALIDATION_FAILED
    );
  }
  
  const outputFile = output || path.join(
    '/tmp',
    `gif_${path.basename(inputFile, path.extname(inputFile))}_${Date.now()}.gif`
  );
  
  // Use palette optimization
  const tempPalette = getTempPath('gif_palette', 'png');
  
  try {
    // Generate palette
    await runFFmpeg([
      '-ss', startTime.toString(),
      '-t', gifDuration.toString(),
      '-i', inputFile,
      '-vf', `fps=${fps},scale=${width}:-2:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=${settings.colors}[p];[s1][p]paletteuse`,
      '-y', outputFile
    ], { timeout: 300000 });
    
    return {
      input: { path: inputFile, duration: videoInfo.duration },
      gif: { start: startTime, duration: gifDuration, fps, width, frames: totalFrames },
      output: { path: outputFile, size: formatBytes(fs.statSync(outputFile).size) }
    };
    
  } catch (e) {
    try { await unlink(tempPalette); } catch {}
    throw e;
  }
}

// ============================================================
// FFMPEG RUNNER
// ============================================================

async function runFFmpeg(args, options = {}) {
  const { timeout = CONFIG.SAFETY.timeout, onProgress = null } = options;
  
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'warning', '-stats', ...args], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stderr = '';
    let killed = false;
    let timeoutId;
    
    timeoutId = setTimeout(() => {
      killed = true;
      proc.kill('SIGTERM');
      reject(new VideoFramesError('Operation timed out', ERROR_CODES.TIMEOUT));
    }, timeout);
    
    proc.stderr.on('data', data => {
      stderr += data.toString();
      
      // Parse progress
      const frameMatch = data.toString().match(/frame=\s*(\d+)/);
      const fpsMatch = data.toString().match(/fps=\s*([\d.]+)/);
      
      if (frameMatch && onProgress) {
        onProgress({
          frame: parseInt(frameMatch[1]),
          fps: fpsMatch ? parseFloat(fpsMatch[1]) : 0
        });
      }
    });
    
    proc.on('close', code => {
      clearTimeout(timeoutId);
      
      if (killed) return;
      
      if (code === 0) {
        resolve();
      } else {
        const errorLine = stderr.split('\n').filter(l => l.includes('Error')).pop() || stderr.slice(-200);
        reject(new VideoFramesError(
          `FFmpeg error: ${errorLine}`,
          ERROR_CODES.FFMPEG_ERROR,
          { code }
        ));
      }
    });
    
    proc.on('error', err => {
      clearTimeout(timeoutId);
      reject(new VideoFramesError(`FFmpeg spawn error: ${err.message}`, ERROR_CODES.FFMPEG_ERROR));
    });
    
    // Handle interrupt
    const onSigint = () => {
      killed = true;
      proc.kill('SIGTERM');
      process.removeListener('SIGINT', onSigint);
    };
    process.on('SIGINT', onSigint);
  });
}

function checkImageMagick() {
  try {
    execSync('which montage', { stdio: 'pipe' });
    return true;
  } catch { return false; }
}

// ============================================================
// CLI INTERFACE
// ============================================================

function showUsage() {
  console.log(`
Video-Frames - Professional Frame Extraction Tool

Usage: video-frames.js <command> [options]

Commands:
  frame <video>        Extract single frame
    --time <sec>        Timestamp (HH:MM:SS or seconds)
    --index <N>         Frame index (0-based)
    --output <path>     Output path
    --format <fmt>      Output format (jpg, png, webp)
    --quality <1-31>    Quality (JPEG: 1=best, 31=worst)
    --width <px>        Scale width (height auto)
    
  frames <video>       Extract multiple frames
    --fps <N>           Extract N frames per second
    --start <t>         Start time
    --duration <t>      Duration to extract
    --prefix <name>     Filename prefix (default: frame)
    
  grid <video>          Generate thumbnail grid
    --count <N>         Number of thumbnails (default: 12)
    --columns <N>       Columns in grid (default: 4)
    --width <px>        Thumbnail width (default: 320)
    --output <path>     Output path
    
  gif <video>           Create animated GIF
    --start <t>         Start time
    --duration <t>      GIF duration (default: 5s)
    --fps <N>           Frame rate (default: 20)
    --width <px>        Width (default: 640)
    --preset <p>        fast|balanced|quality|cinematic
    
  info <video>          Show video information

Examples:
  # Extract frame at 10 seconds
  video-frames.js frame video.mp4 --time 10 --out thumb.jpg
  
  # Extract frame at specific quality
  video-frames.js frame video.mp4 --index 100 --quality 1 --out frame.png
  
  # Extract 1 frame per second for 60 seconds
  video-frames.js frames video.mp4 --fps 1 --duration 60
  
  # Create 4x3 thumbnail grid
  video-frames.js grid video.mp4 --count 12 --columns 4 --out grid.jpg
  
  # Create high quality GIF
  video-frames.js gif video.mp4 --start 30 --duration 10 --preset quality --out clip.gif
  
  # Get video info
  video-frames.js info video.mp4
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
      const key = args[i].slice(2).replace(/-/g, '_');
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        options[key] = isNaN(args[i + 1]) ? args[++i] : Number(args[++i]);
      } else {
        options[key] = true;
      }
    } else if (!positional[0] && !args[i].includes('*')) {
      positional.push(args[i]);
    }
  }
  
  return { command, options, positional };
}

async function main() {
  const { command, options, positional } = await parseArgs();
  
  if (['help', '-h', '--help'].includes(command)) showUsage();
  
  try {
    let result;
    
    switch (command) {
      case 'frame':
        if (!positional[0]) throw new VideoFramesError('Video required', ERROR_CODES.INVALID_INPUT);
        result = await extractFrame(positional[0], options);
        break;
        
      case 'frames':
        if (!positional[0]) throw new VideoFramesError('Video required', ERROR_CODES.INVALID_INPUT);
        result = await extractFrames(positional[0], options);
        break;
        
      case 'grid':
        if (!positional[0]) throw new VideoFramesError('Video required', ERROR_CODES.INVALID_INPUT);
        result = await generateGrid(positional[0], options);
        break;
        
      case 'gif':
        if (!positional[0]) throw new VideoFramesError('Video required', ERROR_CODES.INVALID_INPUT);
        result = await createGif(positional[0], options);
        break;
        
      case 'info':
        if (!positional[0]) throw new VideoFramesError('Video required', ERROR_CODES.INVALID_INPUT);
        result = await validateVideo(positional[0]);
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
        return;
        
      default:
        throw new VideoFramesError(`Unknown command: ${command}`, ERROR_CODES.INVALID_INPUT);
    }
    
    console.log('\n✅ SUCCESS');
    console.log(JSON.stringify(result, null, 2));
    process.exit(ERROR_CODES.SUCCESS);
    
  } catch (error) {
    if (error instanceof VideoFramesError) {
      console.error('\n❌ ERROR:', error.message);
      if (options.verbose) console.error(error.toJSON());
      process.exit(error.code);
    } else {
      console.error('\n❌ UNEXPECTED ERROR:', error.message);
      process.exit(ERROR_CODES.UNKNOWN);
    }
  }
}

main();
