#!/usr/bin/env node

/**
 * Obsidian Vault Skill
 * Work with Obsidian markdown notes and vaults
 */

const fs = require('fs');
const path = require('path');

// Common vault locations
const VAULT_PATHS = [
  process.env.OBSIDIAN_VAULT,
  path.join(process.env.HOME || process.env.USERPROFILE || '', 'Documents', 'Obsidian'),
  path.join(process.env.HOME || process.env.USERPROFILE || '', 'obsidian'),
  process.cwd()
].filter(p => p);

function findVault(customPath) {
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }
  
  for (const vaultPath of VAULT_PATHS) {
    if (fs.existsSync(vaultPath) && fs.statSync(vaultPath).isDirectory()) {
      // Check if it looks like an Obsidian vault
      const hasMarkdown = fs.readdirSync(vaultPath).some(f => f.endsWith('.md'));
      if (hasMarkdown || fs.existsSync(path.join(vaultPath, '.obsidian'))) {
        return vaultPath;
      }
    }
  }
  
  return null;
}

function findNotes(vaultPath, query = null) {
  const notes = [];
  
  function searchDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      
      const fullPath = path.join(dir, entry.path || dir, entry.name);
      
      if (entry.isDirectory()) {
        searchDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        if (query) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.toLowerCase().includes(query.toLowerCase())) {
            notes.push({
              path: path.relative(vaultPath, fullPath),
              snippet: content.substring(0, 200).replace(/\n/g, ' ')
            });
          }
        } else {
          notes.push(path.relative(vaultPath, fullPath));
        }
      }
    }
  }
  
  searchDir(vaultPath);
  return notes;
}

function createNote(vaultPath, name, content) {
  const notePath = path.join(vaultPath, name.endsWith('.md') ? name : `${name}.md`);
  
  // Create directory if needed
  const dir = path.dirname(notePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const frontmatter = `---
created: ${new Date().toISOString().split('T')[0]}
---

`;
  
  fs.writeFileSync(notePath, frontmatter + content);
  return notePath;
}

function readNote(vaultPath, notePath) {
  const fullPath = path.join(vaultPath, notePath.endsWith('.md') ? notePath : `${notePath}.md`);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Note not found: ${notePath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function appendToNote(vaultPath, notePath, text) {
  const fullPath = path.join(vaultPath, notePath.endsWith('.md') ? notePath : `${notePath}.md`);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Note not found: ${notePath}`);
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const newContent = content + '\n\n' + text;
  fs.writeFileSync(fullPath, newContent);
  return fullPath;
}

function addWikiLink(vaultPath, sourceNote, targetNote) {
  const sourcePath = path.join(vaultPath, sourceNote.endsWith('.md') ? sourceNote : `${sourceNote}.md`);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source note not found: ${sourceNote}`);
  }
  
  const targetName = targetNote.replace(/\.md$/, '');
  const link = `[[${targetName}]]`;
  
  const content = fs.readFileSync(sourcePath, 'utf8');
  
  // Check if link already exists
  if (content.includes(`[[${targetName}]]`)) {
    return { exists: true, path: sourcePath };
  }
  
  // Add link at the end
  const newContent = content.trimEnd() + '\n\n---\nRelated: ' + link + '\n';
  fs.writeFileSync(sourcePath, newContent);
  return { exists: false, path: sourcePath };
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage:');
    console.error('  obsidian.js search <query> [vault_path]');
    console.error('  obsidian.js list [vault_path]');
    console.error('  obsidian.js create <note_name> <content>');
    console.error('  obsidian.js read <note_path>');
    console.error('  obsidian.js append <note_path> <text>');
    console.error('  obsidian.js link <source_note> <target_note>');
    process.exit(1);
  }
  
  const command = args[0];
  const vaultPath = findVault(args[args.length - 1]);
  
  if (!vaultPath) {
    console.error('Error: No Obsidian vault found. Set OBSIDIAN_VAULT env var or place notes in ~/Documents/Obsidian');
    process.exit(1);
  }
  
  try {
    switch (command) {
      case 'search': {
        const query = args[1];
        if (!query) {
          console.error('Error: Search query required');
          process.exit(1);
        }
        const notes = findNotes(vaultPath, query);
        console.log(`Found ${notes.length} note(s) matching "${query}":`);
        notes.forEach(note => {
          console.log(`  - ${note.path}`);
          console.log(`    ${note.snippet}...`);
        });
        break;
      }
      
      case 'list': {
        const notes = findNotes(vaultPath);
        console.log(`Notes in vault (${notes.length}):`);
        notes.forEach(note => console.log(`  ${note}`));
        break;
      }
      
      case 'create': {
        if (args.length < 3) {
          console.error('Error: Note name and content required');
          process.exit(1);
        }
        const name = args[1];
        const content = args.slice(2).join(' ');
        const notePath = createNote(vaultPath, name, content);
        console.log(`Created: ${notePath}`);
        break;
      }
      
      case 'read': {
        if (args.length < 2) {
          console.error('Error: Note path required');
          process.exit(1);
        }
        const notePath = args[1];
        const content = readNote(vaultPath, notePath);
        console.log(content);
        break;
      }
      
      case 'append': {
        if (args.length < 3) {
          console.error('Error: Note path and text required');
          process.exit(1);
        }
        const notePath = args[1];
        const text = args.slice(2).join(' ');
        const fullPath = appendToNote(vaultPath, notePath, text);
        console.log(`Appended to: ${fullPath}`);
        break;
      }
      
      case 'link': {
        if (args.length < 3) {
          console.error('Error: Source and target notes required');
          process.exit(1);
        }
        const sourceNote = args[1];
        const targetNote = args[2];
        const result = addWikiLink(vaultPath, sourceNote, targetNote);
        if (result.exists) {
          console.log(`Link already exists in: ${result.path}`);
        } else {
          console.log(`Added link to: ${result.path}`);
        }
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
