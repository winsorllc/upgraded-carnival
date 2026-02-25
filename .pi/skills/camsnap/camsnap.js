/**
 * Camsnap Skill
 * Capture frames and clips from RTSP/ONVIF cameras
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class Camsnap {
  constructor(options = {}) {
    this.ffmpegPath = options.ffmpegPath || 'ffmpeg';
    this.outputDir = options.outputDir || '/job/tmp';
    this.timeout = options.timeout || 5000000; // 5 seconds in microseconds
  }

  /**
   * Build RTSP URL with credentials
   */
  buildUrl(config) {
    if (config.url.includes('@')) {
      return config.url; // Already has credentials
    }

    if (config.username && config.password) {
      const protocol = config.url.split('://')[0];
      const rest = config.url.replace(`${protocol}://`, '');
      return `${protocol}://${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@${rest}`;
    }

    return config.url;
  }

  /**
   * Capture a snapshot from a camera
   * @param {object} config - Camera configuration
   * @returns {string} Path to output image
   */
  captureSnapshot(config) {
    const {
      url,
      username,
      password,
      output = null,
      timeout = this.timeout
    } = config;

    const cameraUrl = this.buildUrl({ url, username, password });
    const outputFile = output || path.join(
      this.outputDir,
      `snapshot_${Date.now()}.jpg`
    );

    try {
      execSync(
        `${this.ffmpegPath} -rtsp_transport tcp -stimeout ${timeout} -i "${cameraUrl}" -frames:v 1 -q:v 2 "${outputFile}"`,
        { stdio: 'pipe', timeout: 30000 }
      );

      if (fs.existsSync(outputFile)) {
        return { success: true, path: outputFile };
      } else {
        return { success: false, error: 'Failed to capture snapshot' };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Capture a short video clip from a camera
   * @param {object} config - Camera configuration
   * @returns {string} Path to output video
   */
  captureClip(config) {
    const {
      url,
      username,
      password,
      duration = 5,
      output = null,
      timeout = this.timeout
    } = config;

    const cameraUrl = this.buildUrl({ url, username, password });
    const outputFile = output || path.join(
      this.outputDir,
      `clip_${Date.now()}.mp4`
    );

    try {
      execSync(
        `${this.ffmpegPath} -rtsp_transport tcp -stimeout ${timeout} -i "${cameraUrl}" -t ${duration} -c copy "${outputFile}"`,
        { stdio: 'pipe', timeout: 30000 + (duration * 1000) }
      );

      if (fs.existsSync(outputFile)) {
        return { success: true, path: outputFile };
      } else {
        return { success: false, error: 'Failed to capture clip' };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Test camera connection
   * @param {object} config - Camera configuration
   * @returns {object} Connection test result
   */
  testConnection(config) {
    const {
      url,
      username,
      password,
      timeout = this.timeout
    } = config;

    const cameraUrl = this.buildUrl({ url, username, password });

    try {
      // Try to get stream info with ffprobe
      const output = execSync(
        `${this.ffmpegPath.replace('ffmpeg', 'ffprobe')} -rtsp_transport tcp -stimeout ${timeout} -v quiet -print_format json -show_format -show_streams "${cameraUrl}"`,
        { encoding: 'utf-8', timeout: 15000 }
      );

      const info = JSON.parse(output);
      return {
        success: true,
        connected: true,
        info: {
          duration: info.format?.duration,
          streams: info.streams?.length,
          videoCodec: info.streams?.find(s => s.codec_type === 'video')?.codec_name,
          resolution: info.streams?.find(s => s.codec_type === 'video')?.width 
            ? `${info.streams.find(s => s.codec_type === 'video').width}x${info.streams.find(s => s.codec_type === 'video').height}`
            : null
        }
      };
    } catch (e) {
      return {
        success: false,
        connected: false,
        error: e.message
      };
    }
  }

  /**
   * Capture snapshots from multiple cameras
   * @param {Array} cameras - Array of camera configurations
   * @returns {Array} Results for each camera
   */
  captureMultiSnapshot(cameras) {
    const results = [];

    for (const camera of cameras) {
      const result = this.captureSnapshot(camera);
      results.push({
        name: camera.name || camera.url,
        ...result
      });
    }

    return results;
  }

  /**
   * Generate a thumbnail grid from multiple cameras
   * @param {Array} cameras - Array of camera configurations
   * @param {object} options - Grid options
   * @returns {string} Path to output grid image
   */
  generateMultiCameraGrid(cameras, options = {}) {
    const {
      columns = 3,
      output = null
    } = options;

    // First capture all snapshots
    const snapshots = [];
    for (const camera of cameras) {
      const result = this.captureSnapshot(camera);
      if (result.success) {
        snapshots.push(result.path);
      }
    }

    if (snapshots.length === 0) {
      return { success: false, error: 'No snapshots captured' };
    }

    const outputFile = output || path.join(
      this.outputDir,
      `grid_${Date.now()}.jpg`
    );

    // Create input list for ffmpeg
    const inputList = snapshots.map(s => `-i "${s}"`).join(' ');
    const filterComplex = snapshots.map((_, i) => `[${i}:v]`).join('');
    
    try {
      execSync(
        `${this.ffmpegPath} ${inputList} -filter_complex "${filterComplex}tile=${columns}x${Math.ceil(snapshots.length / columns)}" "${outputFile}"`,
        { stdio: 'pipe' }
      );

      return { success: true, path: outputFile, snapshots: snapshots.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = Camsnap;
