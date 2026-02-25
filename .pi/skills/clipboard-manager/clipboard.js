#!/usr/bin/env node

/**
 * Clipboard Manager Skill
 * Read and write system clipboard content
 */

const { execSync, spawn } = require('child_process');
const { Readable } = require('stream');

function parseArgs(args) {
  if (args.length === 0) return { command: null, text: null };
  
  const command = args[0];
  const text = args.slice(1).join(' ');
  
  return { command, text };
}

function getClipboardCommand() {
  // Detect OS and return appropriate clipboard commands
  const platform = process.platform;
  
  if (platform === 'win32') {
    return { copy: 'clip', paste: 'powershell -command "Get-Clipboard"' };
  } else if (platform === 'darwin') {
    return { copy: 'pbcopy', paste: 'pbpaste' };
  } else {
    // Linux - try common clipboard tools
    const tools = [
      { copy: 'xclip -selection clipboard', paste: 'xclip -selection clipboard -o' },
      { copy: 'xsel --clipboard --input', paste: 'xsel --clipboard --output' }
    ];
    
    for (const tool of tools) {
      try {
        execSync(`which ${tool.copy.split(' ')[0]}`, { stdio: 'pipe' });
        return tool;
      } catch (e) {
        continue;
      }
    }
    
    console.error('Error: No clipboard tool found. Install xclip or xsel.');
    process.exit(1);
  }
}

function copyToClipboard(text) {
  const cmd = getClipboardCommand();
  
  return new Promise((resolve, reject) => {
    const child = spawn(cmd.copy, { shell: true });
    
    child.stdin.on('error', reject);
    child.on('error', reject);
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve('Text copied to clipboard');
      } else {
        reject(new Error(`Clipboard command failed with code ${code}`));
      }
    });
    
    child.stdin.write(text);
    child.stdin.end();
  });
}

function pasteFromClipboard() {
  const cmd = getClipboardCommand();
  
  try {
    const result = execSync(cmd.paste, { encoding: 'utf8' });
    return result;
  } catch (e) {
    throw new Error(`Failed to read clipboard: ${e.message}`);
  }
}

function clearClipboard() {
  // Clear by copying empty string
  return copyToClipboard('');
}

async function watchClipboard() {
  let lastContent = '';
  
  console.log('Watching clipboard (Ctrl+C to stop)...');
  
  setInterval(() => {
    try {
      const content = pasteFromClipboard();
      if (content !== lastContent) {
        lastContent = content;
        console.log('\n--- Clipboard changed ---');
        console.log(content);
        console.log('--- End ---\n');
      }
    } catch (e) {
      // Ignore errors
    }
  }, 500);
}

async function main() {
  const args = process.argv.slice(2);
  const { command, text } = parseArgs(args);
  
  const usage = `Usage: clipboard.js <command> [text]
Commands:
  copy <text>     Copy text to clipboard
  paste           Paste from clipboard
  clear           Clear clipboard
  watch           Watch clipboard for changes`;
  
  if (!command || command === '--help') {
    console.log(usage);
    process.exit(0);
  }
  
  try {
    switch (command) {
      case 'copy': {
        let content = text;
        
        // If no text provided, read from stdin
        if (!content && !process.stdin.isTTY) {
          content = await new Promise((resolve, reject) => {
            let data = '';
            process.stdin.on('data', chunk => data += chunk);
            process.stdin.on('end', () => resolve(data));
            process.stdin.on('error', reject);
          });
        }
        
        if (!content) {
          console.error('Error: Text required. Provide as argument or pipe to stdin.');
          process.exit(1);
        }
        
        await copyToClipboard(content);
        console.log('Copied to clipboard');
        break;
      }
      
      case 'paste': {
        const content = pasteFromClipboard();
        console.log(content);
        break;
      }
      
      case 'clear': {
        await clearClipboard();
        console.log('Clipboard cleared');
        break;
      }
      
      case 'watch': {
        await watchClipboard();
        break;
      }
      
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
