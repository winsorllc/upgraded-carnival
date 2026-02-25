#!/usr/bin/env node
/**
 * Document Indexer - Core indexing functionality
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const INDEX_PATH = '/tmp/document-index.jsonl';

// Ensure index exists
function ensureIndex() {
  if (!fs.existsSync(INDEX_PATH)) {
    fs.writeFileSync(INDEX_PATH, '');
  }
}

// Generate document ID
function generateId(content) {
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
}

// Extract keywords from text
function extractKeywords(text, max = 10) {
  const words = text.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['this', 'that', 'with', 'from', 'must', 'will', 'shall', 'have', 'been', 'were', 'they', 'them', 'their'].includes(w));
  
  const counts = {};
  words.forEach(w => { counts[w] = (counts[w] || 0) + 1; });
  
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

// Add document to index
function addDocument(filePath, category = 'general') {
  ensureIndex();
  
  const content = fs.readFileSync(filePath, 'utf8');
  const id = generateId(content + filePath);
  const stats = fs.statSync(filePath);
  
  const doc = {
    id,
    path: filePath,
    category,
    title: path.basename(filePath),
    size: stats.size,
    created: stats.birthtime.toISOString(),
    indexed: new Date().toISOString(),
    keywords: extractKeywords(content),
    preview: content.slice(0, 500).replace(/\n/g, ' ')
  };
  
  // Check if already exists
  const index = loadIndex();
  if (index.find(d => d.id === id)) {
    return { success: false, error: 'Document already indexed', id };
  }
  
  fs.appendFileSync(INDEX_PATH, JSON.stringify(doc) + '\n');
  return { success: true, id, doc };
}

// Load full index
function loadIndex() {
  ensureIndex();
  const content = fs.readFileSync(INDEX_PATH, 'utf8');
  return content.trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
}

// Search index
function search(query, options = {}) {
  const terms = query.toLowerCase().split(/\s+/);
  const index = loadIndex();
  
  const results = index.map(doc => {
    let score = 0;
    
    // Title match
    if (terms.some(t => doc.title.toLowerCase().includes(t))) score += 10;
    
    // Keywords match
    const kwMatch = doc.keywords.filter(k => terms.some(t => k.includes(t))).length;
    score += kwMatch * 5;
    
    // Content match
    const contentMatch = terms.filter(t => 
      (doc.preview || doc.content || '').toLowerCase().includes(t)
    ).length;
    score += contentMatch * 2;
    
    // Category match
    if (options.category && doc.category === options.category) score += 15;
    
    return { ...doc, score };
  })
  .filter(r => r.score > 0)
  .sort((a, b) => b.score - a.score);
  
  if (options.limit) {
    return results.slice(0, options.limit);
  }
  return results;
}

// Remove document
function removeDocument(id) {
  const index = loadIndex();
  const newIndex = index.filter(d => d.id !== id);
  
  if (newIndex.length === index.length) {
    return { success: false, error: 'Document not found' };
  }
  
  fs.writeFileSync(INDEX_PATH, newIndex.map(d => JSON.stringify(d)).join('\n') + '\n');
  return { success: true, removed: index.length - newIndex.length };
}

// Get document summary
function summarize(id) {
  const index = loadIndex();
  const doc = index.find(d => d.id === id);
  
  if (!doc) {
    return { error: 'Document not found' };
  }
  
  return {
    id: doc.id,
    title: doc.title,
    category: doc.category,
    keywords: doc.keywords,
    preview: doc.preview,
    indexed: doc.indexed
  };
}

module.exports = { 
  addDocument, 
  search, 
  loadIndex, 
  removeDocument, 
  summarize,
  extractKeywords 
};
