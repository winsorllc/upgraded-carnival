#!/usr/bin/env node
/**
 * Image Metadata Extractor - Get dimensions and info from images
 */
const fs = require('fs');
const path = require('path');

function parseArgs(args) {
  const result = {
    files: [],
    basic: false,
    format: 'text'
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file': result.files.push(args[++i]); break;
      case '--basic': result.basic = true; break;
      case '--json': result.format = 'json'; break;
    }
  }
  return result;
}

function readUInt16BE(buffer, offset) {
  return (buffer[offset] << 8) | buffer[offset + 1];
}

function readUInt16LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8);
}

function readUInt32BE(buffer, offset) {
  return (buffer[offset] << 24) | (buffer[offset + 1] << 16) | (buffer[offset + 2] << 8) | buffer[offset + 3];
}

function readUInt32LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16) | (buffer[offset + 3] << 24);
}

function getImageType(buffer) {
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'PNG';
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'JPEG';
  }
  // GIF: GIF87a or GIF89a
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'GIF';
  }
  // BMP: BM
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
    return 'BMP';
  }
  // WebP: RIFF....WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return 'WebP';
    }
  }
  return 'Unknown';
}

function getPNGDimensions(buffer) {
  // PNG IHDR chunk starts at byte 16
  // Width: bytes 16-19, Height: bytes 20-23
  return {
    width: readUInt32BE(buffer, 16),
    height: readUInt32BE(buffer, 20),
    bitDepth: buffer[24],
    colorType: buffer[25]
  };
}

function getGIFDimensions(buffer) {
  // GIF Logical Screen Descriptor
  // Width: bytes 6-7 (little endian)
  // Height: bytes 8-9 (little endian)
  return {
    width: readUInt16LE(buffer, 6),
    height: readUInt16LE(buffer, 8),
    bitDepth: ((buffer[10] & 0x70) >> 4) + 1,
    hasGlobalColorTable: (buffer[10] & 0x80) !== 0
  };
}

function getBMPDimensions(buffer) {
  // BMP DIB header
  // Width: bytes 18-21 (little endian)
  // Height: bytes 22-25 (little endian)
  const dibHeaderSize = readUInt32LE(buffer, 14);
  if (dibHeaderSize === 12) {
    // BITMAPCOREHEADER
    return {
      width: readUInt16LE(buffer, 18),
      height: readUInt16LE(buffer, 20),
      bitDepth: readUInt16LE(buffer, 24)
    };
  }
  // BITMAPINFOHEADER and later
  return {
    width: readUInt32LE(buffer, 18),
    height: readUInt32LE(buffer, 22),
    bitDepth: readUInt16LE(buffer, 28)
  };
}

function getJPEGDimensions(buffer) {
  // JPEG uses segments
  let offset = 2; // Skip SOI marker
  let width, height;
  
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xFF) {
      offset++;
      continue;
    }
    
    const marker = buffer[offset + 1];
    
    // Skip padding
    if (marker === 0xFF) {
      offset++;
      continue;
    }
    
    // SOF markers (Start Of Frame)
    if ((marker >= 0xC0 && marker <= 0xCF) && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      height = readUInt16BE(buffer, offset + 5);
      width = readUInt16BE(buffer, offset + 7);
      const bitDepth = buffer[offset + 4];
      const components = buffer[offset + 9];
      return { width, height, bitDepth, components };
    }
    
    // Skip other segments
    if (marker === 0xD8 || marker === 0xD9) {
      offset += 2;
    } else if (marker === 0xDA) {
      // Start of scan - no more metadata
      break;
    } else {
      const length = readUInt16BE(buffer, offset + 2);
      offset += 2 + length;
    }
  }
  
  return { width, height };
}

function getWebPDimensions(buffer) {
  // WebP VP8 or VP8L chunk
  const chunkOffset = 12; // Skip RIFF header and VP8/VP8L
  const chunkType = buffer.slice(chunkOffset, chunkOffset + 4).toString('ascii');
  
  if (chunkType === 'VP8 ' && buffer[chunkOffset + 4] === 0x9d && buffer[chunkOffset + 5] === 0x01 && buffer[chunkOffset + 6] === 0x2a) {
    // VP8 bitstream
    const bits = readUInt16LE(buffer, chunkOffset + 6);
    const width = bits & 0x3FFF;
    const height = readUInt16LE(buffer, chunkOffset + 8) & 0x3FFF;
    return { width, height };
  }
  
  if (chunkType === 'VP8L') {
    // VP8L (lossless)
    const bits = readUInt32LE(buffer, chunkOffset + 4);
    const width = (bits & 0x3FFF) + 1;
    const height = ((bits >> 14) & 0x3FFF) + 1;
    return { width, height };
  }
  
  return { width: null, height: null };
}

function extractMetadata(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const buffer = fs.readFileSync(filePath);
    const type = getImageType(buffer);
    
    let dimensions = { width: null, height: null };
    let extras = {};
    
    switch (type) {
      case 'PNG':
        dimensions = getPNGDimensions(buffer);
        extras = { bitDepth: dimensions.bitDepth, colorType: dimensions.colorType };
        break;
      case 'JPEG':
        dimensions = getJPEGDimensions(buffer);
        extras = { bitDepth: dimensions.bitDepth, components: dimensions.components };
        break;
      case 'GIF':
        dimensions = getGIFDimensions(buffer);
        extras = { hasGlobalColorTable: dimensions.hasGlobalColorTable };
        break;
      case 'BMP':
        dimensions = getBMPDimensions(buffer);
        extras = { bitDepth: dimensions.bitDepth };
        break;
      case 'WebP':
        dimensions = getWebPDimensions(buffer);
        break;
    }
    
    return {
      file: filePath,
      format: type,
      width: dimensions.width,
      height: dimensions.height,
      fileSize: stats.size,
      fileSizeHuman: formatBytes(stats.size),
      ...extras
    };
  } catch (e) {
    return {
      file: filePath,
      error: e.message
    };
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (args.files.length === 0) {
    console.log('Image Metadata Extractor');
    console.log('');
    console.log('Usage: image-meta.js --file <path> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --file <path>    Image file(s) to analyze (can be used multiple times)');
    console.log('  --basic          Show only basic info');
    console.log('  --json           Output as JSON');
    process.exit(1);
  }
  
  const results = [];
  
  for (const file of args.files) {
    if (!fs.existsSync(file)) {
      console.error(`Error: File not found: ${file}`);
      continue;
    }
    const metadata = extractMetadata(file);
    results.push(metadata);
  }
  
  if (results.length === 0) {
    process.exit(1);
  }
  
  if (args.format === 'json') {
    console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
  } else {
    for (const meta of results) {
      if (meta.error) {
        console.log(`File: ${meta.file}`);
        console.log(`  Error: ${meta.error}`);
      } else if (args.basic) {
        console.log(`${meta.file}: ${meta.width}x${meta.height} (${meta.format})`);
      } else {
        console.log(`File: ${meta.file}`);
        console.log(`  Format: ${meta.format}`);
        console.log(`  Dimensions: ${meta.width}x${meta.height}`);
        console.log(`  File Size: ${meta.fileSizeHuman} (${meta.fileSize} bytes)`);
        if (meta.bitDepth) console.log(`  Bit Depth: ${meta.bitDepth}`);
        if (meta.components) console.log(`  Color Components: ${meta.components}`);
        console.log('');
      }
    }
  }
}

main();