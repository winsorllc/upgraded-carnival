#!/usr/bin/env node

/**
 * Markdown Tools Skill
 * Process and transform markdown documents
 */

const fs = require('fs');
const path = require('path');

function parseArgs(args) {
  if (args.length === 0) return { command: null, files: [] };
  
  const command = args[0];
  const files = args.slice(1);
  
  return { command, files };
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractHeadings(content) {
  const headings = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      headings.push({
        level,
        text,
        slug: slugify(text),
        line: i + 1
      });
    }
  }
  
  return headings;
}

function generateToc(content, options = {}) {
  const headings = extractHeadings(content);
  const toc = [];
  
  headings.forEach(h => {
    const indent = '  '.repeat(h.level - 1);
    toc.push(`${indent}- [${h.text}](#${h.slug})`);
  });
  
  return `## Table of Contents\n\n${toc.join('\n')}`;
}

function stripMarkdown(content) {
  let text = content;
  
  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`[^`]+`/g, '');
  
  // Remove images
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  
  // Remove links, keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove headers
  text = text.replace(/^#{1,6}\s+/gm, '');
  
  // Remove bold/italic
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  
  // Remove blockquotes
  text = text.replace(/^>\s*/gm, '');
  
  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}$/gm, '');
  
  // Remove list markers
  text = text.replace(/^[\s]*[-*+]\s+/gm, '');
  text = text.replace(/^[\s]*\d+\.\s+/gm, '');
  
  return text.trim();
}

function countWords(content) {
  const stripped = stripMarkdown(content);
  const words = stripped.split(/\s+/).filter(w => w.length > 0);
  const chars = stripped.length;
  const charsNoSpace = stripped.replace(/\s/g, '').length;
  const lines = content.split('\n').length;
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0).length;
  
  return {
    words: words.length,
    characters: chars,
    charactersNoSpace: charsNoSpace,
    lines,
    paragraphs
  };
}

function extractLinks(content) {
  const links = [];
  
  // Markdown links
  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = mdLinkRegex.exec(content)) !== null) {
    links.push({
      text: match[1],
      url: match[2],
      type: match[2].startsWith('http') ? 'external' : 'internal'
    });
  }
  
  // Image links
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  while ((match = imgRegex.exec(content)) !== null) {
    links.push({
      text: match[1] || 'image',
      url: match[2],
      type: 'image'
    });
  }
  
  // Autolinks
  const autoLinkRegex = /<(https?:\/\/[^>]+)>/g;
  while ((match = autoLinkRegex.exec(content)) !== null) {
    links.push({
      text: match[1],
      url: match[1],
      type: 'external'
    });
  }
  
  return links;
}

function checkLinks(content, basePath, fileDir) {
  const links = extractLinks(content);
  const internalLinks = links.filter(l => l.type === 'internal' && !l.url.startsWith('#'));
  const results = { valid: [], broken: [] };
  
  for (const link of internalLinks) {
    const [urlPath, anchor] = link.url.split('#');
    let targetPath = urlPath;
    
    // Resolve relative path
    if (!targetPath.startsWith('/')) {
      targetPath = path.join(fileDir, targetPath);
    } else {
      targetPath = path.join(basePath, targetPath);
    }
    
    // Check if file exists
    const exists = fs.existsSync(targetPath);
    
    if (exists) {
      results.valid.push(link);
    } else {
      results.broken.push({ ...link, reason: 'File not found' });
    }
  }
  
  return results;
}

function toHTML(content) {
  let html = content;
  
  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Headers
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  
  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Horizontal rules
  html = html.replace(/^[-*_]{3,}$/gm, '<hr>');
  
  // Lists (simplified)
  html = html.replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>');
  
  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  
  return html;
}

function displayHeadings(headings) {
  const result = headings.map(h => {
    const indent = '  '.repeat(h.level - 1);
    return `${indent}${'#'.repeat(h.level)} ${h.text} (line ${h.line})`;
  });
  return result.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const { command, files } = parseArgs(args);
  
  const usage = `Usage: markdown.js <command> <file> [output]
Commands:
  toc         Generate table of contents
  html        Convert to HTML
  headings    Extract headings
  links       List all links
  check-links Verify internal links
  count       Word/character count
  strip       Remove markdown formatting`;
  
  if (!command || files.length === 0 || command === '--help') {
    console.log(usage);
    process.exit(0);
  }
  
  const filePath = files[0];
  const outputPath = files[1];
  let content;
  
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.error(`Error reading file: ${filePath}`);
    process.exit(1);
  }
  
  try {
    let result;
    
    switch (command) {
      case 'toc':
        result = generateToc(content);
        break;
        
      case 'html':
        result = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${path.basename(filePath, '.md')}</title>
</head>
<body>
${toHTML(content)}
</body>
</html>`;
        break;
        
      case 'headings':
        result = displayHeadings(extractHeadings(content));
        break;
        
      case 'links':
        result = JSON.stringify(extractLinks(content), null, 2);
        break;
        
      case 'check-links':
        result = checkLinks(content, path.dirname(filePath), path.dirname(path.resolve(filePath)));
        console.log(`Valid links: ${result.valid.length}`);
        console.log(`Broken links: ${result.broken.length}`);
        if (result.broken.length > 0) {
          console.log('\nBroken:');
          result.broken.forEach(l => console.log(`  - ${l.url}: ${l.reason}`));
        }
        result = JSON.stringify(result, null, 2);
        break;
        
      case 'count':
        result = JSON.stringify(countWords(content), null, 2);
        break;
        
      case 'strip':
        result = stripMarkdown(content);
        break;
        
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
    
    if (outputPath) {
      fs.writeFileSync(outputPath, result);
      console.log(`Output written to: ${outputPath}`);
    } else {
      console.log(result);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
