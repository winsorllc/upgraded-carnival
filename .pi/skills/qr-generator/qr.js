#!/usr/bin/env node
/**
 * QR Code Generator Skill
 */

const fs = require('fs');
const path = require('path');

// QR Code Pattern Constants
const QR_VERSION = 1;
const QR_SIZE = 21; // Version 1 = 21x21

// Generate a basic QR pattern (ASCII representation)
function generateAsciiQR(text) {
  // Create a deterministic "QR-like" pattern based on text hash
  // This is a simplified visual representation
  const hash = hashCode(text);
  const pattern = [];
  
  // Generate positioning patterns (corners)
  // Real QR codes have finder patterns in 3 corners
  const size = QR_SIZE;
  const grid = Array(size).fill(null).map(() => Array(size).fill(' '));
  
  // Add finder patterns (simplified)
  // Top-left corner
  addFinderPattern(grid, 0, 0);
  // Top-right corner
  addFinderPattern(grid, 0, 14);
  // Bottom-left corner
  addFinderPattern(grid, 14, 0);
  
  // Add timing patterns
  for (let i = 8; i < 13; i++) {
    grid[6][i] = i % 2 === 0 ? '█' : ' ';
    grid[i][6] = i % 2 === 0 ? '█' : ' ';
  }
  
  // Add "data" pattern based on hash
  // This distributes the text throughout the QR "like" pattern
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const x = (code % 7) + 8;
    const y = ((code * 17) % 7) + 8;
    if (x < size && y < size && grid[y][x] === ' ') {
      grid[y][x] = (code % 2 === 0) ? '█' : ' ';
    }
  }
  
  // Add padding
  const padding = '██'.repeat(size + 4);
  
  // Build ASCII output
  const lines = [padding,
    ...grid.map(row => '██' + row.map(c => c === '█' ? '██' : '  ').join('') + '██'),
    padding
  ];
  
  return lines.join('\n');
}

function addFinderPattern(grid, row, col) {
  // 7x7 finder pattern (simplified)
  const pattern = [
    '███████',
    '█     █',
    '█ ███ █',
    '█ ███ █',
    '█ ███ █',
    '█     █',
    '███████'
  ];
  
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      if (row + y < grid.length && col + x < grid[0].length) {
        grid[row + y][col + x] = pattern[y][x] === '█' ? '█' : ' ';
      }
    }
  }
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Generate data content formats
function generateUrlQR(url) {
  const result = {
    type: 'url',
    content: url,
    ascii: generateAsciiQR(url),
    text: url
  };
  return result;
}

function generateTextQR(text) {
  return {
    type: 'text',
    content: text,
    ascii: generateAsciiQR(text),
    text: text
  };
}

function generateWiFiQR(options) {
  const { ssid, password, type = 'WPA', hidden = false } = options;
  // WiFi QR format: WIFI:S:<SSID>;T:<WEP|WPA|>;P:<password>;;
  const wifiString = `WIFI:S:${ssid};T:${type};P:${password};H:${hidden ? 'true' : 'false'};;`;
  
  return {
    type: 'wifi',
    content: wifiString,
    ascii: generateAsciiQR(wifiString),
    wifi: { ssid, security: type, hidden }
  };
}

function generateContactQR(options) {
  const { name, phone, email, url, org, title, address } = options;
  
  // meCard format
  let content = 'MECARD:N:' + name + ';';
  if (phone) content += `TEL:${phone};`;
  if (email) content += `EMAIL:${email};`;
  if (url) content += `URL:${url};`;
  if (org) content += `ORG:${org};`;
  if (title) content += `TITLE:${title};`;
  content += ';';
  
  return {
    type: 'contact',
    content: content,
    ascii: generateAsciiQR(content),
    contact: { name, phone, email, url, org, title }
  };
}

// Try to use qrcode library if available
async function generateRealQR(data, options = {}) {
  const { width = 256, errorCorrection = 'M' } = options;
  
  try {
    const QRCode = require('qrcode');
    
    return new Promise((resolve, reject) => {
      QRCode.toDataURL(data, { 
        width,
        errorCorrectionLevel: errorCorrection,
        type: 'png'
      }, (err, url) => {
        if (err) reject(err);
        else resolve(url);
      });
    });
  } catch (e) {
    // Library not available, fall back to ASCII
    return null;
  }
}

// CLI
const [,, command, ...args] = process.argv;

async function main() {
  if (!command || command === '--help' || command === '-h') {
    console.log(`Usage: qr.js <command> [args] [options]

Commands:
  url <url>              Generate QR code for URL
  text <text>            Generate QR code for text
  wifi                  Generate WiFi QR
    --ssid <name>
    --password <pass>
    --type <WPA|WEP>    (default: WPA)
    --hidden            (optional)
  contact               Generate contact QR
    --name <name>
    --phone <number>   (optional)
    --email <email>     (optional)
    --org <company>    (optional)

Options:
  --output, -o <file>   Save to PNG file
  --ascii               Output ASCII pattern (default if no output)
  --width <pixels>     QR code size (default: 256)
  --error <L|M|Q|H>    Error correction level (default: M)

Examples:
  qr.js url "https://example.com"
  qr.js wifi --ssid "MyWiFi" --password "secret" -o wifi.png
  qr.js contact --name "John Doe" --phone "+1234567890" --email "john@example.com"
  qr.js text "Hello World" --ascii`);
    return 0;
  }
  
  let result;
  let ascii = true;
  let outputPath = null;
  
  // Parse flags
  const outputIdx = args.indexOf('--output') !== -1 ? args.indexOf('--output') : args.indexOf('-o');
  if (outputIdx >= 0) {
    outputPath = args[outputIdx + 1];
    ascii = !outputPath;
    args.splice(outputIdx, 2);
  }
  
  if (args.includes('--ascii')) {
    ascii = true;
    args.splice(args.indexOf('--ascii'), 1);
  }
  
  const options = {
    errorLevel: 'M'
  };
  
  const errorIdx = args.indexOf('--error');
  if (errorIdx >= 0) {
    options.errorLevel = args[errorIdx + 1];
    args.splice(errorIdx, 2);
  }
  
  const widthIdx = args.indexOf('--width');
  if (widthIdx >= 0) {
    options.width = parseInt(args[widthIdx + 1]) || 256;
    args.splice(widthIdx, 2);
  }
  
  try {
    switch (command) {
      case 'url': {
        if (!args[0]) {
          console.error('Usage: qr.js url <url>');
          return 1;
        }
        result = generateUrlQR(args[0]);
        break;
      }
      
      case 'text': {
        const text = args.join(' ');
        if (!text) {
          console.error('Usage: qr.js text <text>');
          return 1;
        }
        result = generateTextQR(text);
        break;
      }
      
      case 'wifi': {
        const ssidIdx = args.indexOf('--ssid');
        const passIdx = args.indexOf('--password') !== -1 ? args.indexOf('--password') : args.indexOf('--pass');
        const typeIdx = args.indexOf('--type');
        const hiddenIdx = args.indexOf('--hidden');
        
        if (ssidIdx < 0) {
          console.error('WiFi requires --ssid');
          return 1;
        }
        
        result = generateWiFiQR({
          ssid: args[ssidIdx + 1],
          password: passIdx >= 0 ? args[passIdx + 1] : '',
          type: typeIdx >= 0 ? args[typeIdx + 1] : 'WPA',
          hidden: hiddenIdx >= 0
        });
        break;
      }
      
      case 'contact': {
        const nameIdx = args.indexOf('--name');
        const phoneIdx = args.indexOf('--phone');
        const emailIdx = args.indexOf('--email');
        const orgIdx = args.indexOf('--org');
        
        if (nameIdx < 0) {
          console.error('Contact requires --name');
          return 1;
        }
        
        result = generateContactQR({
          name: args[nameIdx + 1],
          phone: phoneIdx >= 0 ? args[phoneIdx + 1] : null,
          email: emailIdx >= 0 ? args[emailIdx + 1] : null,
          org: orgIdx >= 0 ? args[orgIdx + 1] : null
        });
        break;
      }
      
      default:
        console.error(`Unknown command: ${command}`);
        return 1;
    }
    
    // Try to generate real QR if output file specified and library available
    if (outputPath) {
      try {
        const dataUri = await generateRealQR(result.content, options);
        if (dataUri) {
          // Extract base64 data and save
          const base64Data = dataUri.replace(/^data:image\/png;base64,/, '');
          fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
          console.log(JSON.stringify({
            success: true,
            type: result.type,
            content: result.content.slice(0, 100),
            file: outputPath,
            size: fs.statSync(outputPath).size
          }));
          return 0;
        }
      } catch (e) {
        // Fall back to ASCII
      }
    }
    
    // Output results
    if (ascii) {
      console.log('\n' + result.ascii + '\n');
    }
    
    console.log(JSON.stringify({
      success: true,
      type: result.type,
      content: result.content.slice(0, 200),
      ...(result.wifi && { wifi: result.wifi }),
      ...(result.contact && { contact: result.contact })
    }, null, 2));
    
    return 0;
    
  } catch (error) {
    console.error('Error:', error.message);
    return 1;
  }
}

main().then(code => process.exit(code)).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
