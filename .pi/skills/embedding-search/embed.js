#!/usr/bin/env node
/**
 * Embedding Search - Semantic document search
 * Inspired by ZeroClaw's memory/embeddings system
 */

const fs = require('fs');
const path = require('path');

// Simple word-based embedding simulation (TF-IDF-like)
class EmbeddingSearch {
  constructor() {
    this.index = null;
    this.documents = [];
    this.wordIndex = new Map();
  }

  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2 && !this.isStopWord(w));
  }

  isStopWord(word) {
    const stopWords = new Set([
      'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are',
      'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'and', 'or',
      'but', 'if', 'then', 'than', 'so', 'very', 'just', 'now', 'here', 'there',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
    ]);
    return stopWords.has(word);
  }

  // Create a simple document vector representation
  vectorize(text) {
    const tokens = this.tokenize(text);
    const vector = new Map();
    
    // Term frequency with position weighting
    tokens.forEach((token, idx) => {
      const current = vector.get(token) || 0;
      // Words at the start get slightly higher weight
      const positionWeight = 1 + (tokens.length - idx) / tokens.length * 0.5;
      vector.set(token, current + positionWeight);
    });

    // Bigrams for context
    for (let i = 0; i < tokens.length - 1; i++) {
      const bigram = `${tokens[i]}_${tokens[i + 1]}`;
      vector.set(bigram, (vector.get(bigram) || 0) + 1.5);
    }

    return vector;
  }

  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    // Calculate dot product
    vecA.forEach((val, key) => {
      normA += val * val;
      if (vecB.has(key)) {
        dotProduct += val * vecB.get(key);
      }
    });

    vecB.forEach(val => {
      normB += val * val;
    });

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  keywordScore(query, text) {
    const queryTokens = this.tokenize(query);
    const textTokens = this.tokenize(text);
    const textSet = new Set(textTokens);
    
    let matches = 0;
    let totalScore = 0;

    queryTokens.forEach(token => {
      if (textSet.has(token)) {
        matches++;
        // Bonus for exact word boundary matches
        const regex = new RegExp(`\\b${token}\\b`, 'i');
        if (regex.test(text)) {
          totalScore += 2;
        } else {
          totalScore += 1;
        }
      }
    });

    return queryTokens.length > 0 ? totalScore / queryTokens.length : 0;
  }

  indexDocument(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    
    const doc = {
      id: path.basename(filePath),
      path: filePath,
      content: content.substring(0, 10000), // Limit stored content
      vector: this.vectorize(content),
      wordCount: content.split(/\s+/).length,
      modified: stats.mtime.toISOString(),
    };

    return doc;
  }

  indexDirectory(dirPath) {
    const files = this.getAllFiles(dirPath);
    this.documents = [];

    files.forEach(file => {
      try {
        if (file.endsWith('.md') || file.endsWith('.txt') || file.endsWith('.js') || 
            file.endsWith('.json') || file.endsWith('.ts')) {
          const doc = this.indexDocument(file);
          this.documents.push(doc);
        }
      } catch (e) {
        console.error(`Error indexing ${file}: ${e.message}`);
      }
    });

    return this.documents.length;
  }

  getAllFiles(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
        this.getAllFiles(fullPath, files);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    });

    return files;
  }

  search(query, options = {}) {
    const { 
      topK = 5, 
      hybrid = true, 
      keywordWeight = 0.3, 
      semanticWeight = 0.7,
      threshold = 0.1 
    } = options;

    const queryVector = this.vectorize(query);
    const results = [];

    this.documents.forEach(doc => {
      let score = 0;

      if (hybrid) {
        const semanticScore = this.cosineSimilarity(queryVector, doc.vector);
        const kwScore = this.keywordScore(query, doc.content);
        score = (semanticScore * semanticWeight) + (kwScore * keywordWeight);
      } else {
        score = this.cosineSimilarity(queryVector, doc.vector);
      }

      if (score >= threshold) {
        results.push({
          document: doc,
          score: Math.round(score * 1000) / 1000,
        });
      }
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  saveIndex(outputPath) {
    const data = {
      version: '1.0.0',
      created: new Date().toISOString(),
      documentCount: this.documents.length,
      documents: this.documents.map(d => ({
        ...d,
        vector: Array.from(d.vector.entries()), // Convert Map to array for JSON
      })),
    };
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  }

  loadIndex(indexPath) {
    const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    this.documents = data.documents.map(d => ({
      ...d,
      vector: new Map(d.vector),
    }));
    return this.documents.length;
  }

  printResults(results, query) {
    const colors = {
      reset: '\x1b[0m',
      cyan: '\x1b[36m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      gray: '\x1b[90m',
    };

    console.log(`\n${colors.cyan}Search Results for: "${query}"${colors.reset}\n`);

    if (results.length === 0) {
      console.log(`${colors.yellow}No results found${colors.reset}`);
      return;
    }

    results.forEach((result, idx) => {
      console.log(`${colors.cyan}[${idx + 1}]${colors.reset} ${colors.green}${result.document.id}${colors.reset}`);
      console.log(`${colors.gray}Score: ${result.score} | Words: ${result.document.wordCount}${colors.reset}`);
      
      // Show snippet
      const content = result.document.content.substring(0, 200);
      console.log(`${colors.gray}${content}...${colors.reset}`);
      console.log();
    });
  }

  run() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === '--help') {
      console.log('Embedding Search - Semantic document search');
      console.log('');
      console.log('Commands:');
      console.log('  index <directory>              Index all documents in directory');
      console.log('  search <query>                Search indexed documents');
      console.log('  add <file>                   Add single file to index');
      console.log('');
      console.log('Options:');
      console.log('  --output, -o FILE            Output file for index');
      console.log('  --index FILE                 Load existing index');
      console.log('  --top-k N                    Number of results (default: 5)');
      console.log('  --hybrid                     Use hybrid search (default: true)');
      console.log('  --keyword-weight W           Weight for keyword matching (0-1)');
      console.log('  --semantic-weight W          Weight for semantic matching (0-1)');
      console.log('  --threshold T                Minimum score threshold');
      console.log('');
      console.log('Examples:');
      console.log('  embed.js index ./docs --output index.json');
      console.log('  embed.js search "machine learning" --index index.json');
      console.log('  embed.js search "deployment" --hybrid --top-k 10');
      process.exit(0);
    }

    // Parse options
    let outputPath = null;
    let indexPath = null;
    let topK = 5;
    let hybrid = true;
    let keywordWeight = 0.3;
    let semanticWeight = 0.7;
    let threshold = 0.1;

    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--output' || args[i] === '-o') outputPath = args[++i];
      else if (args[i] === '--index') indexPath = args[++i];
      else if (args[i] === '--top-k') topK = parseInt(args[++i]) || 5;
      else if (args[i] === '--hybrid') hybrid = true;
      else if (args[i] === '--no-hybrid') hybrid = false;
      else if (args[i] === '--keyword-weight') keywordWeight = parseFloat(args[++i]) || 0.3;
      else if (args[i] === '--semantic-weight') semanticWeight = parseFloat(args[++i]) || 0.7;
      else if (args[i] === '--threshold') threshold = parseFloat(args[++i]) || 0.1;
    }

    switch (command) {
      case 'index': {
        const dirPath = args[1];
        if (!dirPath) {
          console.error('Please provide a directory path');
          process.exit(1);
        }
        
        console.log(`Indexing directory: ${dirPath}`);
        const count = this.indexDirectory(dirPath);
        
        const outFile = outputPath || path.join(dirPath, 'embeddings-index.json');
        this.saveIndex(outFile);
        console.log(`\nIndexed ${count} documents`);
        console.log(`Index saved to: ${outFile}`);
        break;
      }

      case 'search': {
        const query = args[1];
        if (!query) {
          console.error('Please provide a search query');
          process.exit(1);
        }

        if (!indexPath) {
          console.error('Please provide --index FILE');
          process.exit(1);
        }

        this.loadIndex(indexPath);
        const results = this.search(query, { topK, hybrid, keywordWeight, semanticWeight, threshold });
        this.printResults(results, query);
        break;
      }

      case 'add': {
        const filePath = args[1];
        if (!filePath) {
          console.error('Please provide a file path');
          process.exit(1);
        }

        if (indexPath && fs.existsSync(indexPath)) {
          this.loadIndex(indexPath);
        }

        const doc = this.indexDocument(filePath);
        this.documents.push(doc);
        
        const outFile = indexPath || 'embeddings-index.json';
        this.saveIndex(outFile);
        console.log(`Added: ${doc.id} (total: ${this.documents.length})`);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const search = new EmbeddingSearch();
  search.run();
}

module.exports = { EmbeddingSearch };
