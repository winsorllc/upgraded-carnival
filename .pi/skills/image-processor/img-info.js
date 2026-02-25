#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function getImageInfo(filePath) {
  const stats = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  
  // Detect format from extension
  const formats = {
    '.jpg': 'JPEG', '.jpeg': 'JPEG', '.png': 'PNG',
    '.gif': 'GIF', '.webp': 'WebP', '.svg': 'SVG'
  };
  
  return {
    path: filePath,
    name: path.basename(filePath),
    size: stats.size,
    size_human: `${(stats.size / 1024).toFixed(2)} KB`,
    format: formats[ext] || 'Unknown',
    extension: ext,
    modified: stats.mtime.toISOString()
  };
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: img-info.js <image-path>');
  process.exit(1);
}

const info = getImageInfo(file);
console.log('📷 Image Info\n');
Object.entries(info).forEach(([k, v]) => {
  console.log(`  ${k}: ${v}`);
});

module.exports = { getImageInfo };
