/**
 * Feed Storage Module
 * Manages persistent state for tracking seen items
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_STORAGE_PATH = '/job/data/feed-states';

/**
 * Ensure storage directory exists
 */
function ensureStorageDir(storagePath = DEFAULT_STORAGE_PATH) {
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }
  return storagePath;
}

/**
 * Get the state file path for a feed
 */
function getStateFilePath(feedId, storagePath = DEFAULT_STORAGE_PATH) {
  const safeFeedId = feedId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(ensureStorageDir(storagePath), `${safeFeedId}.json`);
}

/**
 * Load seen item IDs for a feed
 * @param {string} feedId - Feed identifier
 * @param {string} storagePath - Custom storage path (optional)
 * @returns {Set<string>} Set of seen item IDs
 */
function loadSeenItems(feedId, storagePath = DEFAULT_STORAGE_PATH) {
  const filePath = getStateFilePath(feedId, storagePath);
  
  if (!fs.existsSync(filePath)) {
    return new Set();
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return new Set(data.seenItems || []);
  } catch (error) {
    console.error(`Error loading state for feed ${feedId}:`, error.message);
    return new Set();
  }
}

/**
 * Save seen item IDs for a feed
 * @param {string} feedId - Feed identifier
 * @param {Set<string>} seenItems - Set of item IDs
 * @param {object} options - Save options
 * @param {number} options.maxItems - Maximum items to keep (default: 100)
 * @param {string} options.storagePath - Custom storage path
 */
function saveSeenItems(feedId, seenItems, options = {}) {
  const { maxItems = 100, storagePath = DEFAULT_STORAGE_PATH } = options;
  const filePath = getStateFilePath(feedId, storagePath);

  // Convert Set to Array and limit size
  const itemsArray = Array.from(seenItems).slice(-maxItems);
  
  const state = {
    feedId,
    lastUpdated: new Date().toISOString(),
    seenItems: itemsArray
  };

  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Detect new items by comparing against seen items
 * @param {string} feedId - Feed identifier
 * @param {Array} items - Array of feed items
 * @param {string} storagePath - Custom storage path (optional)
 * @returns {{newItems: Array, seenCount: number}}
 */
function detectNewItems(feedId, items, storagePath = DEFAULT_STORAGE_PATH) {
  const seenItems = loadSeenItems(feedId, storagePath);
  const newItems = [];

  for (const item of items) {
    if (!seenItems.has(item.id)) {
      newItems.push(item);
      seenItems.add(item.id);
    }
  }

  // Save updated state
  if (newItems.length > 0) {
    saveSeenItems(feedId, seenItems, { storagePath });
  }

  return {
    newItems,
    seenCount: items.length - newItems.length
  };
}

/**
 * Clear all stored state for a feed
 * @param {string} feedId - Feed identifier
 * @param {string} storagePath - Custom storage path (optional)
 */
function clearFeedState(feedId, storagePath = DEFAULT_STORAGE_PATH) {
  const filePath = getStateFilePath(feedId, storagePath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Get storage stats for all feeds
 * @param {string} storagePath - Custom storage path (optional)
 * @returns {object} Stats object
 */
function getStorageStats(storagePath = DEFAULT_STORAGE_PATH) {
  const dirPath = ensureStorageDir(storagePath);
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  
  const stats = {
    totalFeeds: files.length,
    totalItems: 0,
    feeds: []
  };

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf8'));
      stats.feeds.push({
        feedId: data.feedId,
        itemCount: data.seenItems?.length || 0,
        lastUpdated: data.lastUpdated
      });
      stats.totalItems += data.seenItems?.length || 0;
    } catch (error) {
      // Skip corrupted files
    }
  }

  return stats;
}

module.exports = {
  loadSeenItems,
  saveSeenItems,
  detectNewItems,
  clearFeedState,
  getStorageStats,
  DEFAULT_STORAGE_PATH
};
