#!/usr/bin/env node

/**
 * QR Code Generator Skill
 * Generate QR codes for URLs, WiFi, contacts, and more
 */

const fs = require('fs');
const path = require('path');

// Simple QR code generation using qrcode npm package
// Falls back to text-based QR if package not available
let QRCode;
try {
  QRCode = require('qrcode');
} catch (e) {
  QRCode = null;
}

function parseArgs(args) {
  const options = {
    size: 256,
    color: '#000000',
    background: '#ffffff',
    errorCorrectionLevel: 'M',
    type: 'auto'
  };
  
  let positional = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--size' && args[i + 1]) {
      options.size = parseInt(args[++i]);
    } else if (arg === '--color' && args[i + 1]) {
      options.color = args[++i];
    } else if (arg === '--bg' && args[i + 1]) {
      options.background = args[++i];
    } else if (arg === '--error' && args[i + 1]) {
      options.errorCorrectionLevel = args[++i].toUpperCase();
    } else if (arg === '--wifi') {
      options.type = 'wifi';
    } else if (arg === '--contact') {
      options.type = 'contact';
    } else if (arg === '--email') {
      options.type = 'email';
    } else if (arg === '--tel') {
      options.type = 'tel';
    } else if (arg === '--sms') {
      options.type = 'sms';
    } else if (!arg.startsWith('--')) {
      positional.push(arg);
    }
  }
  
  return { options, positional };
}

function encodeWiFi(ssid, password, encryption = 'WPA') {
  return `WIFI:T:${encryption};S:${ssid};P:${password};;`;
}

function encodeVCard(name, phone, email, org = '') {
  return `BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL:${phone}
EMAIL:${email}
ORG:${org}
END:VCARD`;
}

function encodeData(data, type) {
  if (type === 'auto') {
    if (data.startsWith('http://') || data.startsWith('https://')) {
      type = 'url';
    } else if (data.startsWith('mailto:')) {
      type = 'email';
    } else if (data.startsWith('tel:')) {
      type = 'tel';
    } else if (data.startsWith('sms:')) {
      type = 'sms';
    } else {
      type = 'text';
    }
  }
  
  return { data, type };
}

async function generateQR(data, outputFile, options) {
  const { size, color, background, errorCorrectionLevel } = options;
  
  if (!QRCode) {
    // Fallback: generate ASCII QR code
    console.error('Warning: qrcode package not available, using text-based QR');
    return generateTextQR(data);
  }
  
  await QRCode.toFile(outputFile, data, {
    width: size,
    margin: 4,
    color: {
      dark: color,
      light: background
    },
    errorCorrectionLevel
  });
  
  return outputFile;
}

function generateTextQR(data) {
  // Simple ASCII QR fallback (not a real QR, just visual representation)
  const lines = data.split('\n');
  console.log('QR Code Data:');
  console.log('─'.repeat(50));
  console.log(data);
  console.log('─'.repeat(50));
  console.log('Note: Install qrcode package for image generation:');
  console.log('  npm install qrcode');
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage:');
    console.log('  qr-generate.js <data> [output_file] [options]');
    console.log('  qr-generate.js --wifi "SSID:pass:type" <output>');
    console.log('  qr-generate.js --contact "name;phone;email;org" <output>');
    console.log('');
    console.log('Options:');
    console.log('  --size N       Set QR code size (default: 256)');
    console.log('  --color HEX    Set foreground color (default: #000000)');
    console.log('  --bg HEX       Set background color (default: #ffffff)');
    console.log('  --error L|M|Q|H  Set error correction level (default: M)');
    console.log('  --wifi         WiFi credential QR');
    console.log('  --contact      vCard contact QR');
    console.log('  --email        Email QR');
    console.log('  --tel          Phone QR');
    console.log('  --sms          SMS QR');
    process.exit(0);
  }
  
  const { options, positional } = parseArgs(args);
  
  if (positional.length < 1) {
    console.error('Error: Data required');
    process.exit(1);
  }
  
  const data = positional[0];
  const outputFile = positional[1] || '/tmp/qrcode.png';
  
  try {
    let qrData = data;
    
    // Parse special data types
    if (options.type === 'wifi') {
      const parts = data.split(':');
      if (parts.length >= 3) {
        qrData = encodeWiFi(parts[0], parts[1], parts[2]);
      } else {
        console.error('WiFi format: SSID:password:encryption');
        process.exit(1);
      }
    } else if (options.type === 'contact') {
      const parts = data.split(';');
      qrData = encodeVCard(parts[0] || '', parts[1] || '', parts[2] || '', parts[3] || '');
    }
    
    console.log(`Generating QR code...`);
    console.log(`Type: ${options.type}`);
    console.log(`Size: ${options.size}px`);
    console.log(`Output: ${outputFile}`);
    
    const result = await generateQR(qrData, outputFile, options);
    
    if (result) {
      console.log(`QR code saved to: ${result}`);
      console.log(`MEDIA:${result}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
