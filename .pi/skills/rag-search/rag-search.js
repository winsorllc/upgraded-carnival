#!/usr/bin/env node

/**
 * RAG Search - Semantic search using embeddings and vector storage
 * 
 * Usage:
 *   rag-search.js --index --path ./docs --chunk-size 500
 *   rag-search.js --search "how to configure authentication"
 *   rag-search.js --list
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Storage directory
const RAG_DIR = process.env.RAG_SEARCH_DIR || path.join(process.env.HOME || '/tmp', '.rag-search');
const INDEX_FILE = path.join(RAG_DIR, 'index.json');

// File extensions to index
const SUPPORTED_EXTENSIONS = [
  '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.py', 
  '.html', '.yaml', '.yml', '.css', '.xml', '.sql'
];

// Ignore patterns
const IGNORE_PATTERNS = [
  /node_modules/, /\.git/, /dist/, /build/, /\.next/,
  /coverage/, /\.cache/, /vendor/, /__pycache__/, /\.pytest_cache/,
  /package-lock\.json/, /yarn\.lock/, /\.min\.js$/, /\.map$/
];

// Simple TF-IDF based embeddings (local fallback)
class LocalEmbeddings {
  constructor() {
    this.vocabulary = new Map();
    this.documents = [];
  }
  
  // Simple tokenization
  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }
  
  // Build vocabulary and document frequencies
  buildVocabulary(chunks) {
    const docFreq = new Map();
    const totalDocs = chunks.length;
    
    chunks.forEach(chunk => {
      const tokens = [...new Set(this.tokenize(chunk.text))];
      tokens.forEach(token => {
        docFreq.set(token, (docFreq.get(token) || 0) + 1);
      });
    });
    
    // Build TF-IDF vectors
    this.documents = chunks.map(chunk => {
      const tokens = this.tokenize(chunk.text);
      const tf = new Map();
      
      tokens.forEach(token => {
        tf.set(token, (tf.get(token) || 0) + 1);
      });
      
      // Normalize by chunk length
      const vec = {};
      tf.forEach((count, token) => {
        const tfVal = count / tokens.length;
        const df = docFreq.get(token) || 1;
        const idf = Math.log(totalDocs / df);
        vec[token] = tfVal * idf;
      });
      
      return { chunk, vec };
    });
  }
  
  // Get embedding for text
  async getEmbedding(text) {
    const tokens = this.tokenize(text);
    const vec = {};
    
    tokens.forEach(token => {
      if (this.vocabulary.has(token)) {
        vec[token] = 1;
      }
    });
    
    // Return as array for compatibility
    return Object.values(vec);
  }
  
  // Search documents
  search(query, limit = 5) {
    const queryTokens = this.tokenize(query);
    const queryVec = {};
    
    queryTokens.forEach(token => {
      queryVec[token] = 1;
    });
    
    // Calculate cosine similarity
    const results = this.documents.map(doc => {
      let dotProduct = 0;
      let queryMag = 0;
      let docMag = 0;
      
      // Query magnitude
      Object.values(queryVec).forEach(v => {
        queryMag += v * v;
      });
      
      // Document magnitude  
      Object.values(doc.vec).forEach(v => {
        docMag += v * v;
      });
      
      // Dot product
      Object.keys(queryVec).forEach(key => {
        if (doc.vec[key]) {
          dotProduct += queryVec[key] * doc.vec[key];
        }
      });
      
      const similarity = queryMag && docMag 
        ? dotProduct / (Math.sqrt(queryMag) * Math.sqrt(docMag))
        : 0;
      
      return {
        chunk: doc.chunk,
        score: similarity
      };
    });
    
    // Sort by score and return top results
    return results
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => ({
        file: r.chunk.file,
        line: r.chunk.line,
        text: r.chunk.text,
        score: parseFloat(r.score.toFixed(4))
      }));
  }
}

// OpenAI embeddings (if API key available)
class OpenAIEmbeddings {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }
  
  async getEmbedding(text) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        input: text.slice(0, 8191),
        model: 'text-embedding-3-small'
      });
      
      const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/embeddings',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      };
      
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            if (response.data && response.data[0]) {
              resolve(response.data[0].embedding);
            } else {
              reject(new Error('No embedding returned'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
}

// Read file with encoding detection
function readFileContent(filePath) {
  try {
    // Try UTF-8 first
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    // Try with latin1 for binary files
    try {
      return fs.readFileSync(filePath, 'latin1');
    } catch (e2) {
      return null;
    }
  }
}

// Chunk text into smaller pieces
function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  const sentences = text.split(/[.!?\n]+/);
  
  let currentChunk = '';
  let lineNum = 1;
  
  // Track line numbers
  const lines = text.split('\n');
  let charCount = 0;
  
  lines.forEach(line => {
    if (currentChunk.length + line.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        line: lineNum - (currentChunk.split('\n').length - 1)
      });
      currentChunk = line + ' ';
      lineNum++;
    } else {
      currentChunk += line + ' ';
      if (line.trim()) {
        lineNum++;
      }
    }
  });
  
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      line: lineNum - (currentChunk.split('\n').length - 1)
    });
  }
  
  return chunks;
}

// Index documents
function indexDocuments(dirPath, chunkSize = 500) {
  const chunks = [];
  
  function scanDir(currentPath) {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          // Check if should ignore
          let shouldIgnore = false;
          for (const pattern of IGNORE_PATTERNS) {
            if (pattern.test(fullPath)) {
              shouldIgnore = true;
              break;
            }
          }
          
          if (!shouldIgnore) {
            scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (SUPPORTED_EXTENSIONS.includes(ext)) {
            const content = readFileContent(fullPath);
            if (content) {
              const fileChunks = chunkText(content, chunkSize);
              fileChunks.forEach(chunk => {
                chunks.push({
                  file: fullPath,
                  line: chunk.line,
                  text: chunk.text
                });
              });
            }
          }
        }
      }
    } catch (e) {
      // Skip directories that can't be read
    }
  }
  
  scanDir(dirPath);
  
  // Build index
  const embeddings = new LocalEmbeddings();
  embeddings.buildVocabulary(chunks);
  
  // Save index
  const index = {
    type: 'local',
    chunkSize,
    documentCount: chunks.length,
    files: [...new Set(chunks.map(c => c.file))],
    timestamp: new Date().toISOString()
  };
  
  ensureDir();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  
  return {
    success: true,
    indexed: chunks.length,
    files: index.files.length,
    index
  };
}

// Search documents
function searchDocuments(query, limit = 5) {
  if (!fs.existsSync(INDEX_FILE)) {
    return { success: false, error: 'No index found. Run --index first.' };
  }
  
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  
  // For local embeddings, we need to rebuild from original files
  // This is a simplified version that re-indexes
  const chunks = [];
  const files = index.files || [];
  
  files.forEach(file => {
    if (fs.existsSync(file)) {
      const content = readFileContent(file);
      if (content) {
        const fileChunks = chunkText(content, index.chunkSize);
        fileChunks.forEach(chunk => {
          chunks.push({
            file,
            line: chunk.line,
            text: chunk.text
          });
        });
      }
    }
  });
  
  const embeddings = new LocalEmbeddings();
  embeddings.buildVocabulary(chunks);
  const results = embeddings.search(query, limit);
  
  return {
    success: true,
    query,
    count: results.length,
    results
  };
}

// List indexed documents
function listIndex() {
  if (!fs.existsSync(INDEX_FILE)) {
    return { success: false, error: 'No index found. Run --index first.' };
  }
  
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  return {
    success: true,
    ...index,
    files: index.files
  };
}

// Clear index
function clearIndex() {
  if (fs.existsSync(INDEX_FILE)) {
    fs.unlinkSync(INDEX_FILE);
  }
  return { success: true, message: 'Index cleared' };
}

// Ensure storage directory exists
function ensureDir() {
  if (!fs.existsSync(RAG_DIR)) {
    fs.mkdirSync(RAG_DIR, { recursive: true });
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  index: false,
  path: null,
  chunkSize: 500,
  search: null,
  limit: 5,
  list: false,
  clear: false
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const nextArg = args[i + 1];
  
  switch (arg) {
    case '--index':
      options.index = true;
      break;
    case '--path':
      options.path = nextArg;
      i++;
      break;
    case '--chunk-size':
      options.chunkSize = parseInt(nextArg);
      i++;
      break;
    case '--search':
      options.search = nextArg;
      i++;
      break;
    case '--limit':
      options.limit = parseInt(nextArg);
      i++;
      break;
    case '--list':
      options.list = true;
      break;
    case '--clear':
      options.clear = true;
      break;
    case '--help':
    case '-h':
      console.log(`
RAG Search - Semantic search using embeddings

Usage:
  rag-search.js --index --path ./docs --chunk-size 500
  rag-search.js --search "how to configure authentication"
  rag-search.js --list

Options:
  --index            Index documents
  --path <path>      Path to documents (for index)
  --chunk-size <n>   Chunk size (default: 500)
  --search <query>   Search query
  --limit <n>        Max results (default: 5)
  --list             List indexed documents
  --clear            Clear index

Examples:
  rag-search.js --index --path ./docs
  rag-search.js --search "authentication"
  rag-search.js --search "deployment" --limit 10
      `.trim());
      process.exit(0);
  }
}

// Main execution
function main() {
  if (options.index) {
    if (!options.path) {
      console.error('Error: --path is required for --index');
      process.exit(1);
    }
    
    if (!fs.existsSync(options.path)) {
      console.error('Error: Path does not exist:', options.path);
      process.exit(1);
    }
    
    console.log(JSON.stringify(indexDocuments(options.path, options.chunkSize), null, 2));
  } else if (options.search) {
    console.log(JSON.stringify(searchDocuments(options.search, options.limit), null, 2));
  } else if (options.list) {
    console.log(JSON.stringify(listIndex(), null, 2));
  } else if (options.clear) {
    console.log(JSON.stringify(clearIndex(), null, 2));
  } else {
    console.log('Use --help for usage information');
  }
}

main();
