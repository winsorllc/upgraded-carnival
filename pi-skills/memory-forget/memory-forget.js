#!/usr/bin/env node

/**
 * Memory Forget CLI
 * Based on zeroclaw's memory_forget tool
 * Allows selective removal of stored memories
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = process.env.MEMORY_DIR || path.join(process.cwd(), '.memory');
const MEMORY_FILE = path.join(MEMORY_DIR, 'memories.json');

// Ensure memory directory exists
function ensureMemoryDir() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

// Load memories
function loadMemories() {
  ensureMemoryDir();
  if (fs.existsSync(MEMORY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

// Save memories
function saveMemories(memories) {
  ensureMemoryDir();
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2));
}

// List memories
function listMemories(args) {
  const { filter, limit = 50 } = args;
  
  let memories = loadMemories();
  
  if (filter) {
    memories = memories.filter(m => 
      m.content.toLowerCase().includes(filter.toLowerCase()) ||
      m.tags?.some(t => t.toLowerCase().includes(filter.toLowerCase()))
    );
  }
  
  // Sort by timestamp (newest first)
  memories.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  const limited = memories.slice(0, limit);
  
  if (limited.length === 0) {
    return { success: true, output: 'No memories found.', error: null, memories: [] };
  }
  
  let output = `Memories (${memories.length} total, showing ${limited.length}):\n\n`;
  
  for (const mem of limited) {
    const date = new Date(mem.timestamp).toISOString().split('T')[0];
    output += `[${date}] ${mem.content.slice(0, 100)}${mem.content.length > 100 ? '...' : ''}\n`;
    if (mem.tags && mem.tags.length > 0) {
      output += `   Tags: ${mem.tags.join(', ')}\n`;
    }
    output += `   ID: ${mem.id}\n\n`;
  }
  
  return { success: true, output, error: null, memories: limited, total: memories.length };
}

// Forget memories
function forgetMemories(args) {
  const { 
    id, 
    keyword, 
    older_than, 
    newer_than,
    all,
    tags,
    confirm = false
  } = args;
  
  if (!confirm && !id) {
    return {
      success: false,
      output: 'This would delete memories. Add "confirm": true to actually delete.',
      error: 'Confirmation required',
      preview: true
    };
  }
  
  if (!id && !keyword && !older_than && !newer_than && !all && (!tags || tags.length === 0)) {
    return { 
      success: false, 
      output: 'Specify id, keyword, older_than, newer_than, tags, or all to forget', 
      error: 'No criteria specified' 
    };
  }
  
  let memories = loadMemories();
  const originalCount = memories.length;
  
  if (all) {
    memories = [];
  } else if (id) {
    memories = memories.filter(m => m.id !== id);
  } else {
    memories = memories.filter(m => {
      let keep = true;
      
      if (keyword) {
        keep = keep && !m.content.toLowerCase().includes(keyword.toLowerCase());
      }
      
      if (tags && tags.length > 0) {
        keep = keep && !m.tags?.some(t => tags.includes(t));
      }
      
      if (older_than) {
        const cutoff = new Date(older_than);
        keep = keep && new Date(m.timestamp) > cutoff;
      }
      
      if (newer_than) {
        const cutoff = new Date(newer_than);
        keep = keep && new Date(m.timestamp) < cutoff;
      }
      
      return keep;
    });
  }
  
  const deleted = originalCount - memories.length;
  
  if (deleted === 0) {
    return { success: true, output: 'No memories matched the criteria.', error: null, deleted: 0 };
  }
  
  saveMemories(memories);
  
  return {
    success: true,
    output: `Successfully forgot ${deleted} memory${deleted > 1 ? 'ies' : ''}. ${memories.length} remaining.`,
    error: null,
    deleted,
    remaining: memories.length
  };
}

// Show memory stats
function memoryStats(args) {
  const memories = loadMemories();
  
  if (memories.length === 0) {
    return { 
      success: true, 
      output: 'No memories stored.',
      error: null,
      stats: { count: 0, oldest: null, newest: null, size_bytes: 0 }
    };
  }
  
  // Sort by timestamp
  memories.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  const oldest = memories[0];
  const newest = memories[memories.length - 1];
  
  // Count tags
  const tagCounts = {};
  memories.forEach(m => {
    m.tags?.forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });
  
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => `${tag} (${count})`);
  
  const size = Buffer.byteLength(JSON.stringify(memories), 'utf-8');
  
  let output = 'Memory Statistics\n';
  output += '==================\n\n';
  output += `Total memories: ${memories.length}\n`;
  output += `Storage size: ${(size / 1024).toFixed(2)} KB\n`;
  output += `Oldest: ${new Date(oldest.timestamp).toISOString()}\n`;
  output += `Newest: ${new Date(newest.timestamp).toISOString()}\n`;
  
  if (topTags.length > 0) {
    output += `\nTop tags:\n  ${topTags.join('\n  ')}\n`;
  }
  
  return {
    success: true,
    output,
    error: null,
    stats: {
      count: memories.length,
      oldest: oldest.timestamp,
      newest: newest.timestamp,
      size_bytes: size
    }
  };
}

// CLI routing
const command = process.argv[2];
let args = {};

if (process.argv[3]) {
  try {
    args = JSON.parse(process.argv[3]);
  } catch {
    args = {};
  }
}

let result;

switch (command) {
  case 'list':
    result = listMemories(args);
    break;
  case 'forget':
    result = forgetMemories(args);
    break;
  case 'stats':
    result = memoryStats(args);
    break;
  default:
    result = {
      success: false,
      output: `Unknown command: ${command}. Available: list, forget, stats`,
      error: 'Unknown command'
    };
}

console.log(JSON.stringify(result, null, 2));
