#!/usr/bin/env node

/**
 * Content Search Skill for PopeBot
 * 
 * Search file contents with context extraction across directories.
 * Uses ripgrep (rg) when available, falls back to grep.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Check for ripgrep availability
function hasRipgrep() {
  try {
    execSync('rg --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Execute command and return output
function exec(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      ...options,
    });
    return { stdout: result, stderr: '' };
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      status: error.status,
    };
  }
}

// Parse ripgrep output with context
function parseRipgrepOutput(output, query, contextLines) {
  const matches = [];
  const lines = output.split('\n').filter(line => line.trim());
  
  let currentFile = null;
  let currentMatch = null;
  let contextBuffer = [];
  
  for (const line of lines) {
    // Match format: filepath:lineNum:colNum:content (for matches)
    //_MATCHED_ format: filepath-lineNum-content (for context)
    const matchRegex = /^(.+?):(\d+):(\d+):(.*)$/;
    const contextRegex = /^(.+?)-(\d+)-(.*)$/;
    
    const matchParts = line.match(matchRegex);
    const contextParts = line.match(contextRegex);
    
    if (matchParts) {
      // Save previous match if exists
      if (currentMatch) {
        currentMatch.context = contextBuffer.join('\n');
        matches.push(currentMatch);
        contextBuffer = [];
      }
      
      const [, filePath, lineNum, colNum, content] = matchParts;
      currentFile = filePath;
      currentMatch = {
        file: filePath,
        line: parseInt(lineNum, 10),
        column: parseInt(colNum, 10),
        match: content,
        context: '',
      };
    } else if (contextParts && currentFile) {
      // Context line
      const [, filePath, lineNum, content] = contextParts;
      if (filePath === currentFile) {
        contextBuffer.push({
          line: parseInt(lineNum, 10),
          content: content,
        });
      }
    }
  }
  
  // Don't forget the last match
  if (currentMatch) {
    currentMatch.context = contextBuffer.join('\n');
    matches.push(currentMatch);
  }
  
  return matches;
}

// Parse grep output with context
function parseGrepOutput(output, query, contextLines) {
  const matches = [];
  const lines = output.split('\n').filter(line => line.trim());
  
  let currentFile = null;
  let currentMatch = null;
  let contextBuffer = [];
  let inContextAfter = false;
  
  for (const line of lines) {
    // grep --with-filename --line-number --context output format
    const matchRegex = /^(.+?):(\d+):(.*)$/;
    const separatorRegex = /^--$/;
    
    if (separatorRegex.test(line)) {
      // Separator between context groups
      if (currentMatch) {
        currentMatch.context = contextBuffer.join('\n');
        matches.push(currentMatch);
        currentMatch = null;
        contextBuffer = [];
      }
      continue;
    }
    
    const matchParts = line.match(matchRegex);
    
    if (matchParts) {
      const [, filePath, lineNum, content] = matchParts;
      
      // If we have a new file or this looks like a match line
      if (filePath !== currentFile || !inContextAfter) {
        // Save previous match
        if (currentMatch) {
          currentMatch.context = contextBuffer.join('\n');
          matches.push(currentMatch);
          contextBuffer = [];
        }
        
        currentFile = filePath;
        currentMatch = {
          file: filePath,
          line: parseInt(lineNum, 10),
          match: content,
          context: '',
        };
        inContextAfter = false;
      } else if (currentMatch) {
        // Context after match
        contextBuffer.push({
          line: parseInt(lineNum, 10),
          content: content,
        });
      }
    } else if (currentMatch) {
      // Context line without file:line prefix
      contextBuffer.push({ content: line });
    }
  }
  
  // Don't forget the last match
  if (currentMatch) {
    currentMatch.context = contextBuffer.join('\n');
    matches.push(currentMatch);
  }
  
  return matches;
}

// Search content using ripgrep or grep
async function searchContent(params) {
  const {
    query,
    directory = process.cwd(),
    filePattern,
    contextLines = 3,
    maxResults = 20,
    caseSensitive = false,
    includeHidden = false,
  } = params;
  
  if (!query || typeof query !== 'string') {
    throw new Error('query parameter is required and must be a string');
  }
  
  const startTime = Date.now();
  const useRipgrep = hasRipgrep();
  let command;
  let matches = [];
  let filesSearched = 0;
  
  try {
    if (useRipgrep) {
      // Build ripgrep command
      const args = [
        '--line-number',
        '--column',
        '--context', String(Math.min(contextLines, 10)),
        '--color', 'never',
        '--heading',
        '--sort', 'path',
      ];
      
      if (!caseSensitive) {
        args.push('--ignore-case');
      }
      
      if (!includeHidden) {
        args.push('--hidden');
      }
      
      if (filePattern) {
        args.push('--glob', filePattern);
      }
      
      // Skip binary files and large files
      args.push('--type-add', 'text:*.md,*.txt,*.js,*.ts,*.json,*.yaml,*.yml,*.log,*.py,*.rs,*.go,*.java,*.cpp,*.c,*.h,*.jsx,*.tsx');
      args.push('-t', 'text');
      
      // Limit results
      args.push('--max-count', String(maxResults * 2)); // Get extra for context
      
      args.push('--', query, directory);
      
      command = `rg ${args.map(a => `'${a}'`).join(' ')}`;
      const result = exec(command);
      
      if (result.stdout) {
        matches = parseRipgrepOutput(result.stdout, query, contextLines);
      }
      
      // Count files searched
      const countResult = exec(`rg --files ${includeHidden ? '' : '--hidden'} ${filePattern ? `--glob '${filePattern}'` : ''} '${directory}' 2>/dev/null | wc -l`);
      filesSearched = parseInt(countResult.stdout, 10) || 0;
    } else {
      // Fallback to grep
      const contextFlag = `-C${Math.min(contextLines, 10)}`;
      const caseFlag = caseSensitive ? '' : '-i';
      const globFlag = filePattern ? `--include='${filePattern}'` : '';
      const hiddenFlag = includeHidden ? '' : '--exclude=.*';
      
      command = `grep -r --line-number ${contextFlag} ${caseFlag} ${globFlag} ${hiddenFlag} '${query}' '${directory}' 2>/dev/null`;
      const result = exec(command);
      
      if (result.stdout) {
        matches = parseGrepOutput(result.stdout, query, contextLines);
      }
      
      // Count files searched
      const countResult = exec(`find '${directory}' -type f ${filePattern ? `-name '${filePattern}'` : ''} ${hiddenFlag} 2>/dev/null | wc -l`);
      filesSearched = parseInt(countResult.stdout, 10) || 0;
    }
  } catch (error) {
    // Search might return no results, which is OK
    if (!error.message.includes('No such file')) {
      console.error('Search error:', error.message);
    }
  }
  
  // Truncate to maxResults
  matches = matches.slice(0, maxResults);
  
  // Format context for each match
  for (const match of matches) {
    if (match.context && typeof match.context === 'string') {
      // Keep as string for simplicity
    } else if (Array.isArray(match.context)) {
      match.context = match.context.map(c => 
        typeof c === 'object' ? `${c.line}: ${c.content}` : c
      ).join('\n');
    }
  }
  
  const duration = Date.now() - startTime;
  
  return {
    matches,
    summary: {
      totalMatches: matches.length,
      filesSearched,
      searchDuration: `${duration}ms`,
      tool: useRipgrep ? 'ripgrep' : 'grep',
    },
  };
}

// Find symbol definitions (basic implementation)
async function findSymbol(params) {
  const {
    symbol,
    directory = process.cwd(),
    language,
  } = params;
  
  if (!symbol || typeof symbol !== 'string') {
    throw new Error('symbol parameter is required and must be a string');
  }
  
  const definitions = [];
  const references = [];
  
  // Build patterns based on language
  const patterns = {
    javascript: [
      { type: 'function', regex: `function\\s+${symbol}\\s*\\(` },
      { type: 'class', regex: `class\\s+${symbol}\\s*` },
      { type: 'const', regex: `const\\s+${symbol}\\s*=` },
      { type: 'let', regex: `let\\s+${symbol}\\s*=` },
      { type: 'var', regex: `var\\s+${symbol}\\s*=` },
      { type: 'export', regex: `export\\s+(default\\s+)?(function|class|const|let|var)\\s+${symbol}` },
      { type: 'arrow', regex: `(const|let|var)\\s+${symbol}\\s*=\\s*\\([^)]*\\)\\s*=>` },
      { type: 'method', regex: `${symbol}\\s*\\([^)]*\\)\\s*\\{` },
    ],
    python: [
      { type: 'function', regex: `def\\s+${symbol}\\s*\\(` },
      { type: 'class', regex: `class\\s+${symbol}\\s*[:\\(]` },
    ],
    rust: [
      { type: 'function', regex: `fn\\s+${symbol}\\s*\\(` },
      { type: 'struct', regex: `struct\\s+${symbol}\\s*` },
      { type: 'enum', regex: `enum\\s+${symbol}\\s*` },
      { type: 'trait', regex: `trait\\s+${symbol}\\s*` },
    ],
    typescript: [
      { type: 'function', regex: `function\\s+${symbol}\\s*\\(` },
      { type: 'class', regex: `class\\s+${symbol}\\s*` },
      { type: 'interface', regex: `interface\\s+${symbol}\\s*` },
      { type: 'type', regex: `type\\s+${symbol}\\s*=` },
      { type: 'enum', regex: `enum\\s+${symbol}\\s*` },
    ],
  };
  
  // Default patterns for unknown languages
  const langPatterns = patterns[language] || [
    { type: 'definition', regex: `\\b${symbol}\\s*\\(` },
    { type: 'definition', regex: `(class|function|const|let|var|def|fn|struct)\\s+${symbol}` },
  ];
  
  // Search for definitions
  for (const pattern of langPatterns) {
    try {
      const filePattern = language === 'python' ? '*.py' : 
                         language === 'rust' ? '*.rs' :
                         language === 'typescript' ? '*.ts' :
                         language === 'javascript' ? '*.js' : null;
      
      const searchResult = await searchContent({
        query: pattern.regex,
        directory,
        filePattern,
        contextLines: 1,
        maxResults: 50,
        caseSensitive: true,
      });
      
      for (const match of searchResult.matches) {
        definitions.push({
          file: match.file,
          line: match.line,
          type: pattern.type,
          symbol,
        });
      }
    } catch (error) {
      // Continue with next pattern
    }
  }
  
  // Search for references (broader search)
  try {
    const refResult = await searchContent({
      query: `\\b${symbol}\\b`,
      directory,
      contextLines: 0,
      maxResults: 100,
      caseSensitive: true,
    });
    
    // Filter out definitions to get only references
    const defLines = new Set(definitions.map(d => `${d.file}:${d.line}`));
    
    for (const match of refResult.matches) {
      const key = `${match.file}:${match.line}`;
      if (!defLines.has(key)) {
        references.push({
          file: match.file,
          line: match.line,
          symbol,
        });
      }
    }
  } catch (error) {
    // Ignore reference search errors
  }
  
  return {
    symbol,
    definitions,
    references: references.slice(0, 50), // Limit references
    summary: {
      definitionCount: definitions.length,
      referenceCount: references.length,
    },
  };
}

// Search log files
async function searchLogs(params) {
  const {
    query,
    logDir = './logs',
    level,
    since,
    contextLines = 5,
    maxResults = 50,
  } = params;
  
  if (!query || typeof query !== 'string') {
    throw new Error('query parameter is required and must be a string');
  }
  
  // Resolve log directory
  const resolvedLogDir = path.isAbsolute(logDir) ? logDir : path.join(process.cwd(), logDir);
  
  if (!fs.existsSync(resolvedLogDir)) {
    return {
      entries: [],
      summary: {
        error: `Log directory not found: ${resolvedLogDir}`,
        totalMatches: 0,
      },
    };
  }
  
  // Build level filter pattern
  let levelPattern = '';
  if (level) {
    const validLevels = ['error', 'warn', 'warning', 'info', 'debug'];
    if (validLevels.includes(level.toLowerCase())) {
      levelPattern = `(?:${level}|${level.toUpperCase()})`;
    }
  }
  
  // Build time filter (simplified - just filter recent files)
  let timeFilter = '';
  if (since) {
    const timeMatch = since.match(/^(\d+)(h|d|w|m)$/);
    if (timeMatch) {
      const [, value, unit] = timeMatch;
      const multipliers = { h: 1, d: 24, w: 168, m: 720 };
      const hours = parseInt(value, 10) * (multipliers[unit] || 1);
      const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
      
      // Filter log files by modification time
      const logFiles = fs.readdirSync(resolvedLogDir)
        .filter(f => f.endsWith('.log') || f.endsWith('.jsonl'))
        .map(f => {
          const filePath = path.join(resolvedLogDir, f);
          const stats = fs.statSync(filePath);
          return { file: f, filePath, mtime: stats.mtimeMs };
        })
        .filter(f => f.mtime >= cutoffTime)
        .map(f => f.filePath);
      
      if (logFiles.length === 0) {
        return {
          entries: [],
          summary: {
            message: `No log files modified since ${since}`,
            totalMatches: 0,
          },
        };
      }
      
      timeFilter = logFiles.map(f => `'${f}'`).join(' ');
    }
  }
  
  // Build search query
  const searchQuery = levelPattern ? `(?:${levelPattern}).*${query}|${query}.*(?:${levelPattern})` : query;
  
  const searchResult = await searchContent({
    query: searchQuery,
    directory: resolvedLogDir,
    filePattern: '*.log',
    contextLines,
    maxResults,
    includeHidden: false,
  });
  
  // Parse log entries
  const entries = searchResult.matches.map(match => {
    // Try to extract timestamp from log line
    const timestampMatch = match.match.match(/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/i);
    const levelMatch = match.match.match(/\b(ERROR|WARN|WARNING|INFO|DEBUG)\b/i);
    
    return {
      file: match.file,
      line: match.line,
      timestamp: timestampMatch ? timestampMatch[1] : null,
      level: levelMatch ? levelMatch[1].toUpperCase() : null,
      content: match.match,
      context: match.context,
    };
  });
  
  // Count by level
  const levelCounts = {};
  for (const entry of entries) {
    const lvl = entry.level || 'UNKNOWN';
    levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
  }
  
  return {
    entries,
    summary: {
      totalMatches: entries.length,
      levelCounts,
      logDirectory: resolvedLogDir,
      timeFilter: since || null,
      levelFilter: level || null,
      searchDuration: searchResult.summary.searchDuration,
    },
  };
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const params = {};
  let action = 'search_content';
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--action') {
      action = args[++i];
    } else if (arg === '--query') {
      params.query = args[++i];
    } else if (arg === '--symbol') {
      params.symbol = args[++i];
    } else if (arg === '--directory') {
      params.directory = args[++i];
    } else if (arg === '--filePattern') {
      params.filePattern = args[++i];
    } else if (arg === '--contextLines') {
      params.contextLines = parseInt(args[++i], 10);
    } else if (arg === '--maxResults') {
      params.maxResults = parseInt(args[++i], 10);
    } else if (arg === '--caseSensitive') {
      params.caseSensitive = true;
    } else if (arg === '--includeHidden') {
      params.includeHidden = true;
    } else if (arg === '--language') {
      params.language = args[++i];
    } else if (arg === '--logDir') {
      params.logDir = args[++i];
    } else if (arg === '--level') {
      params.level = args[++i];
    } else if (arg === '--since') {
      params.since = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Content Search Skill for PopeBot

Usage: node content-search.js [options]

Actions:
  search_content  Search file contents (default)
  find_symbol     Find symbol definitions and references
  search_logs     Search log files with filtering

Options:
  --query <string>      Search term or pattern
  --symbol <string>     Symbol name to find (for find_symbol)
  --directory <path>    Directory to search (default: cwd)
  --filePattern <glob>  Glob pattern to filter files
  --contextLines <n>    Lines of context (default: 3)
  --maxResults <n>      Maximum results (default: 20)
  --caseSensitive       Enable case-sensitive search
  --includeHidden       Include hidden files/directories
  --language <lang>     Programming language hint
  --logDir <path>       Log directory (default: ./logs)
  --level <level>       Filter by log level
  --since <duration>    Time filter (e.g., 1h, 2d, 1w)
  --help, -h            Show this help

Examples:
  node content-search.js --query "createJob" --directory "/job"
  node content-search.js --action find_symbol --symbol "authenticate" --language javascript
  node content-search.js --action search_logs --query "error" --level error --since 24h
`);
      process.exit(0);
    }
  }
  
  try {
    let result;
    
    switch (action) {
      case 'search_content':
        result = await searchContent(params);
        break;
      case 'find_symbol':
        result = await findSymbol(params);
        break;
      case 'search_logs':
        result = await searchLogs(params);
        break;
      default:
        console.error(`Unknown action: ${action}`);
        process.exit(1);
    }
    
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      stack: error.stack,
    }, null, 2));
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export functions for use as a module
module.exports = {
  searchContent,
  findSymbol,
  searchLogs,
  hasRipgrep,
};
