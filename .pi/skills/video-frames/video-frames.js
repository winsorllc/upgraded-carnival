/**
 * Video Frames Skill
 * Extract frames and clips from videos using ffmpeg
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class VideoFrames {
  constructor(options = {}) {
    this.ffmpegPath = options.ffmpegPath || 'ffmpeg';
    this.ffprobePath = options.ffprobePath || 'ffprobe';
    this.outputDir = options.outputDir || '/job/tmp';
  }

  /**
   * Check if ffmpeg is available
   */
  isAvailable() {
    try {
      execSync(`${this.ffmpegPath} -version`, { stdio: 'pipe' });
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get video metadata
   */
  getVideoInfo(videoPath) {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const output = execSync(
      `${this.ffprobePath} -v quiet -print_format json -show_format -show_streams "${videoPath}"`,
      { encoding: 'utf-8' }
    );

    return JSON.parse(output);
  }

  /**
   * Extract a single frame from a video
   * @param {string} videoPath - Path to input video
   * @param {object} options - Extraction options
   * @returns {string} Path to output frame
   */
  extractFrame(videoPath, options = {}) {
    const {
      timestamp = '00:00:01',
      quality = 2,
      format = 'jpg',
      output = null
    } = options;

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const outputFile = output || path.join(
      this.outputDir,
      `frame_${path.basename(videoPath, path.extname(videoPath))}_${Date.now()}.${format}`
    );

    const qualityArg = format === 'jpg' ? `-q:v ${quality}` : '-q:v 2';
    
    execSync(
      `${this.ffmpegPath} -i "${videoPath}" -ss "${timestamp}" -frames:v 1 ${qualityArg} "${outputFile}"`,
      { stdio: 'pipe' }
    );

    return outputFile;
  }

  /**
   * Extract multiple frames at regular intervals
   * @param {string} videoPath - Path to input video
   * @param {object} options - Extraction options
   * @returns {string[]} Paths to output frames
   */
  extractFrames(videoPath, options = {}) {
    const {
      interval = 60, // seconds between frames
      format = 'jpg',
      outputDir = this.outputDir
    } = options;

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const pattern = path.join(outputDir, `frame_%03d.${format}`);
    
    execSync(
      `${this.ffmpegPath} -i "${videoPath}" -vf "fps=1/${interval}" "${pattern}"`,
      { stdio: 'pipe' }
    );

    // Return list of generated files
    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('frame_') && f.endsWith(`.${format}`))
      .map(f => path.join(outputDir, f));

    return files;
  }

  /**
   * Generate a thumbnail grid (contact sheet)
   * @param {string} videoPath - Path to input video
   * @param {object} options - Grid options
   * @returns {string} Path to output grid image
   */
  generateThumbnailGrid(videoPath, options = {}) {
    const {
      columns = 3,
      rows = 3,
      output = null
    } = options;

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const outputFile = output || path.join(
      this.outputDir,
      `grid_${path.basename(videoPath, path.extname(videoPath))}_${Date.now()}.jpg`
    );

    execSync(
      `${this.ffmpegPath} -i "${videoPath}" -vf "tile=${columns}x${rows}" "${outputFile}"`,
      { stdio: 'pipe' }
    );

    return outputFile;
  }

  /**
   * Extract a short clip from a video
   * @param {string} videoPath - Path to input video
   * @param {object} options - Clip options
   * @returns {string} Path to output clip
   */
  extractClip(videoPath, options = {}) {
    const {
      startTime = '00:00:10',
      duration = '00:00:05',
      copyCodec = true,
      output = null
    } = options;

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const outputFile = output || path.join(
      this.outputDir,
      `clip_${path.basename(videoPath, path.extname(videoPath))}_${Date.now()}.mp4`
    );

    const codecArg = copyCodec ? '-c copy' : '';

    execSync(
      `${this.ffmpegPath} -i "${videoPath}" -ss "${startTime}" -t "${duration}" ${codecArg} "${outputFile}"`,
      { stdio: 'pipe' }
    );

    return outputFile;
  }

  /**
   * Create an animated GIF from a video segment
   * @param {string} videoPath - Path to input video
   * @param {object} options - GIF options
   * @returns {string} Path to output GIF
   */
  createGif(videoPath, options = {}) {
    const {
      startTime = '00:00:10',
      duration = '00:00:05',
      fps = 10,
      width = 320,
      output = null
    } = options;

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const outputFile = output || path.join(
      this.outputDir,
      `clip_${path.basename(videoPath, path.extname(videoPath))}_${Date.now()}.gif`
    );

    execSync(
      `${this.ffmpegPath} -i "${videoPath}" -ss "${startTime}" -t "${duration}" -vf "fps=${fps},scale=${width}:-1" "${outputFile}"`,
      { stdio: 'pipe' }
    );

    return outputFile;
  }

  /**
   * Generate a single high-quality thumbnail
   * @param {string} videoPath - Path to input video
   * @param {object} options - Thumbnail options
   * @returns {string} Path to output thumbnail
   */
  generateThumbnail(videoPath, options = {}) {
    const {
      timestamp = '00:00:02',
      width = 640,
      quality = 85,
      output = null
    } = options;

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const outputFile = output || path.join(
      this.outputDir,
      `thumb_${path.basename(videoPath, path.extname(videoPath))}_${Date.now()}.jpg`
    );

    execSync(
      `${this.ffmpegPath} -i "${videoPath}" -ss "${timestamp}" -frames:v 1 -vf "scale=${width}:-1" -q:v ${quality} "${outputFile}"`,
      { stdio: 'pipe' }
    );

    return outputFile;
  }
}

module.exports = VideoFrames;
