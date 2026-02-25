#!/usr/bin/env node
/**
 * Obsidian CLI - Interact with Obsidian vaults
 * 
 * Usage: obsidian.js <command> [options]
 * 
 * Commands:
 *   search <query>              Search notes
 *   read <title>               Read a note
 *   list                       List all notes
 *   create <title>             Create a new note
 *   update <title>             Update a note
 *   append <title>            Append to a note
 *   tag <tag>                  Find notes by tag
 *   backlinks <title>          Find backlinks
 *   links <title>              Find outgoing links
 * 
 * Options:
 *   --vault <path>             Vault path
 *   --content <text>           Note content
 *   --folder <path>            Folder to search
 *   --limit <number>           Search result limit
 *   --json                     Output as JSON
 *   --metadata                 Include metadata
 *   --detailed                 Detailed listing
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
let VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH || '';

// Parse arguments
const args = process.argv.slice(2);
let command = args[0];

// Check for help
if (args.includes('--help') || args.includes('-h')) {
    showHelp();
}

const options = {
    vault: getArgValue('--vault'),
    content: getArgValue('--content'),
    folder: getArgValue('--folder'),
    limit: getArgValue('--limit'),
    json: args.includes('--json'),
    metadata: args.includes('--metadata'),
    detailed: args.includes('--detailed')
};

if (options.vault) VAULT_PATH = options.vault;
if (!VAULT_PATH) {
    console.error('Error: Vault path required. Set OBSIDIAN_VAULT_PATH or use --vault');
    process.exit(1);
}

function getArgValue(flag) {
    const idx = args.indexOf(flag);
    return idx > 0 && idx < args.length - 1 ? args[idx + 1] : null;
}

function showHelp() {
    console.log(`Obsidian CLI - Interact with Obsidian vaults

Usage: obsidian.js <command> [options]

Commands:
  search <query>              Search notes
  read <title>               Read a note
  list                       List all notes
  create <title>             Create a new note
  update <title>             Update a note
  append <title>            Append to a note
  tag <tag>                  Find notes by tag
  backlinks <title>          Find backlinks
  links <title>              Find outgoing links

Options:
  --vault <path>             Vault path
  --content <text>           Note content
  --folder <path>            Folder to search
  --limit <number>           Search result limit
  --json                     Output as JSON
  --metadata                 Include metadata
  --detailed                 Detailed listing
`);
    process.exit(0);
}

// Helper functions
function getAllMdFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            getAllMdFiles(fullPath, files);
        } else if (item.endsWith('.md')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

function readNote(title) {
    // Try exact match first
    const mdPath = path.join(VAULT_PATH, title + '.md');
    if (fs.existsSync(mdPath)) {
        return readFile(mdPath);
    }
    
    // Try with .md extension
    const withExt = path.join(VAULT_PATH, title + '.md');
    if (fs.existsSync(withExt)) {
        return readFile(withExt);
    }
    
    // Search for title in all files
    const files = getAllMdFiles(VAULT_PATH);
    for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const match = content.match(/^---\n[\s\S]*?\ntitle:\s*(.*?)\n/);
        if (match && match[1] === title) {
            return readFile(file);
        }
    }
    
    return null;
}

function readFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const stat = fs.statSync(filePath);
    
    // Parse frontmatter
    let metadata = {};
    let body = content;
    
    if (content.startsWith('---')) {
        const endIndex = content.indexOf('---', 3);
        if (endIndex !== -1) {
            const frontmatter = content.slice(3, endIndex).trim();
            body = content.slice(endIndex + 3).trim();
            
            frontmatter.split('\n').forEach(line => {
                const [key, ...valueParts] = line.split(':');
                if (key && valueParts.length) {
                    let value = valueParts.join(':').trim();
                    // Remove quotes
                    value = value.replace(/^["']|["']$/g, '');
                    metadata[key.trim()] = value;
                }
            });
        }
    }
    
    return {
        path: path.relative(VAULT_PATH, filePath),
        title: metadata.title || path.basename(filePath, '.md'),
        content: body,
        metadata,
        created: stat.birthtime,
        modified: stat.mtime
    };
}

function searchNotes(query) {
    const files = getAllMdFiles(VAULT_PATH);
    const results = [];
    const limit = parseInt(options.limit) || 50;
    
    for (const file of files) {
        if (results.length >= limit) break;
        
        const content = fs.readFileSync(file, 'utf8');
        const title = path.basename(file, '.md');
        
        if (content.toLowerCase().includes(query.toLowerCase()) ||
            title.toLowerCase().includes(query.toLowerCase())) {
            // Extract context around match
            const lowerContent = content.toLowerCase();
            const matchIndex = lowerContent.indexOf(query.toLowerCase());
            let context = '';
            
            if (matchIndex !== -1) {
                const start = Math.max(0, matchIndex - 50);
                const end = Math.min(content.length, matchIndex + query.length + 50);
                context = (start > 0 ? '...' : '') + 
                          content.slice(start, end) + 
                          (end < content.length ? '...' : '');
            }
            
            results.push({
                title,
                path: path.relative(VAULT_PATH, file),
                context: context.trim()
            });
        }
    }
    
    return results;
}

function listNotes() {
    const files = getAllMdFiles(VAULT_PATH);
    const results = [];
    
    for (const file of files) {
        let relativePath = path.relative(VAULT_PATH, file);
        
        // Filter by folder if specified
        if (options.folder && !relativePath.startsWith(options.folder)) {
            continue;
        }
        
        const stat = fs.statSync(file);
        const content = fs.readFileSync(file, 'utf8');
        
        // Extract title from frontmatter or filename
        let title = path.basename(file, '.md');
        let tags = [];
        
        if (content.startsWith('---')) {
            const endIndex = content.indexOf('---', 3);
            if (endIndex !== -1) {
                const frontmatter = content.slice(3, endIndex);
                const titleMatch = frontmatter.match(/title:\s*(.*)/);
                if (titleMatch) title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
                
                const tagsMatch = frontmatter.match(/tags:\s*\[(.*?)\]/);
                if (tagsMatch) {
                    tags = tagsMatch[1].split(',').map(t => t.trim().replace(/["']/g, ''));
                }
            }
        }
        
        results.push({
            title,
            path: relativePath,
            tags,
            modified: stat.mtime,
            size: stat.size
        });
    }
    
    return results.sort((a, b) => b.modified - a.modified);
}

function createNote(title, content = '') {
    const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '-');
    const filePath = path.join(VAULT_PATH, sanitizedTitle + '.md');
    
    if (fs.existsSync(filePath)) {
        console.error(`Note already exists: ${title}`);
        process.exit(1);
    }
    
    const noteContent = content || `# ${title}\n\n`;
    fs.writeFileSync(filePath, noteContent);
    
    return {
        title,
        path: sanitizedTitle + '.md',
        created: true
    };
}

function updateNote(title, newContent) {
    const note = readNote(title);
    if (!note) {
        console.error(`Note not found: ${title}`);
        process.exit(1);
    }
    
    const filePath = path.join(VAULT_PATH, note.path);
    
    // Preserve frontmatter if exists
    let fullContent = newContent;
    if (note.content !== fs.readFileSync(filePath, 'utf8')) {
        // Rebuild with frontmatter
        const frontmatter = Object.entries(note.metadata)
            .map(([k, v]) => `${k}: "${v}"`)
            .join('\n');
        fullContent = `---\n${frontmatter}\n---\n\n${newContent}`;
    }
    
    fs.writeFileSync(filePath, fullContent);
    
    return {
        title,
        path: note.path,
        updated: true
    };
}

function appendToNote(title, additionalContent) {
    const note = readNote(title);
    if (!note) {
        console.error(`Note not found: ${title}`);
        process.exit(1);
    }
    
    const filePath = path.join(VAULT_PATH, note.path);
    const currentContent = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(filePath, currentContent + '\n\n' + additionalContent);
    
    return {
        title,
        appended: true
    };
}

function findByTag(tag) {
    const files = getAllMdFiles(VAULT_PATH);
    const results = [];
    
    for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check frontmatter tags
        let hasTag = false;
        if (content.startsWith('---')) {
            const endIndex = content.indexOf('---', 3);
            if (endIndex !== -1) {
                const frontmatter = content.slice(3, endIndex);
                if (frontmatter.includes(tag) || frontmatter.includes(`[${tag}`)) {
                    hasTag = true;
                }
            }
        }
        
        // Check body tags #tag
        if (content.includes(`#${tag}`)) {
            hasTag = true;
        }
        
        if (hasTag) {
            results.push({
                title: path.basename(file, '.md'),
                path: path.relative(VAULT_PATH, file)
            });
        }
    }
    
    return results;
}

function findBacklinks(title) {
    const files = getAllMdFiles(VAULT_PATH);
    const results = [];
    const linkVariants = [
        `[[${title}]]`,
        `[[${title}|`,
        title  // Plain mention
    ];
    
    for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const fileName = path.basename(file, '.md');
        
        // Skip the note itself
        if (fileName === title) continue;
        
        for (const variant of linkVariants) {
            if (content.includes(variant)) {
                results.push({
                    title: fileName,
                    path: path.relative(VAULT_PATH, file)
                });
                break;
            }
        }
    }
    
    return results;
}

function findLinks(title) {
    const note = readNote(title);
    if (!note) {
        console.error(`Note not found: ${title}`);
        process.exit(1);
    }
    
    const links = [];
    const linkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    let match;
    
    while ((match = linkRegex.exec(note.content)) !== null) {
        links.push(match[1]);
    }
    
    return links;
}

// Output helpers
function output(data) {
    if (options.json) {
        console.log(JSON.stringify(data, null, 2));
    } else if (Array.isArray(data)) {
        data.forEach(item => console.log(JSON.stringify(item)));
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

function formatList(notes) {
    if (options.json) {
        output(notes);
        return;
    }
    
    if (options.detailed) {
        notes.forEach(note => {
            console.log(`${note.title}`);
            console.log(`  Path: ${note.path}`);
            console.log(`  Tags: ${note.tags?.join(', ') || 'none'}`);
            console.log(`  Modified: ${note.modified.toISOString().slice(0, 10)}`);
            console.log('');
        });
    } else {
        notes.forEach(note => {
            console.log(note.title);
        });
    }
}

// Main dispatcher
function main() {
    if (!command) {
        showHelp();
        return;
    }
    
    const param1 = args[1];
    const param2 = args[2];
    
    try {
        switch (command) {
            case 'search':
                if (!param1) {
                    console.error('Search query required');
                    process.exit(1);
                }
                output(searchNotes(param1));
                break;
                
            case 'read':
                if (!param1) {
                    console.error('Note title required');
                    process.exit(1);
                }
                const note = readNote(param1);
                if (!note) {
                    console.error(`Note not found: ${param1}`);
                    process.exit(1);
                }
                if (options.metadata || options.json) {
                    output(note);
                } else {
                    console.log(note.content);
                }
                break;
                
            case 'list':
                const notes = listNotes();
                formatList(notes);
                break;
                
            case 'create':
                if (!param1) {
                    console.error('Note title required');
                    process.exit(1);
                }
                output(createNote(param1, options.content));
                break;
                
            case 'update':
                if (!param1) {
                    console.error('Note title required');
                    process.exit(1);
                }
                if (!options.content) {
                    console.error('--content required for update');
                    process.exit(1);
                }
                output(updateNote(param1, options.content));
                break;
                
            case 'append':
                if (!param1) {
                    console.error('Note title required');
                    process.exit(1);
                }
                if (!options.content) {
                    console.error('--content required for append');
                    process.exit(1);
                }
                output(appendToNote(param1, options.content));
                break;
                
            case 'tag':
                if (!param1) {
                    console.error('Tag required');
                    process.exit(1);
                }
                output(findByTag(param1));
                break;
                
            case 'backlinks':
                if (!param1) {
                    console.error('Note title required');
                    process.exit(1);
                }
                output(findBacklinks(param1));
                break;
                
            case 'links':
                if (!param1) {
                    console.error('Note title required');
                    process.exit(1);
                }
                output(findLinks(param1));
                break;
                
            default:
                console.error(`Unknown command: ${command}`);
                showHelp();
        }
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

main();
