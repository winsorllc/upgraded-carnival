/**
 * Feed Parser Module
 * Fetches and parses RSS/Atom feeds
 */

const fetch = require('node-fetch');
const { parseStringPromise } = require('xml2js');

/**
 * Fetch and parse an RSS or Atom feed
 * @param {string} url - Feed URL
 * @param {string} type - 'rss' or 'atom' (auto-detected if not specified)
 * @returns {Promise<{title: string, items: Array}>}
 */
async function fetchFeed(url, type = 'auto') {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PopeBot Feed Watcher/1.0 (https://github.com/stephengpope/thepopebot)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();
    const result = await parseStringPromise(xml);

    // Auto-detect feed type
    if (type === 'auto') {
      if (result.feed) type = 'atom';
      else if (result.rss) type = 'rss';
      else if (result['rdf:RDF']) type = 'rss';
      else throw new Error('Unknown feed format');
    }

    // Parse based on type
    let feedTitle, items;
    
    if (type === 'atom') {
      const feed = result.feed;
      feedTitle = feed.title ? feed.title[0] : 'Untitled Feed';
      items = (feed.entry || []).map(entry => ({
        id: entry.id ? entry.id[0] : entry.link?.[0]?.$?.href || entry.link?.[0],
        title: entry.title?.[0] || 'No title',
        published: entry.published?.[0] || entry.updated?.[0],
        updated: entry.updated?.[0],
        link: entry.link?.[0]?.$?.href || entry.link?.[0],
        summary: entry.summary?.[0] || entry.content?.[0] || '',
        author: entry.author?.[0]?.name?.[0] || 'Unknown'
      }));
    } else if (type === 'rss') {
      const channel = result.rss?.channel?.[0] || result['rdf:RDF']?.channel?.[0] || {};
      feedTitle = channel.title?.[0] || 'Untitled Feed';
      const rssItems = channel.item || [];
      items = (rssItems || []).map(item => ({
        id: item.guid?.[0]?._ || item.guid?.[0] || item.link?.[0],
        title: item.title?.[0] || 'No title',
        published: item.pubDate?.[0],
        link: item.link?.[0],
        description: item.description?.[0] || '',
        author: item['dc:creator']?.[0] || item.author?.[0] || 'Unknown',
        categories: (item.category || []).map(c => typeof c === 'string' ? c : c._)
      }));
    } else {
      throw new Error(`Unsupported feed type: ${type}`);
    }

    return {
      title: feedTitle,
      url,
      type,
      items: items.filter(item => item.id && item.title)
    };
  } catch (error) {
    console.error(`Error fetching feed ${url}:`, error.message);
    throw error;
  }
}

module.exports = { fetchFeed };
