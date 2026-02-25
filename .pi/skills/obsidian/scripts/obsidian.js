#!/usr/bin/env node

/**
 * Obsidian CLI - Interact with Obsidian vaults via CLI
 * Provides file management, note creation, and vault navigation
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function getVaultPath() {
  // Check environment variable first
  if (process.env.OBSIDIAN_VAULT_PATH) {
    return process.env.OBSIDIAN_VAULT_PATH;
  }
  
  // Default Obsidian vault locations
  const home = os.homedir();
  const defaultPaths = [
    path.join(home, 'Obsidian', 'Vault'),
    path.join(home, 'Documents', 'Obsidian', 'Vault'),
    path.join(home, 'Documents', 'Obsidian')
  ];
  
  for (const p of defaultPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  
  // Try to find any .obsidian folder
  const documents = path.join(home, 'Documents');
  if (fs.existsSync(documents)) {
    try {
      const dirs = fs.readdirSync(documents);
      for (const dir of dirs) {
        const obsidianPath = path.join(documents, dir, '.obsidian');
        if (fs.existsSync(obsidianPath)) {
          return path.join(documents, dir);
        }
      }
    } catch (e) {
      // Ignore
    }
  }
  
  return null;
}

function parseArgs(args) {
  const parsed = {
    positional: [],
    options: {}
  };
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.replace('--', '');
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        parsed.options[key] = next;
        i += 2;
      } else {
        parsed.options[key] = true;
        i++;
      }
    } else {
      parsed.positional.push(arg);
      i++;
    }
  }
  
  return parsed;
}

// Get all markdown files in vault
async function getNotes(vaultPath, options = {}) {
  const notes = [];
  
  function walkDir(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip hidden folders and .obsidian
        if (!item.startsWith('.') && item !== 'node_modules') {
          walkDir(fullPath);
        }
      } else if (item.endsWith('.md')) {
        const relativePath = path.relative(vaultPath, fullPath);
        notes.push({
          path: fullPath,
          relativePath,
          name: path.basename(item, '.md')
        });
      }
    }
  }
  
  walkDir(vaultPath);
  return notes;
}

// Search notes by content
async function searchNotes(vaultPath, query, options = {}) {
  const notes = await getNotes(vaultPath);
  const results = [];
  
  for (const note of notes) {
    try {
      const content = fs.readFileSync(note.path, 'utf8');
      if (content.toLowerCase().includes(query.toLowerCase())) {
        // Get context around match
        const index = content.toLowerCase().indexOf(query.toLowerCase());
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + query.length + 50);
        const context = content.substring(start, end).replace(/\n/g, ' ');
        
        results.push({
          ...note,
          context
        });
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  return results;
}

// Get or create a note
async function getNote(vaultPath, notePath, create = false) {
  const fullPath = path.join(vaultPath, notePath);
  const noteName = path.basename(fullPath, '.md');
  const dir = path.dirname(fullPath);
  
  // Create directory if needed
  if (!fs.existsSync(dir)) {
    if (create) {
      fs.mkdirSync(dir, { recursive: true });
    } else {
      throw new Error(`Directory does not exist: ${dir}`);
    }
  }
  
  if (!fs.existsSync(fullPath)) {
    if (create) {
      // Create new note with frontmatter
      const template = `---
created: ${new Date().toISOString()}
tags: []
---

# ${noteName}

`;
      fs.writeFileSync(fullPath, template);
      return { path: fullPath, created: true };
    } else {
      throw new Error(`Note does not exist: ${notePath}`);
    }
  }
  
  return { path: fullPath, created: false };
}

// Extract frontmatter from note
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: {}, content };
  
  const frontmatter = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      // Remove quotes
      value = value.replace(/^["']|["']$/g, '');
      frontmatter[key] = value;
    }
  }
  
  return {
    frontmatter,
    content: content.substring(match[0].length)
  };
}

// Commands
async function cmdList(vaultPath, options) {
  const notes = await getNotes(vaultPath);
  
  if (options.json) {
    console.log(JSON.stringify(notes, null, 2));
    return;
  }
  
  log(`\n${colors.bright}Notes in Vault${colors.reset}\n`, 'cyan');
  log(`Total: ${notes.length} notes\n`);
  
  // Group by folder
  const folders = {};
  for (const note of notes) {
    const folder = path.dirname(note.relativePath);
    if (!folders[folder]) folders[folder] = [];
    folders[folder].push(note);
  }
  
  for (const [folder, folderNotes] of Object.entries(folders)) {
    log(`\n${colors.yellow}${folder || '.'}/${colors.reset}`);
    for (const note of folderNotes) {
      log(`  ${note.name}`, 'green');
    }
  }
}

async function cmdSearch(vaultPath, query, options) {
  if (!query) {
    log('Error: Search query required', 'red');
    process.exit(1);
  }
  
  const results = await searchNotes(vaultPath, query);
  
  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  log(`\n${colors.bright}Search Results for "${query}"${colors.reset}\n`, 'cyan');
  log(`Found: ${results.length} notes\n`);
  
  for (const result of results) {
    log(`${result.relativePath}`, 'green');
    log(`  ${result.context}...`);
    log('');
  }
}

async function cmdRead(vaultPath, notePath, options) {
  if (!notePath) {
    log('Error: Note path required', 'red');
    process.exit(1);
  }
  
  const { path: fullPath } = await getNote(vaultPath, notePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const { frontmatter, content: body } = parseFrontmatter(content);
  
  if (options.json) {
    console.log(JSON.stringify({ frontmatter, body, path: fullPath }, null, 2));
    return;
  }
  
  log(`\n${colors.bright}${path.basename(fullPath, '.md')}${colors.reset}\n`, 'cyan');
  
  if (Object.keys(frontmatter).length > 0) {
    log(`${colors.yellow}Frontmatter:${colors.reset}`);
    for (const [key, value] of Object.entries(frontmatter)) {
      log(`  ${key}: ${value}`);
    }
    log('');
  }
  
  log(body);
}

async function cmdCreate(vaultPath, notePath, options) {
  if (!notePath) {
    log('Error: Note path required', 'red');
    process.exit(1);
  }
  
  // Ensure .md extension
  if (!notePath.endsWith('.md')) {
    notePath = notePath + '.md';
  }
  
  const { path: fullPath, created } = await getNote(vaultPath, notePath, true);
  
  if (created) {
    log(`\n${colors.green}Created note: ${path.relative(vaultPath, fullPath)}${colors.reset}`);
  } else {
    log(`\n${colors.yellow}Note already exists: ${path.relative(vaultPath, fullPath)}${colors.reset}`);
  }
}

async function cmdWrite(vaultPath, notePath, options) {
  if (!notePath) {
    log('Error: Note path required', 'red');
    process.exit(1);
  }
  
  if (!options.content && !options.append) {
    log('Error: --content or --append required', 'red');
    process.exit(1);
  }
  
  // Ensure .md extension
  if (!notePath.endsWith('.md')) {
    notePath = notePath + '.md';
  }
  
  const { path: fullPath } = await getNote(vaultPath, notePath, true);
  
  if (options.append) {
    fs.appendFileSync(fullPath, '\n' + options.content);
    log(`\n${colors.green}Appended to note${colors.reset}`);
  } else {
    fs.writeFileSync(fullPath, options.content);
    log(`\n${colors.green}Wrote note${colors.reset}`);
  }
}

async function cmdTags(vaultPath, options) {
  const notes = await getNotes(vaultPath);
  const allTags = {};
  
  for (const note of notes) {
    try {
      const content = fs.readFileSync(note.path, 'utf8');
      const { frontmatter } = parseFrontmatter(content);
      
      // Check frontmatter tags
      if (frontmatter.tags) {
        const tags = Array.isArray(frontmatter.tags) 
          ? frontmatter.tags 
          : frontmatter.tags.split(',').map(t => t.trim());
        for (const tag of tags) {
          if (!allTags[tag]) allTags[tag] = [];
          allTags[tag].push(note.relativePath);
        }
      }
      
      // Check content tags (#tag)
      const tagMatches = content.match(/#[a-zA-Z0-9_-]+/g) || [];
      for (const tag of tagMatches) {
        const tagName = tag.substring(1);
        if (!allTags[tagName]) allTags[tagName] = [];
        if (!allTags[tagName].includes(note.relativePath)) {
          allTags[tagName].push(note.relativePath);
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (options.json) {
    console.log(JSON.stringify(allTags, null, 2));
    return;
  }
  
  log(`\n${colors.bright}Tags in Vault${colors.reset}\n`, 'cyan');
  
  const sortedTags = Object.keys(allTags).sort();
  for (const tag of sortedTags) {
    log(`#${tag}: ${allTags[tag].length} notes`, 'green');
  }
}

async function cmdBacklinks(vaultPath, notePath, options) {
  if (!notePath) {
    log('Error: Note path required', 'red');
    process.exit(1);
  }
  
  // Get note name without extension
  const noteName = path.basename(notePath, '.md');
  const notes = await getNotes(vaultPath);
  const backlinks = [];
  
  for (const note of notes) {
    if (note.relativePath === notePath) continue;
    
    try {
      const content = fs.readFileSync(note.path, 'utf8');
      // Check for wiki links [[NoteName]]
      if (content.includes(`[[${noteName}]]`)) {
        backlinks.push({
          source: note.relativePath,
          type: 'wiki-link'
        });
      }
      // Check for markdown links [text](note.md)
      if (content.includes(`](${noteName}.md)`) || content.includes(`](${notePath})`)) {
        backlinks.push({
          source: note.relativePath,
          type: 'markdown-link'
        });
      }
    } catch (e) {
      // Skip
    }
  }
  
  if (options.json) {
    console.log(JSON.stringify(backlinks, null, 2));
    return;
  }
  
  log(`\n${colors.bright}Backlinks to ${noteName}${colors.reset}\n`, 'cyan');
  
  if (backlinks.length === 0) {
    log('No backlinks found');
    return;
  }
  
  for (const link of backlinks) {
    log(`[[${link.source}]]`, 'green');
    log(`  Type: ${link.type}`);
    log('');
  }
}

async function cmdGraph(vaultPath, options) {
  const notes = await getNotes(vaultPath);
  const links = [];
  
  for (const note of notes) {
    try {
      const content = fs.readFileSync(note.path, 'utf8');
      const wikiLinks = content.match(/\[\[([^\]]+)\]\]/g) || [];
      
      for (const link of wikiLinks) {
        const target = link.replace(/\[\[|\]\]/g, '');
        links.push({
          source: note.name,
          target
        });
      }
    } catch (e) {
      // Skip
    }
  }
  
  if (options.json) {
    console.log(JSON.stringify({ notes: notes.map(n => n.name), links }, null, 2));
    return;
  }
  
  log(`\n${colors.bright}Vault Graph${colors.reset}\n`, 'cyan');
  log(`Notes: ${notes.length}`);
  log(`Links: ${links.length}\n`);
  
  // Show some link examples
  const sample = links.slice(0, 20);
  for (const link of sample) {
    log(`${link.source} → ${link.target}`, 'green');
  }
  
  if (links.length > 20) {
    log(`\n... and ${links.length - 20} more links`);
  }
}

async function cmdRecent(vaultPath, options) {
  const notes = await getNotes(vaultPath);
  
  // Sort by modification time
  const withTimes = notes.map(note => ({
    ...note,
    mtime: fs.statSync(note.path).mtime
  }));
  
  withTimes.sort((a, b) => b.mtime - a.mtime);
  
  const limit = parseInt(options.n) || 10;
  const recent = withTimes.slice(0, limit);
  
  if (options.json) {
    console.log(JSON.stringify(recent, null, 2));
    return;
  }
  
  log(`\n${colors.bright}Recent Notes${colors.reset}\n`, 'cyan');
  
  for (const note of recent) {
    log(`${note.relativePath}`, 'green');
    log(`  Modified: ${note.mtime.toLocaleString()}`);
    log('');
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  const vaultPath = getVaultPath();
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log(`
${colors.bright}Obsidian CLI${colors.reset}
Interact with Obsidian vaults

${colors.cyan}Commands:${colors.reset}
  obsidian.js list                    List all notes
  obsidian.js search <query>          Search notes by content
  obsidian.js read <note-path>       Read a note
  obsidian.js create <note-path>     Create a new note
  obsidian.js write <note-path> --content "text"
  obsidian.js write <note-path> --append "text"
  obsidian.js tags                    List all tags
  obsidian.js backlinks <note-path> Find backlinks
  obsidian.js graph                   Show note links
  obsidian.js recent                  Recent notes

${colors.cyan}Options:${colors.reset}
  --json    JSON output
  -n <num>  Number of results

${colors.cyan}Environment:${colors.reset}
  OBSIDIAN_VAULT_PATH    Path to vault

${colors.cyan}Examples:${colors.reset}
  obsidian.js list
  obsidian.js search "TODO"
  obsidian.js read "Journal/2024-01-01.md"
  obsidian.js create "Notes/New Idea.md"
  obsidian.js tags
`);
    process.exit(0);
  }
  
  if (!vaultPath) {
    log('Error: Obsidian vault not found. Set OBSIDIAN_VAULT_PATH environment variable.', 'red');
    process.exit(1);
  }
  
  log(`Using vault: ${vaultPath}`, 'blue');
  
  const cmd = args[0];
  const cmdArgs = args.slice(1);
  const { positional, options } = parseArgs(cmdArgs);
  
  try {
    switch (cmd) {
      case 'list':
        await cmdList(vaultPath, options);
        break;
      case 'search':
        await cmdSearch(vaultPath, positional.join(' '), options);
        break;
      case 'read':
        await cmdRead(vaultPath, positional[0], options);
        break;
      case 'create':
        await cmdCreate(vaultPath, positional[0], options);
        break;
      case 'write':
        await cmdWrite(vaultPath, positional[0], options);
        break;
      case 'tags':
        await cmdTags(vaultPath, options);
        break;
      case 'backlinks':
        await cmdBacklinks(vaultPath, positional[0], options);
        break;
      case 'graph':
        await cmdGraph(vaultPath, options);
        break;
      case 'recent':
        await cmdRecent(vaultPath, options);
        break;
      default:
        log(`Unknown command: ${cmd}`, 'red');
        process.exit(1);
    }
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
