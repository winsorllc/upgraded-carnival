#!/usr/bin/env node

/**
 * CLI Discovery - Discover CLI tools available in the environment
 * 
 * Scans standard locations and $PATH for executable files,
 * extracts descriptions and version info.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directories to scan
const SCAN_DIRECTORIES = [
  '/usr/bin',
  '/usr/local/bin', 
  '/bin',
  '/sbin',
  '/usr/sbin',
  '/opt/bin'
];

// Extensions to check (empty string for no extension)
const EXECUTABLE_EXTENSIONS = ['', '.sh', '.bash'];

// Extensions to exclude
const EXCLUDE_EXTENSIONS = ['.md', '.txt', '.pdf', '.html', '.json', '.yml', '.yaml', '.conf', '.cfg', '.ini', '.xml'];

// Tools to always exclude (system utilities)
const EXCLUDE_TOOLS = [
  'README', 'LICENSE', 'CHANGELOG', 'TODO',
  'ls', 'cd', 'pwd', 'echo', 'printf', 'cat', 'less', 'more',
  'grep', 'egrep', 'fgrep', 'sed', 'awk', 'find', 'xargs',
  'head', 'tail', 'cut', 'sort', 'uniq', 'wc', 'tr', 'tee',
  'test', 'true', 'false', 'date', 'sleep', 'wait', 'kill',
  'cp', 'mv', 'rm', 'mkdir', 'rmdir', 'touch', 'chmod',
  'ln', 'readlink', 'realpath', 'basename', 'dirname'
];

// Cache file location
const CACHE_DIR = path.join(process.env.HOME || '/root', '.thepopebot', 'cli-cache');
const CACHE_FILE = path.join(CACHE_DIR, 'tools.json');

/**
 * Get all directories from PATH
 */
function getPathDirectories() {
  const pathEnv = process.env.PATH || '';
  return pathEnv.split(':').filter(dir => dir && fs.existsSync(dir));
}

/**
 * Check if a file is executable
 */
function isExecutable(filePath) {
  try {
    const stats = fs.statSync(filePath);
    // Check if executable by owner, group, or others
    const mode = stats.mode;
    return (mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

/**
 * Try to get description using whatis/apropos
 */
function getDescription(command) {
  try {
    // Try whatis first (faster)
    const whatis = execSync(`whatis "${command}" 2>/dev/null || true`, { 
      encoding: 'utf8',
      timeout: 2000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    
    if (whatis && !whatis.includes('nothing appropriate')) {
      // Clean up the whatis output
      return whatis.replace(command, '').replace(/^\s*-\s*/, '').trim();
    }
  } catch {
    // Ignore errors
  }
  
  // Fallback: try running with --version or --help
  try {
    const helpOutput = execSync(`${command} --help 2>/dev/null || ${command} -h 2>/dev/null || true`, {
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    
    // Extract first line description
    const lines = helpOutput.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('-') && !trimmed.startsWith(' ') && trimmed.length < 100) {
        return trimmed.substring(0, 100);
      }
    }
  } catch {
    // Ignore errors
  }
  
  return '';
}

/**
 * Get version of a command
 */
function getVersion(command) {
  const versionFlags = ['--version', '-v', '-V', 'version'];
  
  for (const flag of versionFlags) {
    try {
      const output = execSync(`${command} ${flag} 2>/dev/null || true`, {
        encoding: 'utf8',
        timeout: 3000,
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      
      if (output && !output.includes('illegal option') && !output.includes('unrecognized')) {
        // Extract version number
        const versionMatch = output.match(/(\d+\.\d+\.\d+[^\s]*)/);
        if (versionMatch) {
          return versionMatch[1];
        }
        // Return first line if no version number found
        const firstLine = output.split('\n')[0].trim();
        return firstLine.length > 50 ? firstLine.substring(0, 50) : firstLine;
      }
    } catch {
      // Try next flag
    }
  }
  
  return '';
}

/**
 * Scan a directory for executable files
 */
function scanDirectory(dirPath) {
  const tools = [];
  
  if (!fs.existsSync(dirPath)) {
    return tools;
  }
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      // Skip hidden files
      if (file.startsWith('.')) continue;
      
      // Skip excluded extensions
      const ext = path.extname(file);
      if (ext && EXCLUDE_EXTENSIONS.includes(ext)) continue;
      
      // Skip excluded tools
      const baseName = file.replace(/(\.sh|\.bash)$/, '');
      if (EXCLUDE_TOOLS.includes(baseName)) continue;
      
      const filePath = path.join(dirPath, file);
      
      // Check if it's a file and executable
      if (isExecutable(filePath)) {
        // Get description (may be slow, so we do it lazily)
        tools.push({
          name: baseName,
          path: filePath,
          description: '',  // Lazy loaded
          version: ''       // Lazy loaded
        });
      }
    }
  } catch (err) {
    // Permission denied or other error - skip directory
  }
  
  return tools;
}

/**
 * Discover all CLI tools
 */
function discover(useCache = true) {
  // Check cache first
  if (useCache && fs.existsSync(CACHE_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      // Cache valid for 1 hour
      if (Date.now() - cached.timestamp < 3600000) {
        return cached.tools;
      }
    } catch {
      // Cache corrupted, rebuild
    }
  }
  
  const allTools = new Map();
  
  // Get all directories to scan
  const directories = [...new Set([...SCAN_DIRECTORIES, ...getPathDirectories()])];
  
  // Scan each directory
  for (const dir of directories) {
    const tools = scanDirectory(dir);
    for (const tool of tools) {
      // Keep first occurrence (usually the one in PATH first)
      if (!allTools.has(tool.name)) {
        allTools.set(tool.name, tool);
      }
    }
  }
  
  const result = Array.from(allTools.values());
  
  // Save to cache
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      timestamp: Date.now(),
      tools: result
    }, null, 2));
  } catch {
    // Cache write failed, continue anyway
  }
  
  return result;
}

/**
 * Search for tools by keyword
 */
function search(query) {
  const tools = discover();
  const lowerQuery = query.toLowerCase();
  
  return tools.filter(tool => 
    tool.name.toLowerCase().includes(lowerQuery) ||
    (tool.description && tool.description.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get detailed info about a specific tool
 */
function info(toolName) {
  const tools = discover();
  const tool = tools.find(t => t.name === toolName || t.name === toolName.replace(/^#!/, ''));
  
  if (!tool) {
    return { error: `Tool '${toolName}' not found` };
  }
  
  // Get description if not cached
  let description = tool.description;
  let version = tool.version;
  
  if (!description) {
    description = getDescription(tool.name);
  }
  
  if (!version) {
    version = getVersion(tool.name);
  }
  
  // Try to get options from help
  let options = [];
  try {
    const helpOutput = execSync(`${tool.name} --help 2>/dev/null || ${tool.name} -h 2>/dev/null || true`, {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Parse common options
    const optionRegex = /^\s*(-[a-zA-Z0-9],?\s*)?(--[a-zA-Z0-9-]+)?\s+(.+)$/gm;
    let match;
    const parsedOptions = [];
    
    while ((match = optionRegex.exec(helpOutput)) !== null && parsedOptions.length < 20) {
      const flag = (match[1] || '').trim() + ' ' + (match[2] || '').trim();
      if (flag.trim()) {
        parsedOptions.push({
          flag: flag.trim(),
          description: match[3].trim().substring(0, 80)
        });
      }
    }
    options = parsedOptions;
  } catch {
    // Help parsing failed
  }
  
  return {
    name: tool.name,
    path: tool.path,
    description: description || 'No description available',
    version: version || 'Unknown',
    options
  };
}

/**
 * Generate usage examples for a tool
 */
function examples(toolName) {
  const toolInfo = info(toolName);
  
  if (toolInfo.error) {
    return toolInfo;
  }
  
  const examples = [];
  const name = toolInfo.name;
  
  // Generate common examples based on tool type
  if (name === 'curl') {
    examples.push(`curl -X GET "https://api.example.com/data"`);
    examples.push(`curl -X POST -d '{"key":"value"}' "https://api.example.com/data"`);
    examples.push(`curl -o output.txt "https://example.com/file.txt"`);
    examples.push(`curl -I "https://example.com"  # HEAD request`);
  } else if (name === 'git') {
    examples.push(`git status`);
    examples.push(`git add . && git commit -m "message"`);
    examples.push(`git push origin main`);
    examples.push(`git log --oneline -10`);
  } else if (name === 'docker') {
    examples.push(`docker ps -a`);
    examples.push(`docker images`);
    examples.push(`docker run -it ubuntu bash`);
    examples.push(`docker exec -it container_id bash`);
  } else if (name === 'npm') {
    examples.push(`npm install`);
    examples.push(`npm run build`);
    examples.push(`npm test`);
    examples.push(`npm list -g --depth=0`);
  } else if (name === 'node') {
    examples.push(`node script.js`);
    examples.push(`node -e "console.log('hello')"`);
    examples.push(`node --version`);
  } else if (name === 'python' || name === 'python3') {
    examples.push(`python script.py`);
    examples.push(`python -m pip install package`);
    examples.push(`python -c "print('hello')"`);
  } else if (name === 'jq') {
    examples.push(`echo '{"key":"value"}' | jq '.key'`);
    examples.push(`cat file.json | jq '.items[]'`);
    examples.push(`jq -s '.' file1.json file2.json`);
  } else if (name === 'kubectl') {
    examples.push(`kubectl get pods`);
    examples.push(`kubectl describe pod <name>`);
    examples.push(`kubectl logs -f <pod>`);
  } else if (name === 'aws') {
    examples.push(`aws s3 ls`);
    examples.push(`aws ec2 describe-instances`);
    examples.push(`aws lambda invoke --function-name myfunc output.json`);
  } else {
    // Generic examples based on available options
    if (toolInfo.options && toolInfo.options.length > 0) {
      const helpFlag = toolInfo.options.find(o => o.flag.includes('--help'));
      const versionFlag = toolInfo.options.find(o => o.flag.includes('--version'));
      
      if (helpFlag) {
        examples.push(`${name} --help`);
      }
      if (versionFlag) {
        examples.push(`${name} --version`);
      }
      
      // Add a few option examples
      const commonFlags = ['-v', '-o', '-f', '-i'].filter(flag => 
        toolInfo.options.some(o => o.flag.includes(flag))
      );
      
      for (const flag of commonFlags.slice(0, 3)) {
        examples.push(`${name} ${flag} <value>`);
      }
    }
  }
  
  return {
    tool: toolName,
    examples,
    note: examples.length === 0 ? 'No specific examples available. Try --help for usage information.' : ''
  };
}

// CLI handler
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log('CLI Discovery Tool');
  console.log('Usage: node discover.js <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  discover           - List all available CLI tools');
  console.log('  search <keyword>   - Search for tools by keyword');
  console.log('  info <tool-name>   - Get detailed info about a tool');
  console.log('  examples <tool>    - Generate usage examples');
  console.log('  clear-cache        - Clear the tool cache');
  process.exit(0);
}

switch (command) {
  case 'discover': {
    const tools = discover();
    console.log(JSON.stringify({ total: tools.length, tools }, null, 2));
    break;
  }
  
  case 'search': {
    const query = args[1];
    if (!query) {
      console.error('Error: Please provide a search keyword');
      process.exit(1);
    }
    const results = search(query);
    console.log(JSON.stringify({ query, matches: results }, null, 2));
    break;
  }
  
  case 'info': {
    const toolName = args[1];
    if (!toolName) {
      console.error('Error: Please provide a tool name');
      process.exit(1);
    }
    const result = info(toolName);
    console.log(JSON.stringify(result, null, 2));
    break;
  }
  
  case 'examples': {
    const toolName = args[1];
    if (!toolName) {
      console.error('Error: Please provide a tool name');
      process.exit(1);
    }
    const result = examples(toolName);
    console.log(JSON.stringify(result, null, 2));
    break;
  }
  
  case 'clear-cache': {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
      console.log('Cache cleared');
    } else {
      console.log('No cache to clear');
    }
    break;
  }
  
  default:
    console.error(`Unknown command: ${command}`);
    console.log('Valid commands: discover, search, info, examples, clear-cache');
    process.exit(1);
}
