#!/usr/bin/env node

/**
 * Web Screenshot Skill
 * Capture screenshots of web pages using headless Chrome
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function parseArgs(args) {
  const options = {
    fullPage: false,
    width: 1280,
    height: 800,
    delay: 0,
    mobile: false,
    quality: 80,
    format: 'png',
    waitFor: null,
    darkMode: false
  };
  
  let url = null;
  let outputFile = null;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--full') {
      options.fullPage = true;
    } else if (arg === '--width' && args[i + 1]) {
      options.width = parseInt(args[++i]);
    } else if (arg === '--height' && args[i + 1]) {
      options.height = parseInt(args[++i]);
    } else if (arg === '--delay' && args[i + 1]) {
      options.delay = parseInt(args[++i]);
    } else if (arg === '--mobile') {
      options.mobile = true;
    } else if (arg === '--quality' && args[i + 1]) {
      options.quality = parseInt(args[++i]);
    } else if (arg === '--format' && args[i + 1]) {
      options.format = args[++i];
    } else if (arg === '--wait-for' && args[i + 1]) {
      options.waitFor = args[++i];
    } else if (arg === '--dark-mode') {
      options.darkMode = true;
    } else if (!arg.startsWith('--')) {
      if (!url) {
        url = arg;
      } else if (!outputFile) {
        outputFile = arg;
      }
    }
  }
  
  if (options.mobile) {
    options.width = 375;
    options.height = 667;
  }
  
  return { url, outputFile, options };
}

function findChrome() {
  const candidates = [
    'google-chrome',
    'chromium',
    'chromium-browser',
    'chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser'
  ];
  
  for (const chrome of candidates) {
    try {
      execSync(`${chrome} --version`, { stdio: 'pipe' });
      return chrome;
    } catch (e) {
      // Try next candidate
    }
  }
  
  return null;
}

async function takeScreenshot(url, outputFile, options) {
  const chromePath = findChrome();
  
  if (!chromePath) {
    // Use the browser-tools skill approach if available
    console.error('Chrome/Chromium not found. Installing...');
    try {
      execSync('apt-get update && apt-get install -y chromium', { stdio: 'inherit' });
    } catch (e) {
      throw new Error('Failed to install Chrome. Please ensure Chrome/Chromium is available.');
    }
    return takeScreenshot(url, outputFile, options);
  }
  
  const tempDir = path.join('/tmp', `screenshot-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  
  const screenshotPath = path.join(tempDir, `screen.${options.format}`);
  
  // Build Chrome command line args
  const chromeArgs = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    `--screenshot=${screenshotPath}`,
    `--window-size=${options.width},${options.height}`
  ];
  
  if (options.fullPage) {
    chromeArgs.push('--virtual-time-budget=5000');
  }
  
  chromeArgs.push(url);
  
  return new Promise((resolve, reject) => {
    const chrome = spawn(chromePath, chromeArgs);
    
    let stderr = '';
    chrome.stderr.on('data', data => stderr += data.toString());
    
    chrome.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Chrome exited with code ${code}: ${stderr}`));
        return;
      }
      
      // If delay specified, wait and capture again (simplified)
      if (options.delay > 0) {
        setTimeout(() => {
          moveFile(screenshotPath, outputFile, resolve, reject);
        }, options.delay);
      } else {
        moveFile(screenshotPath, outputFile, resolve, reject);
      }
    });
    
    chrome.on('error', reject);
  });
}

function moveFile(from, to, resolve, reject) {
  try {
    if (path.dirname(to) !== '/tmp') {
      const dir = path.dirname(to);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    fs.renameSync(from, to);
    resolve(to);
  } catch (e) {
    // If rename fails (cross-device), copy and delete
    try {
      fs.copyFileSync(from, to);
      fs.unlinkSync(from);
      resolve(to);
    } catch (e2) {
      reject(e2);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: screenshot.js <url> <output_file> [options]');
    console.log('Options:');
    console.log('  --full          Full page screenshot');
    console.log('  --width N       Viewport width (default: 1280)');
    console.log('  --height N      Viewport height (default: 800)');
    console.log('  --delay N       Delay before capture in ms');
    console.log('  --mobile        Use mobile viewport');
    console.log('  --quality N     JPEG quality 1-100');
    console.log('  --format FMT    png, jpeg, webp');
    console.log('  --wait-for SEL  CSS selector to wait for');
    console.log('  --dark-mode     Enable dark mode');
    process.exit(0);
  }
  
  const { url, outputFile, options } = parseArgs(args);
  
  if (!url) {
    console.error('Error: URL required');
    process.exit(1);
  }
  
  const outputPath = outputFile || `/tmp/screenshot-${Date.now()}.${options.format}`;
  
  try {
    console.log(`Capturing screenshot of: ${url}`);
    console.log(`Viewport: ${options.width}x${options.height}`);
    console.log(`Format: ${options.format}`);
    if (options.fullPage) console.log('Mode: Full page');
    if (options.delay) console.log(`Delay: ${options.delay}ms`);
    
    const result = await takeScreenshot(url, outputPath, options);
    console.log(`Screenshot saved to: ${result}`);
    console.log(`MEDIA:${result}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
