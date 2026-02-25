const fs = require('fs');
const path = require('path');

class SemanticSearcher {
  constructor(options = {}) {
    this.maxFileSize = options.maxFileSize || 1024 * 1024;
    this.excludeDirs = options.excludeDirs || [
      'node_modules', 'dist', 'build', '.git', 'vendor',
      '__pycache__', '.next', '.nuxt', 'tmp'
    ];
  }

  tokenize(text) {
    // Simple tokenization with basic stemming
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2)
      .map(t => t.replace(/(ing|ed|ly|tion|s)$/, ''));
  }

  scoreDocument(queryTokens, docTokens) {
    const querySet = new Set(queryTokens);
    let score = 0;
    docTokens.forEach(token => {
      if (querySet.has(token)) score++;
    });
    return score / Math.max(docTokens.length, 1);
  }

  async searchFiles(rootDir, query, options = {}) {
    const queryTokens = this.tokenize(query);
    const results = [];
    const files = await this.walkDirectory(rootDir, options);

    console.error(`Searching ${files.length} files...`);

    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        const tokens = this.tokenize(content);
        const score = this.scoreDocument(queryTokens, tokens);

        if (score > (options.minScore || 0.05)) {
          const lines = content.split('\n');
          const matchLines = this.findMatchingLines(lines, queryTokens, options.contextLines || 2);
          
          results.push({
            file: path.relative(rootDir, file),
            score: score.toFixed(3),
            matches: matchLines,
            totalLines: lines.length
          });
        }
      } catch (e) {
        // Skip unreadable files
      }
    }

    return results.sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
      .slice(0, options.maxResults || 20);
  }

  async walkDirectory(dir, options = {}) {
    const files = [];
    const extensions = options.extensions || null;
    
    const walk = async (currentDir) => {
      try {
        const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            if (!this.excludeDirs.includes(entry.name)) {
              await walk(path.join(currentDir, entry.name));
            }
          } else if (entry.isFile()) {
            if (!extensions || extensions.some(ext => entry.name.endsWith(ext))) {
              const filePath = path.join(currentDir, entry.name);
              const stats = await fs.promises.stat(filePath);
              if (stats.size <= this.maxFileSize) {
                files.push(filePath);
              }
            }
          }
        }
      } catch (e) {
        // Skip inaccessible directories
      }
    };
    
    await walk(dir);
    return files;
  }

  findMatchingLines(lines, queryTokens, contextLines) {
    const matches = [];
    
    lines.forEach((line, index) => {
      const lineTokens = this.tokenize(line);
      const matchCount = lineTokens.filter(t => queryTokens.includes(t)).length;
      
      if (matchCount > 0) {
        const start = Math.max(0, index - contextLines);
        const end = Math.min(lines.length, index + contextLines + 1);
        
        matches.push({
          lineNumber: index + 1,
          content: line.trim(),
          contextStart: start + 1,
          contextLines: lines.slice(start, end)
        });
      }
    });
    
    return matches.slice(0, 10);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('Usage: node index.js <command> [options]');
    console.log('Commands:');
    console.log('  search <query> [--ext .js,.ts] [--dir path] [--max 10] [--context 3]');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'search': {
        const queryIndex = args.indexOf('search');
        const query = args[queryIndex + 1];
        
        if (!query) {
          console.error('Query required');
          process.exit(1);
        }

        const options = {};
        for (let i = queryIndex + 2; i < args.length; i++) {
          if (args[i] === '--ext' && args[i + 1]) {
            options.extensions = args[++i].split(',');
          } else if (args[i] === '--dir' && args[i + 1]) {
            options.dir = args[++i];
          } else if (args[i] === '--max' && args[i + 1]) {
            options.maxResults = parseInt(args[++i]);
          } else if (args[i] === '--context' && args[i + 1]) {
            options.contextLines = parseInt(args[++i]);
          }
        }

        const searcher = new SemanticSearcher();
        const searchDir = options.dir || '.';
        
        console.log(`🔍 Searching for: "${query}" in ${searchDir}`);
        const results = await searcher.searchFiles(searchDir, query, options);

        if (results.length === 0) {
          console.log('\nNo matches found');
        } else {
          console.log(`\n✅ Found ${results.length} matches:\n`);
          results.forEach((result, i) => {
            console.log(`${i + 1}. ${result.file} (score: ${result.score})`);
            result.matches.slice(0, 3).forEach(match => {
              console.log(`   Line ${match.lineNumber}: ${match.content.substring(0, 100)}`);
            });
            console.log();
          });
        }
        break;
      }

      default:
        console.error('Unknown command:', command);
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

module.exports = { SemanticSearcher };
