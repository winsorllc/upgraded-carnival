/**
 * RSS Monitor Skill
 * Parses RSS and Atom feeds to track new content
 */

const FeedParser = require('feedparser');
const { Readable } = require('stream');

/**
 * Fetch and parse an RSS or Atom feed
 * @param {string} url - Feed URL
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Parsed feed data with items array
 */
async function fetchFeed(url, { limit = 100, includeContent = false, timeout = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      timeout,
      headers: {
        'User-Agent': 'RSS-Monitor/1.0 (+https://github.com/thepopebot)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.1',
      },
    };

    const feedparser = new FeedParser({
      addmeta: true,
      normalize: true,
    });

    const items = [];
    let meta = {};

    feedparser.on('error', reject);
    
    feedparser.on('meta', (m) => {
      meta = m;
    });

    feedparser.on('readable', () => {
      let item;
      while ((item = feedparser.read()) !== null) {
        if (items.length >= limit) break;
        
        const processedItem = {
          title: item.title || '',
          link: item.link || item.origlink || '',
          description: item.description || '',
          pubDate: item.pubDate || item.date || '',
          author: item.author || item.creator || '',
          guid: item.guid || item.link || '',
          categories: item.categories || [],
        };

        if (includeContent && (item.content || item['content:encoded'])) {
          processedItem.content = item.content || item['content:encoded'];
        }

        if (item.enclosures && item.enclosures.length > 0) {
          processedItem.enclosures = item.enclosures.map(enc => ({
            url: enc.url || enc.href || '',
            type: enc.type || '',
            length: enc.length || 0,
          }));
        }

        items.push(processedItem);
      }
    });

    feedparser.on('end', () => {
      resolve({
        meta: {
          title: meta.title || '',
          link: meta.link || url,
          description: meta.description || '',
          language: meta.language || '',
          updated: meta.date || '',
          author: meta.author || '',
        },
        items,
      });
    });

    // Create a request to fetch the feed
    const https = require('https');
    const http = require('http');
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const request = client.get(url, reqOptions, (res) => {
      if (res.statusCode === 200) {
        res.pipe(feedparser);
      } else {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
      }
    });

    request.on('error', reject);
    request.setTimeout(timeout, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Fetch feed metadata only (without items)
 * @param {string} url - Feed URL
 * @returns {Promise<object>} Feed metadata
 */
async function fetchFeedMetadata(url) {
  const result = await fetchFeed(url, { limit: 0 });
  return result.meta;
}

/**
 * Check a feed for items published after a specific date
 * @param {string} url - Feed URL
 * @param {Date} since - Check for items after this date
 * @param {object} options - Fetch options
 * @returns {Promise<array>} Array of new items
 */
async function checkForNewItems(url, since, { limit = 100, includeContent = false } = {}) {
  const result = await fetchFeed(url, { limit, includeContent });
  
  if (!since) {
    return result.items;
  }

  const sinceDate = typeof since === 'string' ? new Date(since) : since;
  
  return result.items.filter(item => {
    if (!item.pubDate) return false;
    const itemDate = new Date(item.pubDate);
    return itemDate > sinceDate;
  });
}

/**
 * Track multiple feeds and return combined results
 * @param {array} feeds - Array of feed configs { url, name }
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Results by feed
 */
async function trackFeeds(feeds, { limit = 10, includeContent = false } = {}) {
  const results = {};
  const errors = [];

  const feedPromises = feeds.map(async (feed) => {
    try {
      const url = typeof feed === 'string' ? feed : feed.url;
      const name = typeof feed === 'string' ? url : (feed.name || url);
      
      const result = await fetchFeed(url, { limit, includeContent });
      results[name] = {
        success: true,
        url,
        meta: result.meta,
        items: result.items,
      };
    } catch (error) {
      const url = typeof feed === 'string' ? feed : feed.url;
      errors.push({ url, error: error.message });
      results[url] = {
        success: false,
        error: error.message,
      };
    }
  });

  await Promise.all(feedPromises);

  return {
    results,
    errors,
    totalSuccess: Object.values(results).filter(r => r.success).length,
    totalFailure: errors.length,
  };
}

/**
 * Get the most recent item from a feed
 * @param {string} url - Feed URL
 * @returns {Promise<object|null>} Most recent item or null
 */
async function getLatestItem(url) {
  const result = await fetchFeed(url, { limit: 1 });
  return result.items.length > 0 ? result.items[0] : null;
}

/**
 * Search items in a feed by keyword
 * @param {string} url - Feed URL
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<array>} Matching items
 */
async function searchFeed(url, query, { limit = 100, maxItems = 500 } = {}) {
  const result = await fetchFeed(url, { limit: maxItems });
  const queryLower = query.toLowerCase();
  
  const matches = result.items.filter(item => {
    const title = (item.title || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    const content = (item.content || '').toLowerCase();
    
    return title.includes(queryLower) || 
           description.includes(queryLower) || 
           content.includes(queryLower);
  });

  return matches.slice(0, limit);
}

/**
 * Convert feed items to a simple text format
 * @param {array} items - Feed items
 * @returns {string} Formatted text
 */
function formatItemsAsText(items) {
  return items.map((item, index) => {
    const date = item.pubDate ? new Date(item.pubDate).toLocaleDateString() : 'Unknown date';
    return `${index + 1}. ${item.title}\n   ${date}\n   ${item.link}\n`;
  }).join('\n');
}

/**
 * Convert feed items to markdown format
 * @param {array} items - Feed items
 * @param {string} feedTitle - Optional feed title
 * @returns {string} Markdown formatted text
 */
function formatItemsAsMarkdown(items, feedTitle = '') {
  let output = feedTitle ? `# ${feedTitle}\n\n` : '# Feed Items\n\n';
  
  items.forEach(item => {
    const date = item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : 'Unknown';
    output += `## ${item.title}\n\n`;
    output += `**Published:** ${date}\n\n`;
    if (item.author) {
      output += `**Author:** ${item.author}\n\n`;
    }
    if (item.description) {
      output += `${item.description}\n\n`;
    }
    output += `[Read more](${item.link})\n\n---\n\n`;
  });
  
  return output;
}

/**
 * Get feed statistics
 * @param {string} url - Feed URL
 * @returns {Promise<object>} Feed statistics
 */
async function getFeedStats(url) {
  const result = await fetchFeed(url, { limit: 1000 });
  
  const now = new Date();
  const itemsByDate = {};
  let itemsWithContent = 0;
  let itemsWithImages = 0;
  let totalItems = result.items.length;

  result.items.forEach(item => {
    // Items per day
    if (item.pubDate) {
      const date = new Date(item.pubDate).toISOString().split('T')[0];
      itemsByDate[date] = (itemsByDate[date] || 0) + 1;
    }

    // Content stats
    if (item.content) itemsWithContent++;
    if (item.enclosures && item.enclosures.length > 0) itemsWithImages++;
  });

  // Calculate average items per day
  const dates = Object.keys(itemsByDate).sort();
  const daysSpan = dates.length > 1 
    ? Math.max(1, Math.ceil((new Date(dates[dates.length - 1]) - new Date(dates[0])) / (1000 * 60 * 60 * 24)))
    : 1;

  return {
    totalItems,
    itemsWithContent,
    itemsWithImages,
    averagePerDay: Math.round((totalItems / daysSpan) * 10) / 10,
    itemsByDay: itemsByDate,
    newestItem: result.items[0]?.pubDate || null,
    oldestItem: result.items[result.items.length - 1]?.pubDate || null,
  };
}

module.exports = {
  fetchFeed,
  fetchFeedMetadata,
  checkForNewItems,
  trackFeeds,
  getLatestItem,
  searchFeed,
  formatItemsAsText,
  formatItemsAsMarkdown,
  getFeedStats,
};
