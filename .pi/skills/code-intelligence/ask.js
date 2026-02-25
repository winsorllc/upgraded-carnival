#!/usr/bin/env node
/**
 * Code Intelligence Q&A
 * Ask questions about the codebase
 */

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const { 
  initDatabase, 
  searchSymbols,
  getAllFiles,
  closeDatabase 
} = require('./lib/indexer');

program
  .name('code-ask')
  .description('Ask questions about the codebase')
  .version('1.0.0')
  .argument('<question>', 'Your question about the code')
  .option('--db <path>', 'Database path', '.code-intelligence/index.db')
  .option('--json', 'Output JSON format', false)
  .parse();

// Question patterns with search strategies
const QUESTION_PATTERNS = [
  {
    pattern: /(?:where|what file).*?(?:configure|config|set|define).*?(.+)/i,
    type: 'configuration',
    search: (match) => [match[1].trim(), 'config', 'settings']
  },
  {
    pattern: /how (?:does|is).*?(?:work|function|implement)/i,
    type: 'explanation',
    search: () => ['main', 'entry', 'start']
  },
  {
    pattern: /what (?:functions?|methods?).*?(?:use|call|depend).*?(.+)/i,
    type: 'usage',
    search: (match) => [match[1].trim()]
  },
  {
    pattern: /where (?:is|are).*?(.+).*?(?:defined|declared|located)/i,
    type: 'definition',
    search: (match) => [match[1].trim()]
  },
  {
    pattern: /what.*?import.*?(.+)/i,
    type: 'imports',
    search: (match) => [match[1].trim()]
  }
];

async function analyzeQuestion(db, question) {
  const results = {
    question,
    analysis: {
      type: 'general',
      confidence: 0
    },
    answers: []
  };

  // Try to match question pattern
  for (const pattern of QUESTION_PATTERNS) {
    const match = question.match(pattern.pattern);
    if (match) {
      results.analysis.type = pattern.type;
      results.analysis.confidence = 0.7;
      
      const searchTerms = pattern.search(match);
      
      for (const term of searchTerms) {
        const symbols = await searchSymbols(db, term, { limit: 20 });
        results.answers.push(...symbols.map(s => ({
          type: s.type,
          name: s.name,
          file: s.path,
          line: s.line,
          language: s.language,
          relevance: 'high'
        })));
      }
      break;
    }
  }

  // If no pattern matched or few results, do broader search
  if (results.answers.length < 3) {
    const words = question.split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !['where', 'what', 'how', 'does', 'this', 'that', 'with', 'from'].includes(w.toLowerCase()));
    
    for (const word of words.slice(0, 3)) {
      const symbols = await searchSymbols(db, word, { limit: 10 });
      results.answers.push(...symbols.map(s => ({
        type: s.type,
        name: s.name,
        file: s.path,
        line: s.line,
        language: s.language,
        relevance: 'medium'
      })));
    }
  }

  // Also get file context
  const allFiles = await getAllFiles(db);
  
  // Look for files that might be relevant
  const relevantFiles = allFiles.filter(f => {
    const lower = f.path.toLowerCase();
    return question.split(/\s+/).some(word => 
      word.length > 3 && lower.includes(word.toLowerCase())
    );
  }).slice(0, 5);

  results.contextFiles = relevantFiles.map(f => ({
    path: f.path,
    symbols: f.symbol_count,
    language: f.language
  }));

  // Deduplicate answers
  const seen = new Set();
  results.answers = results.answers.filter(a => {
    const key = `${a.file}:${a.line}:${a.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 15);

  return results;
}

async function main() {
  const opts = program.opts();
  const question = program.args.join(' ');
  const dbPath = path.resolve(opts.db);

  if (!fs.existsSync(dbPath)) {
    console.error('Error: Database not found. Run `node index.js` first.');
    process.exit(1);
  }

  try {
    const db = await initDatabase(dbPath);
    const results = await analyzeQuestion(db, question);
    await closeDatabase(db);

    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(`\n❓ ${results.question}`);
      console.log('═'.repeat(60));
      
      console.log(`\nAnalysis Type: ${results.analysis.type}`);
      
      if (results.answers.length === 0) {
        console.log('\n🤔 No specific matches found. Try searching with different keywords.');
      } else {
        console.log(`\nFound ${results.answers.length} relevant items:\n`);
        
        // Group by file
        const byFile = results.answers.reduce((acc, a) => {
          if (!acc[a.file]) acc[a.file] = [];
          acc[a.file].push(a);
          return acc;
        }, {});

        for (const [filePath, items] of Object.entries(byFile)) {
          const relative = path.relative(process.cwd(), filePath);
          console.log(`📄 ${relative}`);
          console.log('─'.repeat(50));
          
          for (const item of items) {
            const icon = item.type === 'function' ? '⚡' : 
                         item.type === 'class' ? '🏛️' : '📤';
            console.log(`  ${icon} ${item.name} (line ${item.line})`);
          }
          console.log('');
        }
      }

      if (results.contextFiles.length > 0) {
        console.log('\n📁 Potentially related files:');
        for (const file of results.contextFiles) {
          const rel = path.relative(process.cwd(), file.path);
          console.log(`  • ${rel} (${file.symbols} symbols)`);
        }
      }

      console.log('');
      console.log('💡 Tip: Use `code-search "<keyword>"` for more detailed results');
      console.log('');
    }

  } catch (err) {
    if (opts.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  }
}

main();
