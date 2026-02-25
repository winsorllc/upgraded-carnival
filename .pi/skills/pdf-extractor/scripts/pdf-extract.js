#!/usr/bin/env node
/**
 * PDF Extractor - Extract text and metadata from PDF files
 */
const fs = require('fs');
const path = require('path');

// Simple PDF text extraction without external dependencies
// Uses basic PDF parsing for text streams

function parseArgs(args) {
  const result = {
    file: null,
    pages: null,
    metadata: false,
    info: false,
    format: 'text'
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file': result.file = args[++i]; break;
      case '--pages': result.pages = args[++i]; break;
      case '--metadata': result.metadata = true; break;
      case '--info': result.info = true; break;
      case '--json': result.format = 'json'; break;
    }
  }
  return result;
}

function extractPDFInfo(data) {
  const header = data.slice(0, 1024).toString('utf8');
  const versionMatch = header.match(/%PDF-(\d\.\d)/);
  const version = versionMatch ? versionMatch[1] : 'unknown';
  
  // Count pages by finding /Type /Page objects
  const pageMatches = data.toString('utf8').match(/\/Type\s*\/Page[^s]/g);
  const pageCount = pageMatches ? pageMatches.length : 0;
  
  // Look for metadata
  const text = data.toString('utf8');
  const titleMatch = text.match(/\/Title\s*\(([^)]+)\)/);
  const authorMatch = text.match(/\/Author\s*\(([^)]+)\)/);
  const creatorMatch = text.match(/\/Creator\s*\(([^)]+)\)/);
  const producerMatch = text.match(/\/Producer\s*\(([^)]+)\)/);
  const creationMatch = text.match(/\/CreationDate\s*\(([^)]+)\)/);
  
  return {
    version,
    pageCount,
    title: titleMatch ? titleMatch[1] : null,
    author: authorMatch ? authorMatch[1] : null,
    creator: creatorMatch ? creatorMatch[1] : null,
    producer: producerMatch ? producerMatch[1] : null,
    creationDate: creationMatch ? creationMatch[1] : null,
    isEncrypted: text.includes('/Encrypt')
  };
}

function extractTextFromPDF(data) {
  const text = data.toString('utf8');
  const extracted = [];
  
  // Extract text within parentheses (basic text streams)
  const regex = /\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    // Filter out binary/non-readable characters
    const clean = match[1].replace(/[^\x20-\x7E\n\r\t]/g, '');
    if (clean.length > 2) {
      extracted.push(clean);
    }
  }
  
  return extracted.join(' ').substring(0, 100000); // Limit output
}

function extractPageRange(text, pageRange, totalPages) {
  if (!pageRange) return text;
  
  const [start, end] = pageRange.split('-').map(Number);
  const lines = text.split(/\n|\r/).filter(l => l.trim());
  const chunkSize = Math.ceil(lines.length / (totalPages || 1));
  
  const startLine = (start - 1) * chunkSize;
  const endLine = end ? end * chunkSize : start * chunkSize;
  
  return lines.slice(startLine, endLine).join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.file) {
    console.log('PDF Extractor - Extract text and metadata from PDF files');
    console.log('');
    console.log('Usage: pdf-extract.js --file <path> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --file <path>      PDF file to process');
    console.log('  --pages <range>    Extract specific pages (e.g., 1-5)');
    console.log('  --metadata         Show metadata only');
    console.log('  --info             Show document info');
    console.log('  --json             Output as JSON');
    process.exit(1);
  }
  
  if (!fs.existsSync(args.file)) {
    console.error(`Error: File not found: ${args.file}`);
    process.exit(1);
  }
  
  try {
    const data = fs.readFileSync(args.file);
    const info = extractPDFInfo(data);
    
    if (args.info) {
      if (args.format === 'json') {
        console.log(JSON.stringify({
          file: args.file,
          ...info
        }, null, 2));
      } else {
        console.log(`PDF Information:`);
        console.log(`  File: ${args.file}`);
        console.log(`  PDF Version: ${info.version}`);
        console.log(`  Pages: ${info.pageCount}`);
        console.log(`  Encrypted: ${info.isEncrypted ? 'Yes' : 'No'}`);
      }
      process.exit(0);
    }
    
    if (args.metadata) {
      if (args.format === 'json') {
        console.log(JSON.stringify({
          file: args.file,
          metadata: {
            title: info.title,
            author: info.author,
            creator: info.creator,
            producer: info.producer,
            creationDate: info.creationDate
          }
        }, null, 2));
      } else {
        console.log(`PDF Metadata:`);
        console.log(`  File: ${args.file}`);
        console.log(`  Title: ${info.title || 'Not set'}`);
        console.log(`  Author: ${info.author || 'Not set'}`);
        console.log(`  Creator: ${info.creator || 'Not set'}`);
        console.log(`  Producer: ${info.producer || 'Not set'}`);
        console.log(`  Creation Date: ${info.creationDate || 'Not set'}`);
      }
      process.exit(0);
    }
    
    // Extract text
    const text = extractTextFromPDF(data);
    const pageText = args.pages ? extractPageRange(text, args.pages, info.pageCount) : text;
    
    if (args.format === 'json') {
      console.log(JSON.stringify({
        file: args.file,
        info,
        text: pageText.substring(0, 10000)
      }, null, 2));
    } else {
      console.log(pageText);
    }
    
  } catch (e) {
    console.error(`Error processing PDF: ${e.message}`);
    process.exit(1);
  }
}

main();