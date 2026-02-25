/**
 * Notion API Integration Skill
 * Provides helpers for interacting with Notion pages, databases, and blocks
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_VERSION = '2022-06-28';
const BASE_URL = 'https://api.notion.com/v1';

/**
 * Make a request to the Notion API
 * @param {string} endpoint - API endpoint (e.g., '/pages', '/search')
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Parsed JSON response
 */
async function notionApi(endpoint, options = {}) {
  if (!process.env.NOTION_API_KEY) {
    throw new Error('NOTION_API_KEY environment variable is not set');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Notion API error (${res.status}): ${error}`);
  }

  // Notion returns 204 No Content for some successful operations
  if (res.status === 204) {
    return { success: true };
  }

  return res.json();
}

/**
 * Search for pages and databases
 * @param {string} query - Search query string
 * @param {object} filter - Optional filter { property: 'object', value: 'page' | 'database' }
 * @param {string} sort - Optional sort { direction: 'ascending' | 'descending', timestamp: 'last_edited_time' }
 * @returns {Promise<object>} Search results with results array
 */
async function search(query = '', { filter, sort } = {}) {
  const body = { query };
  if (filter) body.filter = filter;
  if (sort) body.sort = sort;
  
  return notionApi('/search', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Get a page by ID
 * @param {string} pageId - Page ID
 * @returns {Promise<object>} Page object
 */
async function getPage(pageId) {
  return notionApi(`/pages/${pageId}`);
}

/**
 * Get page content (blocks)
 * @param {string} pageId - Page ID
 * @param {string} startCursor - Optional pagination cursor
 * @param {number} pageSize - Number of blocks to retrieve (default: 100)
 * @returns {Promise<object>} Blocks response with results array
 */
async function getPageBlocks(pageId, { startCursor, pageSize = 100 } = {}) {
  const params = new URLSearchParams();
  if (startCursor) params.set('start_cursor', startCursor);
  if (pageSize) params.set('page_size', String(pageSize));
  
  const queryString = params.toString();
  return notionApi(`/blocks/${pageId}/children${queryString ? '?' + queryString : ''}`);
}

/**
 * Create a new page
 * @param {object} parent - Parent object { database_id: '...' } or { page_id: '...' }
 * @param {object} properties - Page properties
 * @param {array} children - Optional array of blocks to add as children
 * @returns {Promise<object>} Created page object
 */
async function createPage({ parent, properties, children = [] }) {
  const body = { parent, properties };
  if (children.length > 0) {
    body.children = children;
  }
  
  return notionApi('/pages', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Create a page in a database
 * @param {string} databaseId - Database ID
 * @param {object} properties - Properties matching database schema
 * @returns {Promise<object>} Created page object
 */
async function createDatabaseItem(databaseId, properties) {
  return createPage({
    parent: { database_id: databaseId },
    properties,
  });
}

/**
 * Query a database
 * @param {string} databaseId - Database ID
 * @param {object} filter - Optional filter object
 * @param {array} sorts - Optional sorts array
 * @param {string} startCursor - Optional pagination cursor
 * @param {number} pageSize - Page size (default: 100)
 * @returns {Promise<object>} Query results with results array
 */
async function queryDatabase(databaseId, { filter, sorts, startCursor, pageSize = 100 } = {}) {
  const body = { page_size: pageSize };
  if (filter) body.filter = filter;
  if (sorts) body.sorts = sorts;
  if (startCursor) body.start_cursor = startCursor;
  
  return notionApi(`/databases/${databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Create a database
 * @param {object} parent - Parent { page_id: '...' }
 * @param {array} title - Title array [{ text: { content: 'Name' } }]
 * @param {object} properties - Properties schema
 * @returns {Promise<object>} Created database object
 */
async function createDatabase({ parent, title, properties }) {
  return notionApi('/databases', {
    method: 'POST',
    body: JSON.stringify({ parent, title, properties }),
  });
}

/**
 * Update page properties
 * @param {string} pageId - Page ID
 * @param {object} properties - Properties to update
 * @returns {Promise<object>} Updated page object
 */
async function updatePage(pageId, properties) {
  return notionApi(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  });
}

/**
 * Add blocks to a page
 * @param {string} pageId - Page ID
 * @param {array} children - Array of block objects
 * @param {string} after - Optional block ID to insert after
 * @returns {Promise<object>} Response with results array
 */
async function appendBlocks(pageId, children, { after } = {}) {
  const body = { children };
  if (after) body.after = after;
  
  return notionApi(`/blocks/${pageId}/children`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * Delete a block
 * @param {string} blockId - Block ID
 * @returns {Promise<object>} Deleted block object
 */
async function deleteBlock(blockId) {
  return notionApi(`/blocks/${blockId}`, {
    method: 'DELETE',
  });
}

/**
 * Update block content
 * @param {string} blockId - Block ID
 * @param {object} content - Updated block content
 * @returns {Promise<object>} Updated block object
 */
async function updateBlock(blockId, content) {
  return notionApi(`/blocks/${blockId}`, {
    method: 'PATCH',
    body: JSON.stringify(content),
  });
}

/**
 * Get a database by ID
 * @param {string} databaseId - Database ID
 * @returns {Promise<object>} Database object
 */
async function getDatabase(databaseId) {
  return notionApi(`/databases/${databaseId}`);
}

/**
 * Create a text block
 * @param {string} content - Text content
 * @returns {object} Block object
 */
function createParagraphBlock(content) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{ text: { content } }],
    },
  };
}

/**
 * Create a heading block
 * @param {string} content - Heading text
 * @param {number} level - Heading level (1, 2, or 3)
 * @returns {object} Block object
 */
function createHeadingBlock(content, level = 1) {
  return {
    object: 'block',
    type: `heading_${level}`,
    [`heading_${level}`]: {
      rich_text: [{ text: { content } }],
    },
  };
}

/**
 * Create a bulleted list item
 * @param {string} content - List item text
 * @returns {object} Block object
 */
function createBulletedListItem(content) {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [{ text: { content } }],
    },
  };
}

/**
 * Create a numbered list item
 * @param {string} content - List item text
 * @returns {object} Block object
 */
function createNumberedListItem(content) {
  return {
    object: 'block',
    type: 'numbered_list_item',
    numbered_list_item: {
      rich_text: [{ text: { content } }],
    },
  };
}

/**
 * Create a to-do block
 * @param {string} content - Todo text
 * @param {boolean} checked - Whether the todo is checked
 * @returns {object} Block object
 */
function createTodoBlock(content, checked = false) {
  return {
    object: 'block',
    type: 'to_do',
    to_do: {
      rich_text: [{ text: { content } }],
      checked,
    },
  };
}

/**
 * Create a code block
 * @param {string} code - Code content
 * @param {string} language - Programming language
 * @returns {object} Block object
 */
function createCodeBlock(code, language = 'plain text') {
  return {
    object: 'block',
    type: 'code',
    code: {
      rich_text: [{ text: { content: code } }],
      language,
    },
  };
}

/**
 * Create a callout block
 * @param {string} content - Callout text
 * @param {string} icon - Emoji icon
 * @returns {object} Block object
 */
function createCalloutBlock(content, icon = '💡') {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ text: { content } }],
      icon: { type: 'emoji', emoji: icon },
    },
  };
}

/**
 * Create a toggle block
 * @param {string} content - Toggle heading text
 * @param {array} children - Optional child blocks
 * @returns {object} Block object
 */
function createToggleBlock(content, children = []) {
  return {
    object: 'block',
    type: 'toggle',
    toggle: {
      rich_text: [{ text: { content } }],
      children: children.length > 0 ? children : undefined,
    },
  };
}

/**
 * Create a quote block
 * @param {string} content - Quote text
 * @returns {object} Block object
 */
function createQuoteBlock(content) {
  return {
    object: 'block',
    type: 'quote',
    quote: {
      rich_text: [{ text: { content } }],
    },
  };
}

/**
 * Create a divider block
 * @returns {object} Block object
 */
function createDividerBlock() {
  return {
    object: 'block',
    type: 'divider',
    divider: {},
  };
}

/**
 * Create a link preview block
 * @param {string} url - URL to preview
 * @returns {object} Block object
 */
function createLinkPreviewBlock(url) {
  return {
    object: 'block',
    type: 'link_preview',
    link_preview: { url },
  };
}

/**
 * Create a bookmark block
 * @param {string} url - URL to bookmark
 * @param {string} caption - Optional caption
 * @returns {object} Block object
 */
function createBookmarkBlock(url, caption = '') {
  return {
    object: 'block',
    type: 'bookmark',
    bookmark: {
      url,
      caption: caption ? [{ text: { content: caption } }] : [],
    },
  };
}

/**
 * Property helpers
 */

/**
 * Create a title property
 * @param {string} content - Title text
 * @returns {object} Title property object
 */
function createTitleProperty(content) {
  return { title: [{ text: { content } }] };
}

/**
 * Create a rich text property
 * @param {string} content - Rich text content
 * @returns {object} Rich text property object
 */
function createRichTextProperty(content) {
  return { rich_text: [{ text: { content } }] };
}

/**
 * Create a select property
 * @param {string} name - Select option name
 * @returns {object} Select property object
 */
function createSelectProperty(name) {
  return { select: { name } };
}

/**
 * Create a multi-select property
 * @param {array} names - Array of option names
 * @returns {object} Multi-select property object
 */
function createMultiSelectProperty(names) {
  return { multi_select: names.map(name => ({ name })) };
}

/**
 * Create a date property
 * @param {string} start - Start date (ISO string)
 * @param {string} end - Optional end date
 * @returns {object} Date property object
 */
function createDateProperty(start, end = null) {
  return { date: { start, end } };
}

/**
 * Create a checkbox property
 * @param {boolean} checked - Checkbox state
 * @returns {object} Checkbox property object
 */
function createCheckboxProperty(checked) {
  return { checkbox: checked };
}

/**
 * Create a number property
 * @param {number} value - Number value
 * @returns {object} Number property object
 */
function createNumberProperty(value) {
  return { number: value };
}

/**
 * Create a URL property
 * @param {string} url - URL string
 * @returns {object} URL property object
 */
function createUrlProperty(url) {
  return { url };
}

/**
 * Create an email property
 * @param {string} email - Email address
 * @returns {object} Email property object
 */
function createEmailProperty(email) {
  return { email };
}

/**
 * Create a relation property
 * @param {array} pageIds - Array of related page IDs
 * @returns {object} Relation property object
 */
function createRelationProperty(pageIds) {
  return { relation: pageIds.map(id => ({ id })) };
}

/**
 * Create a files property
 * @param {array} files - Array of file objects { name, external: { url } }
 * @returns {object} Files property object
 */
function createFilesProperty(files) {
  return {
    files: files.map(file => ({
      name: file.name,
      external: { url: file.external.url },
    })),
  };
}

module.exports = {
  notionApi,
  search,
  getPage,
  getPageBlocks,
  createPage,
  createDatabaseItem,
  queryDatabase,
  createDatabase,
  updatePage,
  appendBlocks,
  deleteBlock,
  updateBlock,
  getDatabase,
  // Block creators
  createParagraphBlock,
  createHeadingBlock,
  createBulletedListItem,
  createNumberedListItem,
  createTodoBlock,
  createCodeBlock,
  createCalloutBlock,
  createToggleBlock,
  createQuoteBlock,
  createDividerBlock,
  createLinkPreviewBlock,
  createBookmarkBlock,
  // Property creators
  createTitleProperty,
  createRichTextProperty,
  createSelectProperty,
  createMultiSelectProperty,
  createDateProperty,
  createCheckboxProperty,
  createNumberProperty,
  createUrlProperty,
  createEmailProperty,
  createRelationProperty,
  createFilesProperty,
};
