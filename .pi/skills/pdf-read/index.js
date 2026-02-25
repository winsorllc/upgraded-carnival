const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function readPDF(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const dataBuffer = fs.readFileSync(filePath);
  const data = await PDFParse(dataBuffer);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  
  return {
    text: data.text,
    pages: data.numpages,
    info: data.info || {},
    version: data.version,
    metadata: data.metadata || null
  };
}

async function readPDFPages(filePath, maxPages = 10) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer, { 
    max: maxPages,
    normalizeWhitespace: true 
  });
  
  return {
    text: data.text,
    total_pages: data.numpages,
    pages_read: Math.min(maxPages, data.numpages)
  };
}

async function searchInPDF(filePath, searchTerm, limit = 20) {
  const result = await readPDF(filePath);
  const text = result.text;
  const lines = text.split('\n').filter(l => l.trim());
  
  const matches = [];
  for (let i = 0; i < lines.length && matches.length < limit; i++) {
    if (lines[i].toLowerCase().includes(searchTerm.toLowerCase())) {
      matches.push({
        line: i + 1,
        content: lines[i].trim().substring(0, 200)
      });
    }
  }
  
  return {
    total_matches: matches.length,
    page_count: result.pages,
    matches
  };
}

async function getPDFMetadata(filePath) {
  const result = await readPDF(filePath);
  return {
    pages: result.pages,
    title: result.info?.Title || null,
    author: result.info?.Author || null,
    subject: result.info?.Subject || null,
    keywords: result.info?.Keywords || null,
    creator: result.info?.Creator || null,
    producer: result.info?.Producer || null,
    creationDate: result.info?.CreationDate || null,
    modDate: result.info?.ModDate || null
  };
}

async function extractFullText(filePath) {
  const result = await readPDF(filePath);
  return result.text.replace(/\s+/g, ' ').trim();
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const filePath = args[1];
  
  if (!filePath) {
    console.error('Usage: node index.js <command> <filepath>');
    console.error('Commands: read, metadata, search, extract');
    process.exit(1);
  }
  
  try {
    let result;
    
    switch (command) {
      case 'read':
        const maxPages = args[2] ? parseInt(args[2]) : 10;
        result = await readPDFPages(filePath, maxPages);
        console.log(`Pages: ${result.pages_read}/${result.total_pages}`);
        console.log('\n--- TEXT PREVIEW ---\n');
        console.log(result.text.substring(0, 2000));
        break;
        
      case 'metadata':
        result = await getPDFMetadata(filePath);
        console.log(JSON.stringify(result, null, 2));
        break;
        
      case 'search':
        const searchTerm = args[2];
        if (!searchTerm) {
          console.error('Search term required');
          process.exit(1);
        }
        result = await searchInPDF(filePath, searchTerm);
        console.log(JSON.stringify(result, null, 2));
        break;
        
      case 'extract':
        result = await extractFullText(filePath);
        console.log(result);
        break;
        
      default:
        console.error(`Unknown command: ${command}`);
        console.error('Commands: read, metadata, search, extract');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  readPDF,
  readPDFPages,
  searchInPDF,
  getPDFMetadata,
  extractFullText
};
