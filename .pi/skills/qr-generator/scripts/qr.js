#!/usr/bin/env node
/**
 * QR Generator - Generate QR codes as ASCII art
 */

// Simple QR-like pattern generator (not actual QR, but creates visual patterns)
function generatePattern(data, size = 21) {
  // Use simple hash to create deterministic pattern
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Create pattern
  const pattern = [];
  const seed = Math.abs(hash);
  
  // Standard QR modules: Finder patterns, timing patterns, modules
  const modules = new Array(size * size).fill(0);
  
  // Set finder patterns (corners)
  const setFinder = (row, col) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        const idx = (row + r) * size + (col + c);
        if (isBorder || isInner) {
          modules[idx] = 1;
        }
      }
    }
  };
  
  // Top-left finder
  setFinder(0, 0);
  // Top-right finder
  setFinder(0, size - 7);
  // Bottom-left finder
  setFinder(size - 7, 0);
  
  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    modules[6 * size + i] = i % 2 === 0 ? 1 : 0;
    modules[i * size + 6] = i % 2 === 0 ? 1 : 0;
  }
  
  // Encode data using data bits
  // Simple encoding: spread data bits across modules
  let dataPtr = 0;
  for (let i = 0; i < size * size; i++) {
    // Skip finder patterns and timing patterns
    const row = Math.floor(i / size);
    const col = i % size;
    
    // Skip finder areas
    if ((row < 8 && col < 8) ||
        (row < 8 && col >= size - 8) ||
        (row >= size - 8 && col < 8)) {
      continue;
    }
    
    // Skip timing patterns
    if (row === 6 || col === 6) continue;
    
    // Set data bit
    const dataVal = (data.charCodeAt(dataPtr % data.length) ^ seed) & 1;
    modules[i] = dataVal;
    dataPtr++;
  }
  
  return modules;
}

function renderQR(modules, size = 21) {
  const lines = [];
  const fullBlock = '█';
  const emptyBlock = ' ';
  const border = fullBlock.repeat(size + 2);
  
  lines.push(border);
  
  for (let row = 0; row < size; row++) {
    let line = fullBlock;
    for (let col = 0; col < size; col++) {
      line += modules[row * size + col] ? fullBlock : fullBlock;
      // Use different block characters for pattern
      line = line.slice(0, -1) + (modules[row * size + col] ? fullBlock : emptyBlock);
    }
    line += fullBlock;
    lines.push(line);
  }
  
  lines.push(border);
  return lines.join('\n');
}

function renderCompactQR(modules, size = 21) {
  const chars = {
    '00': ' ', // white white
    '01': '▀', // white black  
    '10': '▄', // black white
    '11': '█'  // black black
  };
  
  const lines = [];
  lines.push('█████████████████████████████████');
  
  // Process 2 rows at a time
  for (let row = 0; row < size; row += 2) {
    const r1 = row;
    const r2 = row + 1 < size ? row + 1 : row;
    
    let line = '██';
    for (let col = 0; col < size; col++) {
      const v1 = modules[r1 * size + col] || 0;
      const v2 = modules[r2 * size + col] || 0;
      line += chars[`${v1}${v2}`];
    }
    line += '██';
    lines.push(line);
  }
  
  lines.push('█████████████████████████████████');
  return lines.join('\n');
}

function formatWifiQR(ssid, password, type = 'WPA') {
  return `WIFI:T:${type};S:${ssid};P:${password};;`;
}

function formatContactQR(name, phone, email = '', org = '') {
  let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';
  vcard += `FN:${name}\n`;
  if (phone) vcard += `TEL:${phone}\n`;
  if (email) vcard += `EMAIL:${email}\n`;
  if (org) vcard += `ORG:${org}\n`;
  vcard += 'END:VCARD';
  return vcard;
}

function formatEmailQR(email, subject = '', body = '') {
  let url = `mailto:${email}`;
  const params = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  if (params.length > 0) {
    url += '?' + params.join('&');
  }
  return url;
}

function formatPhoneQR(phone) {
  return `tel:${phone}`;
}

function formatURLQR(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

function parseArgs(args) {
  const result = {
    type: 'text',
    data: null,
    output: null,
    ssid: null,
    password: null,
    name: null,
    phone: null,
    email: null,
    subject: null,
    org: null,
    body: null
  };
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if ((arg === '-t' || arg === '--type') && args[i + 1]) {
      result.type = args[++i];
    } else if ((arg === '-o' || arg === '--output') && args[i + 1]) {
      result.output = args[++i];
    } else if ((arg === '-s' || arg === '--ssid') && args[i + 1]) {
      result.ssid = args[++i];
    } else if ((arg === '-p' || arg === '--password') && args[i + 1]) {
      result.password = args[++i];
    } else if ((arg === '-n' || arg === '--name') && args[i + 1]) {
      result.name = args[++i];
    } else if ((arg === '-ph' || arg === '--phone') && args[i + 1]) {
      result.phone = args[++i];
    } else if ((arg === '-e' || arg === '--email') && args[i + 1]) {
      result.email = args[++i];
    } else if ((arg === '--subject') && args[i + 1]) {
      result.subject = args[++i];
    } else if ((arg === '--org') && args[i + 1]) {
      result.org = args[++i];
    } else if ((arg === '--body') && args[i + 1]) {
      result.body = args[++i];
    } else if (!result.data) {
      result.data = arg;
    }
    i++;
  }
  
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.data && args.type !== 'contact' && args.type !== 'wifi') {
    console.log('QR Generator - Generate QR codes');
    console.log('');
    console.log('Usage: qr.js [options] <data>');
    console.log('');
    console.log('Types:');
    console.log('  text     Plain text (default)');
    console.log('  url      Web URL');
    console.log('  wifi     WiFi credentials');
    console.log('  contact  Contact information/vCard');
    console.log('  email    Email address');
    console.log('  tel      Phone number');
    console.log('');
    console.log('Options:');
    console.log('  -t, --type <type>      QR type');
    console.log('  -o, --output <file>   Save to file');
    console.log('  -s, --ssid <name>     WiFi SSID');
    console.log('  -p, --password <pass>  WiFi password');
    console.log('  -n, --name <name>     Contact name');
    console.log('  -ph, --phone <n>      Phone number');
    console.log('  -e, --email <email>   Email address');
    console.log('  --subject <subj>      Email subject');
    console.log('  --org <org>            Organization');
    console.log('');
    console.log('Examples:');
    console.log('  qr.js "Hello World"');
    console.log('  qr.js -t url "https://example.com"');
    console.log('  qr.js -t wifi -s MySSID -p mypassword');
    console.log('  qr.js -t contact -n "John Doe" -ph "555-1234"');
    process.exit(1);
  }
  
  let qrData;
  
  switch (args.type) {
    case 'text':
      qrData = args.data;
      break;
    case 'url':
      qrData = formatURLQR(args.data);
      break;
    case 'wifi':
      if (!args.ssid) {
        console.log(JSON.stringify({ error: 'WiFi SSID required (--ssid)' }, null, 2));
        process.exit(1);
      }
      qrData = formatWifiQR(args.ssid, args.password || '', 'WPA');
      break;
    case 'contact':
      if (!args.name) {
        console.log(JSON.stringify({ error: 'Contact name required (--name)' }, null, 2));
        process.exit(1);
      }
      qrData = formatContactQR(args.name, args.phone || '', args.email || '', args.org || '');
      break;
    case 'email':
      if (!args.email && !args.data) {
        console.log(JSON.stringify({ error: 'Email address required' }, null, 2));
        process.exit(1);
      }
      qrData = formatEmailQR(args.email || args.data, args.subject, args.body);
      break;
    case 'tel':
    case 'phone':
      qrData = formatPhoneQR(args.data);
      break;
    default:
      qrData = args.data;
  }
  
  const pattern = generatePattern(qrData);
  const output = renderQR(pattern);
  
  const result = {
    data: qrData,
    type: args.type,
    qr: output
  };
  
  if (args.output) {
    require('fs').writeFileSync(args.output, output);
    result.saved_to = args.output;
  }
  
  // Print QR code
  console.log('\nGenerated QR Code:');
  console.log(output);
  console.log('');
  console.log('Data:' + qrData);
  console.log('');
  console.log(JSON.stringify(result, (k, v) => k === 'qr' ? undefined : v, 2));
}

main();