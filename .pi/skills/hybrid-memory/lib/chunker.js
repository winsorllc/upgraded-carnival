/**
 * Text Chunker
 * Splits text into semantically meaningful chunks while preserving structure
 */

const MAX_CHUNK_SIZE = 2000; // characters
const MIN_CHUNK_SIZE = 100;  // characters

/**
 * Extract headers from markdown text
 * Returns array of { level, text, index }
 */
function extractHeaders(text) {
  const headers = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headers.push({
        level: match[1].length,
        text: match[2].trim(),
        index: i
      });
    }
  }
  
  return headers;
}

/**
 * Split text by paragraphs
 */
function splitByParagraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * Split text into lines
 */
function splitByLines(text) {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

/**
 * Create a chunk with header context
 */
function createChunk(content, headers, startLine) {
  // Build header context
  const relevantHeaders = headers
    .filter(h => h.index <= startLine)
    .sort((a, b) => b.level - a.level); // Sort by level descending
  
  // Only include most specific headers (lower level = more specific)
  const contextHeaders = [];
  let minLevel = Infinity;
  
  for (const h of relevantHeaders) {
    if (h.level <= minLevel) {
      contextHeaders.unshift(`${'#'.repeat(h.level)} ${h.text}`);
      minLevel = h.level;
    }
  }
  
  const headerContext = contextHeaders.join('\n');
  
  return {
    content: content.trim(),
    headerContext: headerContext,
    fullContent: headerContext ? `${headerContext}\n\n${content.trim()}` : content.trim()
  };
}

/**
 * Chunk text intelligently while preserving markdown structure
 */
function chunkText(text, options = {}) {
  const maxSize = options.maxSize || MAX_CHUNK_SIZE;
  const minSize = options.minSize || MIN_CHUNK_SIZE;
  
  // If text is small enough, return as single chunk
  if (text.length <= maxSize) {
    const headers = extractHeaders(text);
    return [{
      content: text.trim(),
      headerContext: '',
      fullContent: text.trim(),
      charCount: text.length,
      wordCount: text.split(/\s+/).length,
      lineCount: text.split('\n').length
    }];
  }
  
  const headers = extractHeaders(text);
  const paragraphs = splitByParagraphs(text);
  const chunks = [];
  let currentChunk = '';
  let currentLines = 0;
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed max size
    if (currentChunk.length + paragraph.length + 2 > maxSize) {
      // Save current chunk if it's big enough
      if (currentChunk.length >= minSize) {
        chunks.push(createChunk(currentChunk, headers, currentLines));
      }
      
      // Start new chunk with current paragraph
      currentChunk = paragraph;
    } else {
      // Add to current chunk
      if (currentChunk) {
        currentChunk += '\n\n' + paragraph;
      } else {
        currentChunk = paragraph;
      }
    }
    
    currentLines += paragraph.split('\n').length + 1;
  }
  
  // Don't forget the last chunk
  if (currentChunk.length >= minSize) {
    chunks.push(createChunk(currentChunk, headers, currentLines));
  }
  
  // Add metadata to each chunk
  return chunks.map((chunk, index) => ({
    ...chunk,
    charCount: chunk.fullContent.length,
    wordCount: chunk.fullContent.split(/\s+/).length,
    lineCount: chunk.fullContent.split('\n').length,
    chunkIndex: index,
    totalChunks: chunks.length
  }));
}

/**
 * Chunk markdown file with structure preservation
 */
function chunkMarkdown(text) {
  const headers = extractHeaders(text);
  
  // If no headers, use simple paragraph chunking
  if (headers.length === 0) {
    return chunkText(text);
  }
  
  // Split by sections (level 1 and 2 headers)
  const sections = [];
  let currentSection = { header: null, content: [] };
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^(#{1,2})\s+(.+)$/);
    
    if (headerMatch) {
      // Save previous section
      if (currentSection.content.length > 0) {
        const content = currentSection.content.join('\n');
        if (content.trim().length > MIN_CHUNK_SIZE) {
          sections.push({
            header: currentSection.header,
            content: content,
            level: currentSection.header ? 
              (currentSection.header.match(/^(#{1,6})/)?.[1].length || 0) : 0
          });
        }
      }
      
      // Start new section
      currentSection = {
        header: line,
        content: []
      };
    } else {
      currentSection.content.push(line);
    }
  }
  
  // Don't forget last section
  if (currentSection.content.length > 0) {
    const content = currentSection.content.join('\n');
    if (content.trim().length > MIN_CHUNK_SIZE) {
      sections.push({
        header: currentSection.header,
        content: content,
        level: currentSection.header ? 
          (currentSection.header.match(/^(#{1,6})/)?.[1].length || 0) : 0
      });
    }
  }
  
  // Create chunks from sections
  const chunks = [];
  
  for (const section of sections) {
    const sectionText = section.header ? 
      `${section.header}\n${section.content}` : 
      section.content;
    
    if (sectionText.length <= MAX_CHUNK_SIZE) {
      chunks.push({
        content: section.content.trim(),
        headerContext: section.header || '',
        fullContent: sectionText.trim(),
        charCount: sectionText.length,
        wordCount: sectionText.split(/\s+/).length,
        lineCount: sectionText.split('\n').length,
        headerLevel: section.level
      });
    } else {
      // Split large sections
      const subChunks = chunkText(sectionText, { maxSize: MAX_CHUNK_SIZE });
      chunks.push(...subChunks);
    }
  }
  
  // Add indices
  return chunks.map((chunk, index) => ({
    ...chunk,
    chunkIndex: index,
    totalChunks: chunks.length
  }));
}

/**
 * Simple chunking for code or plain text
 */
function chunkSimple(text) {
  return chunkText(text);
}

module.exports = {
  chunkText,
  chunkMarkdown,
  chunkSimple,
  extractHeaders,
  MAX_CHUNK_SIZE,
  MIN_CHUNK_SIZE
};
