#!/usr/bin/env node

/**
 * Obsidian Vault Integration
 * Provides tools for reading, writing, and searching Obsidian vaults
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DEFAULT_OBSIDIAN_PATH = process.env.OBSIDIAN_VAULT_PATH || 
  (process.env.HOME ? path.join(process.env.HOME, 'Obsidian') : null);

const VAULT_PATH = process.argv[2] || DEFAULT_OBSIDIAN_PATH;

// Parse command
const cmd = process.argv[3];
const arg1 = process.argv[4];
const arg2 = process.argv[5];

// Check vault exists
function getVaultPath(customPath) {
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }
  if (VAULT_PATH && fs.existsSync(VAULT_PATH)) {
    return VAULT_PATH;
  }
  return null;
}

const vaultPath = getVaultPath();

function output(format, data) {
  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

function errorExit(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

// List vaults/directories
function list() {
  if (!vaultPath) {
    errorExit(`Obsidian vault not found. Set OBSIDIAN_VAULT_PATH or provide path.`);
  }
  
  const items = fs.readdirSync(vaultPath, { withFileTypes: true });
  const dirs = items.filter(i => i.isDirectory()).map(i => `${i.name}/`);
  const files = items.filter(i => i.isFile() && i.name.endsWith('.md')).map(i => i.name);
  
  console.log(`Vault: ${vaultPath}\n`);
  console.log('Directories:');
  console.log(dirs.join('\n') || '(none)');
  console.log('\nNotes:');
  console.log(files.join('\n') || '(none)');
}

// Search notes
function search(query) {
  if (!vaultPath) errorExit('Vault not found');
  if (!query) errorExit('Search query required');
  
  console.log(`Searching for: "${query}"`);
  
  try {
    const results = [];
    const files = execSync(`find "${vaultPath}" -name "*.md" -type f`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes(query.toLowerCase())) {
            const relPath = path.relative(vaultPath, file);
            results.push({
              file: relPath,
              line: idx + 1,
              text: line.trim().substring(0, 150)
            });
          }
        });
      } catch (e) {
        // Skip unreadable files
      }
    }
    
    if (results.length === 0) {
      console.log('No matches found.');
    } else {
      console.log(`\nFound ${results.length} matches:\n`);
      results.slice(0, 20).forEach(r => {
        console.log(`📄 ${r.file}:${r.line}`);
        console.log(`   ${r.text}`);
        console.log();
      });
    }
  } catch (e) {
    errorExit(`Search failed: ${e.message}`);
  }
}

// Read a note
function read(notePath) {
  if (!vaultPath) errorExit('Vault not found');
  if (!notePath) errorExit('Note path required');
  
  // Add .md if not present
  if (!notePath.endsWith('.md')) {
    notePath += '.md';
  }
  
  const fullPath = path.join(vaultPath, notePath);
  
  if (!fs.existsSync(fullPath)) {
    errorExit(`Note not found: ${notePath}`);
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Extract frontmatter
  let frontmatter = {};
  let body = content;
  
  if (content.startsWith('---')) {
    const endIdx = content.indexOf('---', 3);
    if (endIdx !== -1) {
      const fmStr = content.substring(3, endIdx).trim();
      body = content.substring(endIdx + 3).trim();
      
      // Parse YAML-ish frontmatter
      fmStr.split('\n').forEach(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.substring(0, colonIdx).trim();
          const val = line.substring(colonIdx + 1).trim();
          frontmatter[key] = val;
        }
      });
    }
  }
  
  console.log(`📄 ${notePath}\n`);
  if (Object.keys(frontmatter).length > 0) {
    console.log('---');
    Object.entries(frontmatter).forEach(([k, v]) => console.log(`${k}: ${v}`));
    console.log('---\n');
  }
  console.log(body);
}

// Write a note  
function write(notePath, content) {
  if (!vaultPath) errorExit('Vault not found');
  if (!notePath) errorExit('Note path required');
  if (!content) errorExit('Note content required');
  
  // Add .md if not present
  if (!notePath.endsWith('.md')) {
    notePath += '.md';
  }
  
  const fullPath = path.join(vaultPath, notePath);
  const dir = path.dirname(fullPath);
  
  // Create directories if needed
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${path.relative(vaultPath, dir)}`);
  }
  
  fs.writeFileSync(fullPath, content);
  console.log(`✅ Saved note: ${notePath}`);
}

// Create daily note
function daily() {
  if (!vaultPath) errorExit('Vault not found');
  
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getFullYear()) + '-' + mm + '-' + String(today.getDate()).padStart(2, '0');
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Check for template
  let content = '';
  const templatePath = path.join(vaultPath, '.obsidian', 'daily-note-template.md');
  
  if (fs.existsSync(templatePath)) {
    content = fs.readFileSync(templatePath, 'utf8');
    content = content.replace(/\{\{date\}\}/g, dd)
                     .replace(/\{\{day\}\}/g, dayName)
                     .replace(/\{\{year\}\}/g, yyyy);
  } else {
    content = `---
date: ${yyyy}-${mm}-${String(today.getDate()).padStart(2, '0')}
tags: [daily]
---

# ${dayName}, ${yyyy}-${mm}-${String(today.getDate()).padStart(2, '0')}

## Todo


## Notes


## Links

`;
  }
  
  const notePath = `${dd}.md`;
  write(notePath, content);
}

// List recent notes
function recent(count = 10) {
  if (!vaultPath) errorExit('Vault not found');
  
  try {
    const files = execSync(
      `find "${vaultPath}" -name "*.md" -type f -printf "%T@ %p\n" | sort -rn | head -${count}`,
      { encoding: 'utf8' }
    );
    
    console.log(`Recent ${count} notes:\n`);
    files.trim().split('\n').forEach(line => {
      const [timestamp, filePath] = line.trim().split(' ');
      const relPath = path.relative(vaultPath, filePath);
      const date = new Date(parseFloat(timestamp) * 1000);
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      console.log(`📄 ${relPath}`);
      console.log(`   Modified: ${dateStr}\n`);
    });
  } catch (e) {
    errorExit(`Failed to list recent notes: ${e.message}`);
  }
}

// List wikilinks in a note
function wlinks(notePath) {
  if (!vaultPath) errorExit('Vault not found');
  if (!notePath) errorExit('Note path required');
  
  const fullPath = path.join(vaultPath, notePath);
  if (!fullPath.endsWith('.md')) {
    fullPath += '.md';
  }
  
  if (!fs.existsSync(fullPath)) {
    errorExit(`Note not found: ${notePath}`);
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const linkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const links = [];
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[1]);
  }
  
  if (links.length === 0) {
    console.log('No wikilinks found in this note.');
  } else {
    console.log(`Wikilinks in ${notePath}:\n`);
    links.forEach(link => console.log(`  [[${link}]]`));
  }
}

// Find backlinks to a note
function backlinks(query) {
  if (!vaultPath) errorExit('Vault not found');
  if (!query) errorExit('Note name required');
  
  console.log(`Finding backlinks to: [[${query}]]\n`);
  
  const results = [];
  const files = execSync(`find "${vaultPath}" -name "*.md" -type f`, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const linkPattern = new RegExp(`\\[\\[${query}(\\|[^\\]]+)?\\]\\]`, 'gi');
      if (linkPattern.test(content)) {
        const relPath = path.relative(vaultPath, file);
        results.push(relPath);
      }
    } catch (e) {
      // Skip
    }
  }
  
  if (results.length === 0) {
    console.log('No backlinks found.');
  } else {
    console.log(`Found ${results.length} notes linking to [[${query}]]:\n`);
    results.forEach(r => console.log(`📄 ${r}`));
  }
}

// List tags
function tags() {
  if (!vaultPath) errorExit('Vault not found');
  
  const tagCounts = {};
  
  const files = execSync(`find "${vaultPath}" -name "*.md" -type f`, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const tagRegex = /#([a-zA-Z0-9_-]+)/g;
      let match;
      while ((match = tagRegex.exec(content)) !== null) {
        const tag = match[1];
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    } catch (e) {
      // Skip
    }
  }
  
  const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  
  if (sorted.length === 0) {
    console.log('No tags found.');
  } else {
    console.log('Tags in vault:\n');
    sorted.forEach(([tag, count]) => {
      console.log(`  #${tag} (${count})`);
    });
  }
}

// Main
const commands = {
  list,
  search,
  read,
  write,
  daily,
  recent,
  'w-links': wlinks,
  backlinks,
  tags
};

if (!cmd) {
  console.log(`
Obsidian Vault Integration

Usage: obsidian <command> [args...]

Commands:
  list                  List vault contents
  search <query>        Search notes for text
  read <path>           Read a note
  write <path> <content> Create/update a note
  daily                 Create today's daily note
  recent [count]        List recent notes (default: 10)
  w-links <path>        Show wikilinks in a note
  backlinks <name>      Find notes linking to a note
  tags                  List all tags in vault

Configuration:
  Set OBSIDIAN_VAULT_PATH env var or pass path as first argument

Example:
  obsidian /path/to/vault search "AI"
  obsidian /path/to/vault daily
`);
  process.exit(0);
}

if (commands[cmd]) {
  try {
    commands[cmd](arg1, arg2);
  } catch (e) {
    errorExit(e.message);
  }
} else {
  errorExit(`Unknown command: ${cmd}`);
}