#!/usr/bin/env node

/**
 * Blogwatcher — RSS/Atom Feed Monitor
 * 
 * Monitors RSS and Atom feeds for new content.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const FeedParser = require('feedparser');

const CONFIG_FILE = path.join(process.cwd(), 'config', 'feeds.json');
const SEEN_FILE = path.join(process.cwd(), 'data', 'blogwatcher-seen.json');
const MAX_SEEN_ENTRIES = 1000;

// Ensure data directory exists
const dataDir = path.dirname(SEEN_FILE);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

/**
 * Load seen entries from disk
 */
function loadSeenEntries() {
  if (fs.existsSync(SEEN_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SEEN_FILE, 'utf-8'));
    } catch (error) {
      console.warn('Failed to load seen entries:', error.message);
    }
  }
  return {};
}

/**
 * Save seen entries to disk
 */
function saveSeenEntries(seen) {
  fs.writeFileSync(SEEN_FILE, JSON.stringify(seen, null, 2));
}

/**
 * Load feed configuration
 */
function loadFeedConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch (error) {
      console.warn('Failed to load feed config:', error.message);
    }
  }
  return { feeds: [] };
}

/**
 * Fetch feed URL
 */
function fetchFeed(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Blogwatcher/1.0)'
      }
    }, (res) => {
      if (res.statusCode === 404) {
        reject(new Error('Feed not found (404)'));
        return;
      }
      
      if (res.statusCode === 429) {
        reject(new Error('Rate limited (429)'));
        return;
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout (8s)'));
    });
  });
}

/**
 * Parse RSS/Atom feed
 */
function parseFeed(xml) {
  return new Promise((resolve, reject) => {
    const items = [];
    let meta = {};
    
    const parser = new FeedParser();
    
    parser.on('error', reject);
    
    parser.on('meta', (m) => {
      meta = m;
    });
    
    parser.on('article', (item) => {
      items.push({
        title: item.title,
        link: item.link || item.origlink,
        published: item.pubdate || item.date,
        author: item.author || item.creator,
        summary: item.summary || item.description,
        content: item.content || item.contentEncoded,
        categories: item.categories || []
      });
    });
    
    parser.on('end', () => {
      resolve({ meta, items });
    });
    
    parser.write(xml);
    parser.end();
  });
}

/**
 * Check if entry matches filters
 */
function matchesFilters(entry, filters) {
  if (!filters) return true;
  
  // Keyword filter
  if (filters.keywords && filters.keywords.length > 0) {
    const text = `${entry.title} ${entry.summary} ${entry.content}`.toLowerCase();
    const keywords = filters.keywords.map(k => k.toLowerCase());
    
    if (filters.match_any) {
      if (!keywords.some(k => text.includes(k))) {
        return false;
      }
    } else {
      if (!keywords.every(k => text.includes(k))) {
        return false;
      }
    }
  }
  
  // Author filter
  if (filters.authors && filters.authors.length > 0) {
    if (!entry.author || !filters.authors.some(a => 
      entry.author.toLowerCase().includes(a.toLowerCase()))) {
      return false;
    }
  }
  
  // Category filter
  if (filters.categories && filters.categories.length > 0) {
    if (!entry.categories || !filters.categories.some(c =>
      entry.categories.some(cat => cat.toLowerCase().includes(c.toLowerCase())))) {
      return false;
    }
  }
  
  // Content length filter
  if (filters.min_length) {
    const content = entry.summary || entry.content || '';
    if (content.length < filters.min_length) {
      return false;
    }
  }
  
  if (filters.max_length) {
    const content = entry.summary || entry.content || '';
    if (content.length > filters.max_length) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get unique identifier for an entry (use link, fallback to title+date)
 */
function getEntryId(entry) {
  if (entry.link) return entry.link;
  return `${entry.title}|${entry.published}`;
}

/**
 * Watch a feed for new entries
 */
async function watchFeed(options) {
  const { url, name, filters = {} } = options;
  
  console.log(`\n📰 Checking: ${name || url}`);
  
  // Fetch and parse feed
  const xml = await fetchFeed(url);
  const { meta, items } = await parseFeed(xml);
  
  console.log(`   Feed: ${meta.title || 'Unknown'}`);
  console.log(`   Total items: ${items.length}`);
  
  // Load seen entries
  const seen = loadSeenEntries();
  const feedKey = name || url;
  const feedSeen = seen[feedKey] || [];
  
  // Find new entries
  const newEntries = [];
  const updatedSeen = [...feedSeen];
  
  for (const item of items) {
    const entryId = getEntryId(item);
    
    if (!feedSeen.includes(entryId)) {
      // Check filters
      if (matchesFilters(item, filters)) {
        newEntries.push({
          feed_name: name || url,
          feed_title: meta.title,
          ...item,
          detected_at: new Date().toISOString()
        });
      }
      
      updatedSeen.push(entryId);
    }
  }
  
  // Trim seen entries to max
  if (updatedSeen.length > MAX_SEEN_ENTRIES) {
    updatedSeen.splice(0, updatedSeen.length - MAX_SEEN_ENTRIES);
  }
  
  // Save updated seen entries
  seen[feedKey] = updatedSeen;
  saveSeenEntries(seen);
  
  console.log(`   New entries: ${newEntries.length}`);
  
  return newEntries;
}

/**
 * Check all configured feeds
 */
async function checkAllFeeds() {
  const config = loadFeedConfig();
  const results = {
    feeds: [],
    total_updates: 0,
    errors: []
  };
  
  for (const feed of config.feeds) {
    try {
      const updates = await watchFeed({
        url: feed.url,
        name: feed.name,
        filters: feed.filters
      });
      
      results.feeds.push({
        name: feed.name,
        url: feed.url,
        updates: updates.length
      });
      
      results.total_updates += updates.length;
      
      // Handle notifications
      if (updates.length > 0 && feed.notifications) {
        await handleNotifications(feed, updates);
      }
    } catch (error) {
      console.error(`   Error: ${error.message}`);
      results.errors.push({
        name: feed.name,
        url: feed.url,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Handle notifications for new updates
 */
async function handleNotifications(feed, updates) {
  // Telegram notification
  if (feed.notifications?.telegram && process.env.TELEGRAM_BOT_TOKEN) {
    await sendTelegramNotification({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      feed_name: feed.name,
      updates: updates.slice(0, 5)  // Limit to 5 per notification
    });
  }
  
  // Discord notification
  if (feed.notifications?.discord && feed.notifications.webhook_url) {
    await sendDiscordNotification({
      webhook_url: feed.notifications.webhook_url,
      feed_name: feed.name,
      updates: updates.slice(0, 5)
    });
  }
}

/**
 * Send Telegram notification
 */
async function sendTelegramNotification({ chat_id, feed_name, updates, message }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('[Telegram] No token configured');
    return;
  }
  
  const text = message || formatTelegramMessage(feed_name, updates);
  
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id,
        text,
        parse_mode: 'Markdown'
      })
    });
    
    const result = await response.json();
    if (result.ok) {
      console.log(`[Telegram] Sent notification to ${chat_id}`);
    } else {
      console.error(`[Telegram] Error: ${result.description}`);
    }
  } catch (error) {
    console.error(`[Telegram] Failed: ${error.message}`);
  }
}

/**
 * Format Telegram message
 */
function formatTelegramMessage(feed_name, updates) {
  let text = `📰 *${feed_name}* has ${updates.length} new post${updates.length > 1 ? 's' : ''}:\n\n`;
  
  for (const update of updates) {
    text += `• *${truncate(update.title, 50)}*\n`;
    text += `${truncate(update.link, 60)}\n\n`;
  }
  
  return text;
}

/**
 * Send Discord notification
 */
async function sendDiscordNotification({ webhook_url, feed_name, updates }) {
  if (!webhook_url) {
    console.log('[Discord] No webhook URL configured');
    return;
  }
  
  const embeds = updates.slice(0, 5).map(update => ({
    title: truncate(update.title, 256),
    url: update.link,
    description: truncate(update.summary || '', 1024),
    author: { name: update.author || feed_name },
    timestamp: update.published || new Date().toISOString(),
    color: 0x0099ff
  }));
  
  try {
    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds
      })
    });
    
    if (response.ok) {
      console.log(`[Discord] Sent notification`);
    } else {
      console.error(`[Discord] Error: ${response.status}`);
    }
  } catch (error) {
    console.error(`[Discord] Failed: ${error.message}`);
  }
}

/**
 * Truncate string to max length
 */
function truncate(str, max) {
  if (!str) return '';
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

/**
 * Get feed history (seen entries)
 */
function getFeedHistory(feedKey) {
  const seen = loadSeenEntries();
  return seen[feedKey] || [];
}

/**
 * Clear seen entries for a feed
 */
function clearFeedHistory(feedKey) {
  const seen = loadSeenEntries();
  if (seen[feedKey]) {
    delete seen[feedKey];
    saveSeenEntries(seen);
    console.log(`Cleared history for: ${feedKey}`);
  }
}

/**
 * Demo/mock feed data for testing
 */
function getDemoFeedData() {
  return {
    meta: { title: 'Demo Feed' },
    items: [
      {
        title: 'Test Post 1: New Feature Released',
        link: 'https://example.com/post-1',
        pubdate: new Date().toISOString(),
        author: 'Test Author',
        summary: 'This is a test summary for the first post',
        content: 'Full content of the first test post...',
        categories: ['News', 'Features']
      },
      {
        title: 'Test Post 2: Maintenance Window',
        link: 'https://example.com/post-2',
        pubdate: new Date(Date.now() - 86400000).toISOString(),
        author: 'Admin',
        summary: 'Scheduled maintenance this weekend',
        content: 'Details about the maintenance window...',
        categories: ['Maintenance']
      }
    ]
  };
}

/**
 * CLI interface
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const useDemo = args.includes('--demo');

  switch (command) {
    case 'check':
      const urlIndex = args.indexOf('--url');
      if (urlIndex !== -1 && args[urlIndex + 1]) {
        // Check specific URL
        if (useDemo) {
          // Demo mode - use mock data
          console.log(`\n📰 Checking (demo mode): ${args[urlIndex + 1]}`);
          const demoData = getDemoFeedData();
          
          const seen = loadSeenEntries();
          const feedKey = args[urlIndex + 1];
          const feedSeen = seen[feedKey] || [];
          
          const fakeFeed = {
            url: args[urlIndex + 1],
            name: args[urlIndex + 1],
            filters: {}
          };
          
          const newEntries = demoData.items
            .filter(item => !feedSeen.includes(item.link))
            .map(item => ({
              feed_name: fakeFeed.name,
              feed_title: demoData.meta.title,
              title: item.title,
              link: item.link,
              published: item.pubdate,
              author: item.author,
              summary: item.summary,
              content: item.content,
              categories: item.categories,
              detected_at: new Date().toISOString()
            }));
          
          console.log(`   Feed: ${demoData.meta.title}`);
          console.log(`   Total items: ${demoData.items.length}`);
          console.log(`   New entries: ${newEntries.length}`);
          
          if (newEntries.length > 0) {
            console.log('\n✓ New entries detected (demo):');
            newEntries.forEach(u => console.log(`  • ${u.title}\n    ${u.link}`));
          }
        } else {
          // Real mode
          watchFeed({ url: args[urlIndex + 1], name: args[urlIndex + 1] })
            .then(updates => {
              if (updates.length > 0) {
                console.log('\nNew entries:');
                updates.forEach(u => console.log(`  • ${u.title}\n    ${u.link}`));
              } else {
                console.log('No new entries');
              }
            })
            .catch(console.error);
        }
      } else {
        console.log('\n[Demo Mode] No feeds configured. Add feeds to config/feeds.json');
        console.log('Use --demo flag to see demo output\n');
      }
      break;

    case 'history':
      const feedIndex = args.indexOf('--feed');
      if (feedIndex !== -1 && args[feedIndex + 1]) {
        const history = getFeedHistory(args[feedIndex + 1]);
        console.log(`\nSeen entries for ${args[feedIndex + 1]}: ${history.length}`);
        if (history.length > 0) {
          console.log('Recent entries:');
          history.slice(-10).forEach(entry => console.log(`  • ${entry}`));
        }
      } else {
        console.error('Usage: blogwatcher history --feed <feed-name>');
      }
      break;

    case 'clear':
      const clearFeed = args[args.indexOf('--feed') + 1];
      if (clearFeed) {
        clearFeedHistory(clearFeed);
      } else {
        console.error('Usage: blogwatcher clear --feed <feed-name>');
      }
      break;

    case 'list':
      const config = loadFeedConfig();
      console.log('\nConfigured Feeds:\n');
      for (const feed of config.feeds) {
        console.log(`  ${feed.name || feed.url}`);
        console.log(`    URL: ${feed.url}`);
        console.log(`    Interval: ${feed.check_interval || 'manual'}`);
        console.log(`    Filters: ${feed.filters ? Object.keys(feed.filters).join(', ') : 'none'}`);
      }
      if (config.feeds.length === 0) {
        console.log('  (no feeds configured)');
      }
      console.log();
      break;

    default:
      console.log(`
Blogwatcher — RSS/Atom Feed Monitor

Usage:
  blogwatcher check [--url <url>]     Check feeds for updates
  blogwatcher history --feed <name>   Show seen entries for a feed
  blogwatcher clear --feed <name>     Clear seen entries
  blogwatcher list                    List configured feeds

Examples:
  blogwatcher check
  blogwatcher check --url https://example.com/feed.xml
  blogwatcher history --feed "tech-crunch"
  blogwatcher clear --feed "tech-crunch"
`);
  }
}

module.exports = {
  watchFeed,
  checkAllFeeds,
  getFeedHistory,
  clearFeedHistory,
  sendTelegramNotification,
  sendDiscordNotification
};
