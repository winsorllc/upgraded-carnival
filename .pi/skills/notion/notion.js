#!/usr/bin/env node

/**
 * Notion CLI - Interact with Notion API for pages, databases, and blocks
 * 
 * Usage:
 *   notion search <query>              - Search pages and databases
 *   notion get <page-id>               - Get page details
 *   notion blocks <page-id>            - Get page blocks (content)
 *   notion create-page --title "X"     - Create a new page
 *   notion create-page --title "X" --parent <db-id> - Create page in database
 *   notion query <db-id>                - Query database entries
 *   notion append-blocks <page-id>     - Append blocks to a page
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_VERSION = '2025-09-03';
const BASE_URL = 'https://api.notion.com/v1';

if (!NOTION_API_KEY) {
  console.error('Error: NOTION_API_KEY environment variable is required');
  console.error('Get your key at: https://www.notion.so/my-integrations');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${NOTION_API_KEY}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
};

async function request(method, endpoint, body = null) {
  const options = {
    method,
    headers,
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Notion API error: ${response.status} - ${JSON.stringify(error)}`);
  }
  
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
}

const command = process.argv[2];
const args = process.argv.slice(3);

async function run() {
  switch (command) {
    case 'search':
      await search(args[0] || '');
      break;
    
    case 'get':
      if (!args[0]) {
        console.error('Usage: notion get <page-id>');
        process.exit(1);
      }
      await getPage(args[0]);
      break;
    
    case 'blocks':
      if (!args[0]) {
        console.error('Usage: notion blocks <page-id>');
        process.exit(1);
      }
      await getBlocks(args[0]);
      break;
    
    case 'create-page':
      await createPage(args);
      break;
    
    case 'query':
      if (!args[0]) {
        console.error('Usage: notion query <database-id>');
        process.exit(1);
      }
      await queryDatabase(args[0]);
      break;
    
    case 'append-blocks':
      if (!args[0]) {
        console.error('Usage: notion append-blocks <page-id> [blocks-json]');
        process.exit(1);
      }
      await appendBlocks(args[0], args[1]);
      break;
    
    case 'help':
    case '--help':
    case '-h':
    default:
      showHelp();
  }
}

async function search(query) {
  const result = await request('POST', '/search', {
    query,
    sort: { direction: 'descending', timestamp: 'last_edited_time' },
  });
  
  if (!result.results || result.results.length === 0) {
    console.log('No results found');
    return;
  }
  
  console.log(`Found ${result.results.length} results:\n`);
  
  for (const item of result.results) {
    const title = getTitle(item);
    const type = item.object;
    const id = item.id;
    console.log(`[${type}] ${title}`);
    console.log(`  ID: ${id}`);
    console.log(`  URL: https://notion.so/${id.replace(/-/g, '')}`);
    console.log('');
  }
}

async function getPage(pageId) {
  const page = await request('GET', `/pages/${pageId}`);
  
  console.log('Page Details:');
  console.log('=============');
  console.log(`ID: ${page.id}`);
  console.log(`Title: ${getTitle(page)}`);
  console.log(`Created: ${page.created_time}`);
  console.log(`Last Edited: ${page.last_edited_time}`);
  console.log('');
  
  if (page.properties) {
    console.log('Properties:');
    console.log(JSON.stringify(page.properties, null, 2));
  }
}

async function getBlocks(pageId) {
  const result = await request('GET', `/blocks/${pageId}/children`);
  
  if (!result.results || result.results.length === 0) {
    console.log('No content blocks found');
    return;
  }
  
  console.log(`Page Content (${result.results.length} blocks):\n`);
  
  for (const block of result.results) {
    console.log(formatBlock(block));
    console.log('');
  }
}

async function createPage(argv) {
  let title = null;
  let parentId = null;
  let properties = {};
  
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--title' && argv[i + 1]) {
      title = argv[i + 1];
      i++;
    } else if (argv[i] === '--parent' && argv[i + 1]) {
      parentId = argv[i + 1];
      i++;
    } else if (argv[i] === '--property' && argv[i + 1]) {
      const [key, value] = argv[i + 1].split('=');
      properties[key] = { title: [{ text: { content: value } }] };
      i++;
    }
  }
  
  if (!title) {
    console.error('Usage: notion create-page --title "Page Title" [--parent <db-id>] [--property key=value]');
    process.exit(1);
  }
  
  const body = {
    properties: {
      Name: {
        title: [{ text: { content: title } }],
      },
      ...properties,
    },
  };
  
  if (parentId) {
    body.parent = { database_id: parentId };
  }
  
  const result = await request('POST', '/pages', body);
  
  console.log('Page created successfully!');
  console.log(`ID: ${result.id}`);
  console.log(`URL: https://notion.so/${result.id.replace(/-/g, '')}`);
}

async function queryDatabase(databaseId) {
  const result = await request('POST', `/databases/${databaseId}/query`, {});
  
  if (!result.results || result.results.length === 0) {
    console.log('No entries found in database');
    return;
  }
  
  console.log(`Database Entries (${result.results.length}):\n`);
  
  for (const item of result.results) {
    console.log(`- ${getTitle(item)}`);
    console.log(`  ID: ${item.id}`);
    if (item.properties) {
      for (const [key, prop] of Object.entries(item.properties)) {
        if (prop.type === 'select') {
          console.log(`  ${key}: ${prop.select?.name || 'none'}`);
        } else if (prop.type === 'status') {
          console.log(`  ${key}: ${prop.status?.name || 'none'}`);
        } else if (prop.type === 'date') {
          console.log(`  ${key}: ${prop.date?.start || 'none'}`);
        }
      }
    }
    console.log('');
  }
}

async function appendBlocks(pageId, blocksJson) {
  let blocks = [];
  
  if (blocksJson) {
    try {
      blocks = JSON.parse(blocksJson);
    } catch (e) {
      console.error('Invalid JSON for blocks');
      process.exit(1);
    }
  } else {
    blocks = [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: 'New paragraph from Notion CLI' } }],
        },
      },
    ];
  }
  
  const result = await request('PATCH', `/blocks/${pageId}/children`, {
    children: blocks,
  });
  
  console.log('Blocks added successfully!');
  console.log(`New children: ${result.results.length}`);
}

function getTitle(item) {
  if (item.properties) {
    for (const [key, prop] of Object.entries(item.properties)) {
      if (prop.type === 'title' && prop.title) {
        return prop.title.map(t => t.plain_text || '').join('');
      }
      if (prop.type === 'Name' && prop.title) {
        return prop.title.map(t => t.plain_text || '').join('');
      }
    }
  }
  return 'Untitled';
}

function formatBlock(block) {
  const type = block.type;
  const content = block[type];
  
  switch (type) {
    case 'paragraph':
      return content.rich_text?.map(t => t.plain_text || '').join('') || '';
    
    case 'heading_1':
      return `# ${content.rich_text?.map(t => t.plain_text || '').join('') || ''}`;
    
    case 'heading_2':
      return `## ${content.rich_text?.map(t => t.plain_text || '').join('') || ''}`;
    
    case 'heading_3':
      return `### ${content.rich_text?.map(t => t.plain_text || '').join('') || ''}`;
    
    case 'bulleted_list_item':
      return `• ${content.rich_text?.map(t => t.plain_text || '').join('') || ''}`;
    
    case 'numbered_list_item':
      return `1. ${content.rich_text?.map(t => t.plain_text || '').join('') || ''}`;
    
    case 'code':
      return `\`\`\`\n${content.rich_text?.map(t => t.plain_text || '').join('') || ''}\n\`\`\``;
    
    case 'quote':
      return `> ${content.rich_text?.map(t => t.plain_text || '').join('') || ''}`;
    
    case 'divider':
      return '---';
    
    case 'to_do':
      const checked = content.checked ? '[x]' : '[ ]';
      return `${checked} ${content.rich_text?.map(t => t.plain_text || '').join('') || ''}`;
    
    default:
      return `[${type}]`;
  }
}

function showHelp() {
  console.log(`
Notion CLI - Interact with Notion API

Usage:
  notion search <query>              Search pages and databases
  notion get <page-id>               Get page details
  notion blocks <page-id>            Get page blocks (content)
  notion create-page --title "X"     Create a new page
  notion create-page --title "X" --parent <db-id>  Create page in database
  notion query <database-id>         Query database entries
  notion append-blocks <page-id> [json]  Append blocks to a page

Environment:
  NOTION_API_KEY   Your Notion API key (from notion.so/my-integrations)

Examples:
  notion search "project ideas"
  notion get abc123-def456-ghi789
  notion blocks abc123-def456-ghi789
  notion create-page --title "New Task" --parent db123
  notion query db123
`);
}

run().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
