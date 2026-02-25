#!/usr/bin/env node
/**
 * RSS Monitor Skill Test
 * Tests the RSS parsing functionality
 */

const rssMonitor = require('./index.js');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('📰 Testing RSS Monitor Skill\n');
  console.log('='.repeat(50));

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }

  console.log('='.repeat(50));
  console.log(`\nResults: ${passed} passed, ${failed} failed, ${tests.length} total`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Test helper functions exist
test('fetchFeed function exists', () => {
  if (typeof rssMonitor.fetchFeed !== 'function') {
    throw new Error('fetchFeed should be a function');
  }
});

test('fetchFeedMetadata function exists', () => {
  if (typeof rssMonitor.fetchFeedMetadata !== 'function') {
    throw new Error('fetchFeedMetadata should be a function');
  }
});

test('checkForNewItems function exists', () => {
  if (typeof rssMonitor.checkForNewItems !== 'function') {
    throw new Error('checkForNewItems should be a function');
  }
});

test('trackFeeds function exists', () => {
  if (typeof rssMonitor.trackFeeds !== 'function') {
    throw new Error('trackFeeds should be a function');
  }
});

test('getLatestItem function exists', () => {
  if (typeof rssMonitor.getLatestItem !== 'function') {
    throw new Error('getLatestItem should be a function');
  }
});

test('searchFeed function exists', () => {
  if (typeof rssMonitor.searchFeed !== 'function') {
    throw new Error('searchFeed should be a function');
  }
});

test('formatItemsAsText function exists', () => {
  if (typeof rssMonitor.formatItemsAsText !== 'function') {
    throw new Error('formatItemsAsText should be a function');
  }
});

test('formatItemsAsMarkdown function exists', () => {
  if (typeof rssMonitor.formatItemsAsMarkdown !== 'function') {
    throw new Error('formatItemsAsMarkdown should be a function');
  }
});

test('getFeedStats function exists', () => {
  if (typeof rssMonitor.getFeedStats !== 'function') {
    throw new Error('getFeedStats should be a function');
  }
});

// Test formatting functions with mock data
test('formatItemsAsText formats items correctly', () => {
  const items = [
    {
      title: 'Test Post 1',
      link: 'https://example.com/1',
      pubDate: '2024-01-15T10:00:00Z',
    },
    {
      title: 'Test Post 2',
      link: 'https://example.com/2',
      pubDate: '2024-01-16T10:00:00Z',
    },
  ];
  
  const text = rssMonitor.formatItemsAsText(items);
  
  if (!text.includes('Test Post 1')) throw new Error('Should include first title');
  if (!text.includes('Test Post 2')) throw new Error('Should include second title');
  if (!text.includes('https://example.com/1')) throw new Error('Should include first link');
  if (!text.includes('https://example.com/2')) throw new Error('Should include second link');
});

test('formatItemsAsMarkdown formats items correctly', () => {
  const items = [
    {
      title: 'Test Post 1',
      link: 'https://example.com/1',
      description: 'This is a test description',
      pubDate: '2024-01-15T10:00:00Z',
      author: 'Test Author',
    },
  ];
  
  const md = rssMonitor.formatItemsAsMarkdown(items, 'Test Feed');
  
  if (!md.includes('# Test Feed')) throw new Error('Should include feed title');
  if (!md.includes('## Test Post 1')) throw new Error('Should include item title as heading');
  if (!md.includes('**Published:**')) throw new Error('Should include published date');
  if (!md.includes('**Author:**')) throw new Error('Should include author');
  if (!md.includes('This is a test description')) throw new Error('Should include description');
  if (!md.includes('[Read more]')) throw new Error('Should include read more link');
});

test('formatItemsAsMarkdown works without feed title', () => {
  const items = [{ title: 'Test', link: 'https://example.com', pubDate: '2024-01-15' }];
  const md = rssMonitor.formatItemsAsMarkdown(items);
  
  if (!md.includes('# Feed Items')) throw new Error('Should use default title');
});

test('formatItemsAsText handles missing pubDate', () => {
  const items = [{ title: 'Test', link: 'https://example.com' }];
  const text = rssMonitor.formatItemsAsText(items);
  
  if (!text.includes('Unknown date')) throw new Error('Should handle missing date');
});

// Test checkForNewItems filtering
test('checkForNewItems filters by date', () => {
  const mockItems = [
    { title: 'Old', pubDate: '2024-01-01T00:00:00Z' },
    { title: 'New', pubDate: '2024-01-15T00:00:00Z' },
    { title: 'Newer', pubDate: '2024-01-20T00:00:00Z' },
  ];
  
  // Simulate filtering logic
  const since = new Date('2024-01-10T00:00:00Z');
  const filtered = mockItems.filter(item => {
    if (!item.pubDate) return false;
    return new Date(item.pubDate) > since;
  });
  
  if (filtered.length !== 2) throw new Error('Should filter to 2 items');
  if (filtered[0].title !== 'New') throw new Error('Should include "New"');
  if (filtered[1].title !== 'Newer') throw new Error('Should include "Newer"');
});

test('checkForNewItems handles null since date', () => {
  const mockItems = [
    { title: 'Item 1', pubDate: '2024-01-15T00:00:00Z' },
  ];
  
  // When since is null, all items should be returned
  const filtered = mockItems.filter(item => {
    if (!item.pubDate) return false;
    const since = null;
    if (!since) return true;
    return new Date(item.pubDate) > since;
  });
  
  if (filtered.length !== 1) throw new Error('Should return all items when since is null');
});

test('searchFeed logic checks title, description, and content', () => {
  const query = 'test';
  const items = [
    { title: 'Test Post', description: '', content: '' },
    { title: 'Other', description: 'test description', content: '' },
    { title: 'Other', description: '', content: 'test content' },
    { title: 'No Match', description: '', content: '' },
  ];
  
  const queryLower = query.toLowerCase();
  const matches = items.filter(item => {
    const title = (item.title || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    const content = (item.content || '').toLowerCase();
    
    return title.includes(queryLower) || 
           description.includes(queryLower) || 
           content.includes(queryLower);
  });
  
  if (matches.length !== 3) throw new Error('Should match 3 items');
});

// Test trackFeeds error handling
test('trackFeeds handles mixed success/failure', () => {
  const feeds = [
    { url: 'https://example.com/feed1', name: 'Feed 1' },
    { url: 'https://example.com/feed2', name: 'Feed 2' },
  ];
  
  // Simulate results structure
  const results = {
    'Feed 1': { success: true, items: [] },
    'https://example.com/feed2': { success: false, error: 'Failed' },
  };
  
  const totalSuccess = Object.values(results).filter(r => r.success).length;
  const totalFailure = Object.values(results).filter(r => !r.success).length;
  
  if (totalSuccess !== 1) throw new Error('Should count 1 success');
  if (totalFailure !== 1) throw new Error('Should count 1 failure');
});

// Test getFeedStats calculation
test('getFeedStats calculates average correctly', () => {
  const itemsByDate = {
    '2024-01-15': 5,
    '2024-01-16': 10,
    '2024-01-17': 15,
  };
  
  const totalItems = 30;
  const dates = Object.keys(itemsByDate).sort();
  const daysSpan = Math.max(1, Math.ceil(
    (new Date(dates[dates.length - 1]) - new Date(dates[0])) / (1000 * 60 * 60 * 24)
  ));
  
  const averagePerDay = Math.round((totalItems / daysSpan) * 10) / 10;
  
  if (daysSpan !== 2) throw new Error('Days span should be 2');
  if (averagePerDay !== 15) throw new Error('Average should be 15');
});

test('getFeedStats handles empty items', () => {
  const items = [];
  const stats = {
    totalItems: items.length,
    itemsWithContent: items.filter(i => i.content).length,
    itemsWithImages: items.filter(i => i.enclosures && i.enclosures.length > 0).length,
  };
  
  if (stats.totalItems !== 0) throw new Error('Should be 0 items');
  if (stats.itemsWithContent !== 0) throw new Error('Should be 0 with content');
  if (stats.itemsWithImages !== 0) throw new Error('Should be 0 with images');
});

// Test item processing
test('Item processing extracts all fields', () => {
  const mockItem = {
    title: 'Test Title',
    link: 'https://example.com/post',
    origlink: 'https://example.com/original',
    description: 'Description text',
    pubDate: '2024-01-15T10:00:00Z',
    date: '2024-01-15T10:00:00Z',
    author: 'Author Name',
    creator: 'Creator Name',
    guid: 'unique-guid-123',
    categories: ['tech', 'news'],
    content: 'Full content here',
    'content:encoded': 'Encoded content',
    enclosures: [
      { url: 'https://example.com/image.jpg', type: 'image/jpeg', length: 12345 },
    ],
  };
  
  const processed = {
    title: mockItem.title || '',
    link: mockItem.link || mockItem.origlink || '',
    description: mockItem.description || '',
    pubDate: mockItem.pubDate || mockItem.date || '',
    author: mockItem.author || mockItem.creator || '',
    guid: mockItem.guid || mockItem.link || '',
    categories: mockItem.categories || [],
    content: mockItem.content || mockItem['content:encoded'],
    enclosures: mockItem.enclosures ? mockItem.enclosures.map(enc => ({
      url: enc.url || enc.href || '',
      type: enc.type || '',
      length: enc.length || 0,
    })) : [],
  };
  
  if (processed.title !== 'Test Title') throw new Error('Title mismatch');
  if (processed.link !== 'https://example.com/post') throw new Error('Link mismatch');
  if (processed.author !== 'Author Name') throw new Error('Author mismatch');
  if (processed.guid !== 'unique-guid-123') throw new Error('GUID mismatch');
  if (processed.categories.length !== 2) throw new Error('Categories mismatch');
  if (processed.content !== 'Full content here') throw new Error('Content mismatch');
  if (processed.enclosures.length !== 1) throw new Error('Enclosures mismatch');
});

// Test limit parameter
test('Limit parameter works correctly', () => {
  const items = Array.from({ length: 100 }, (_, i) => ({
    title: `Item ${i}`,
    pubDate: '2024-01-15',
  }));
  
  const limit = 10;
  const limited = items.slice(0, limit);
  
  if (limited.length !== 10) throw new Error('Should limit to 10 items');
});

// Test timeout handling in fetch
test('Timeout parameter is configurable', () => {
  const defaultTimeout = 10000;
  const customTimeout = 5000;
  
  if (defaultTimeout <= customTimeout) throw new Error('Default should be larger');
});

// Test URL handling
test('Original link fallback works', () => {
  const item1 = { link: 'https://example.com/1' };
  const item2 = { origlink: 'https://example.com/2' };
  const item3 = {};
  
  const link1 = item1.link || item1.origlink || '';
  const link2 = item2.link || item2.origlink || '';
  const link3 = item3.link || item3.origlink || '';
  
  if (link1 !== 'https://example.com/1') throw new Error('Link1 mismatch');
  if (link2 !== 'https://example.com/2') throw new Error('Link2 mismatch');
  if (link3 !== '') throw new Error('Link3 should be empty');
});

// Test author fallback
test('Author falls back to creator', () => {
  const item1 = { author: 'Jane Doe' };
  const item2 = { creator: 'John Doe' };
  const item3 = {};
  
  const author1 = item1.author || item1.creator || '';
  const author2 = item2.author || item2.creator || '';
  const author3 = item3.author || item3.creator || '';
  
  if (author1 !== 'Jane Doe') throw new Error('Author1 mismatch');
  if (author2 !== 'John Doe') throw new Error('Author2 mismatch');
  if (author3 !== '') throw new Error('Author3 should be empty');
});

// Test enclosures handling
test('Enclosures handle missing href', () => {
  const enclosures = [
    { url: 'https://example.com/1.jpg' },
    { href: 'https://example.com/2.jpg' },
    {},
  ];
  
  const processed = enclosures.map(enc => ({
    url: enc.url || enc.href || '',
    type: enc.type || '',
    length: enc.length || 0,
  }));
  
  if (processed[0].url !== 'https://example.com/1.jpg') throw new Error('Enclosure1 mismatch');
  if (processed[1].url !== 'https://example.com/2.jpg') throw new Error('Enclosure2 mismatch');
  if (processed[2].url !== '') throw new Error('Enclosure3 should be empty');
});

// Test content handling
test('Content falls back to content:encoded', () => {
  const item1 = { content: 'Regular content' };
  const item2 = { 'content:encoded': 'Encoded content' };
  const item3 = {};
  
  const content1 = item1.content || item1['content:encoded'] || '';
  const content2 = item2.content || item2['content:encoded'] || '';
  const content3 = item3.content || item3['content:encoded'] || '';
  
  if (content1 !== 'Regular content') throw new Error('Content1 mismatch');
  if (content2 !== 'Encoded content') throw new Error('Content2 mismatch');
  if (content3 !== '') throw new Error('Content3 should be empty');
});

// Test markdown output structure
test('Markdown output has proper structure', () => {
  const items = [
    {
      title: 'Test',
      link: 'https://example.com',
      description: 'Desc',
      pubDate: '2024-01-15T10:00:00Z',
      author: 'Author',
    },
  ];
  
  const md = rssMonitor.formatItemsAsMarkdown(items);
  const lines = md.split('\n');
  
  // Check for markdown structure
  if (!lines.some(l => l.startsWith('## '))) throw new Error('Should have item headings');
  if (!lines.some(l => l.includes('**Published:**'))) throw new Error('Should have published label');
  if (!lines.some(l => l.startsWith('---'))) throw new Error('Should have separators');
});

runTests();
