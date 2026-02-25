#!/usr/bin/env node
/**
 * Notion Skill Test
 * Tests the Notion API integration without requiring actual API credentials
 */

const path = require('path');

// Mock the NOTION_API_KEY for testing
process.env.NOTION_API_KEY = 'test_secret_key';

// Import the notion module
const notion = require('./index.js');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('🧪 Testing Notion Skill\n');
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

// Test 1: Block creators return correct structure
test('createParagraphBlock returns correct structure', () => {
  const block = notion.createParagraphBlock('Hello World');
  
  if (block.object !== 'block') throw new Error('object should be "block"');
  if (block.type !== 'paragraph') throw new Error('type should be "paragraph"');
  if (!block.paragraph) throw new Error('paragraph property missing');
  if (!block.paragraph.rich_text) throw new Error('rich_text missing');
  if (block.paragraph.rich_text[0].text.content !== 'Hello World') {
    throw new Error('content mismatch');
  }
});

// Test 2: Create heading block
test('createHeadingBlock returns correct structure', () => {
  const block = notion.createHeadingBlock('My Heading', 2);
  
  if (block.type !== 'heading_2') throw new Error('type should be "heading_2"');
  if (!block.heading_2) throw new Error('heading_2 property missing');
});

// Test 3: Create todo block
test('createTodoBlock returns correct structure', () => {
  const block = notion.createTodoBlock('Buy milk', true);
  
  if (block.type !== 'to_do') throw new Error('type should be "to_do"');
  if (block.to_do.checked !== true) throw new Error('checked should be true');
});

// Test 4: Create code block
test('createCodeBlock returns correct structure', () => {
  const block = notion.createCodeBlock('console.log("hi")', 'javascript');
  
  if (block.type !== 'code') throw new Error('type should be "code"');
  if (block.code.language !== 'javascript') throw new Error('language mismatch');
});

// Test 5: Create callout block
test('createCalloutBlock returns correct structure', () => {
  const block = notion.createCalloutBlock('Important!', '⚠️');
  
  if (block.type !== 'callout') throw new Error('type should be "callout"');
  if (block.callout.icon.emoji !== '⚠️') throw new Error('emoji mismatch');
});

// Test 6: Create divider block
test('createDividerBlock returns correct structure', () => {
  const block = notion.createDividerBlock();
  
  if (block.type !== 'divider') throw new Error('type should be "divider"');
});

// Test 7: Property creators
test('createTitleProperty returns correct structure', () => {
  const prop = notion.createTitleProperty('My Title');
  
  if (!prop.title) throw new Error('title property missing');
  if (prop.title[0].text.content !== 'My Title') throw new Error('content mismatch');
});

// Test 8: Create select property
test('createSelectProperty returns correct structure', () => {
  const prop = notion.createSelectProperty('Done');
  
  if (!prop.select) throw new Error('select property missing');
  if (prop.select.name !== 'Done') throw new Error('name mismatch');
});

// Test 9: Create multi-select property
test('createMultiSelectProperty returns correct structure', () => {
  const prop = notion.createMultiSelectProperty(['Option1', 'Option2']);
  
  if (!prop.multi_select) throw new Error('multi_select property missing');
  if (prop.multi_select.length !== 2) throw new Error('should have 2 options');
});

// Test 10: Create date property
test('createDateProperty returns correct structure', () => {
  const prop = notion.createDateProperty('2024-01-15', '2024-01-20');
  
  if (!prop.date) throw new Error('date property missing');
  if (prop.date.start !== '2024-01-15') throw new Error('start date mismatch');
  if (prop.date.end !== '2024-01-20') throw new Error('end date mismatch');
});

// Test 11: Create checkbox property
test('createCheckboxProperty returns correct structure', () => {
  const prop = notion.createCheckboxProperty(true);
  
  if (!prop.checkbox) throw new Error('checkbox property missing');
  if (prop.checkbox !== true) throw new Error('value should be true');
});

// Test 12: Create number property
test('createNumberProperty returns correct structure', () => {
  const prop = notion.createNumberProperty(42);
  
  if (prop.number !== 42) throw new Error('number mismatch');
});

// Test 13: Create relation property
test('createRelationProperty returns correct structure', () => {
  const prop = notion.createRelationProperty(['id1', 'id2']);
  
  if (!prop.relation) throw new Error('relation property missing');
  if (prop.relation.length !== 2) throw new Error('should have 2 relations');
  if (prop.relation[0].id !== 'id1') throw new Error('id mismatch');
});

// Test 14: Create link preview block
test('createLinkPreviewBlock returns correct structure', () => {
  const block = notion.createLinkPreviewBlock('https://example.com');
  
  if (block.type !== 'link_preview') throw new Error('type mismatch');
  if (block.link_preview.url !== 'https://example.com') throw new Error('url mismatch');
});

// Test 15: Create bookmark block
test('createBookmarkBlock returns correct structure', () => {
  const block = notion.createBookmarkBlock('https://example.com', 'Example Site');
  
  if (block.type !== 'bookmark') throw new Error('type mismatch');
  if (block.bookmark.url !== 'https://example.com') throw new Error('url mismatch');
});

// Test 16: Create bulleted list item
test('createBulletedListItem returns correct structure', () => {
  const block = notion.createBulletedListItem('Item 1');
  
  if (block.type !== 'bulleted_list_item') throw new Error('type mismatch');
});

// Test 17: Create numbered list item
test('createNumberedListItem returns correct structure', () => {
  const block = notion.createNumberedListItem('Step 1');
  
  if (block.type !== 'numbered_list_item') throw new Error('type mismatch');
});

// Test 18: Create toggle block
test('createToggleBlock returns correct structure', () => {
  const block = notion.createToggleBlock('Click me');
  
  if (block.type !== 'toggle') throw new Error('type mismatch');
  if (!block.toggle) throw new Error('toggle property missing');
});

// Test 19: Create bookmark block without caption
test('createBookmarkBlock without caption', () => {
  const block = notion.createBookmarkBlock('https://example.com');
  
  if (block.bookmark.caption && block.bookmark.caption.length > 0) {
    throw new Error('caption should be empty array');
  }
});

// Test 20: Notion API function exists
test('notionApi function exists', () => {
  if (typeof notion.notionApi !== 'function') {
    throw new Error('notionApi should be a function');
  }
});

// Test 21: Search function exists
test('search function exists', () => {
  if (typeof notion.search !== 'function') {
    throw new Error('search should be a function');
  }
});

// Test 22: getPage function exists
test('getPage function exists', () => {
  if (typeof notion.getPage !== 'function') {
    throw new Error('getPage should be a function');
  }
});

// Test 23: createPage function exists
test('createPage function exists', () => {
  if (typeof notion.createPage !== 'function') {
    throw new Error('createPage should be a function');
  }
});

// Test 24: queryDatabase function exists
test('queryDatabase function exists', () => {
  if (typeof notion.queryDatabase !== 'function') {
    throw new Error('queryDatabase should be a function');
  }
});

// Test 25: Error handling without API key
test('notionApi throws error without API key', async () => {
  const originalKey = process.env.NOTION_API_KEY;
  delete process.env.NOTION_API_KEY;
  
  try {
    await notion.notionApi('/search');
    throw new Error('Should have thrown an error');
  } catch (error) {
    if (!error.message.includes('NOTION_API_KEY')) {
      throw new Error('Error message should mention NOTION_API_KEY');
    }
  } finally {
    process.env.NOTION_API_KEY = originalKey;
  }
});

runTests();
