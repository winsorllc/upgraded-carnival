#!/usr/bin/env node

/**
 * Notion CLI - Interact with Notion workspaces
 * 
 * Usage:
 *   notion <command> [options]
 * 
 * Commands:
 *   search <query>           Search Notion workspace
 *   page <pageId>            Get page metadata
 *   blocks <pageId>          Get page content (blocks)
 *   databases                List accessible databases
 *   query <databaseId>      Query a database
 *   create-page              Create a new page
 *   append-blocks <pageId>   Add blocks to a page
 *   create-database          Create a new database
 */

const { Client } = require('@notionhq/client');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  apiKey: process.env.NOTION_API_KEY || null,
};

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const commandArgs = args.slice(1);

// Initialize Notion client
let notion;

function getNotionClient() {
  if (!notion) {
    const apiKey = CONFIG.apiKey || findApiKey();
    if (!apiKey) {
      console.error('Error: NOTION_API_KEY not set. Set it via:');
      console.error('  export NOTION_API_KEY="secret_xxxxx"');
      console.error('Or pass --api-key flag');
      process.exit(1);
    }
    notion = new Client({ auth: apiKey });
  }
  return notion;
}

function findApiKey() {
  // Check for --api-key flag
  const keyIndex = commandArgs.indexOf('--api-key');
  if (keyIndex !== -1 && commandArgs[keyIndex + 1]) {
    return commandArgs[keyIndex + 1];
  }
  return process.env.NOTION_API_KEY;
}

// Helper to extract plain text from rich text arrays
function getPlainText(richText) {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map(t => t.plain_text).join('');
}

// Helper to extract title from page properties
function getPageTitle(page) {
  const props = page.properties;
  
  // Try common title property names
  for (const [key, value] of Object.entries(props)) {
    if (value.type === 'title') {
      const title = getPlainText(value.title);
      if (title) return title;
    }
    if (value.type === 'Name' && value.title) {
      return getPlainText(value.title);
    }
  }
  
  return 'Untitled';
}

// Format a block for display
function formatBlock(block, indent = 0) {
  const prefix = '  '.repeat(indent);
  const type = block.type;
  const data = block[type];
  
  switch (type) {
    case 'paragraph':
      return prefix + getPlainText(data.rich_text);
    case 'heading_1':
      return prefix + '# ' + getPlainText(data.rich_text);
    case 'heading_2':
      return prefix + '## ' + getPlainText(data.rich_text);
    case 'heading_3':
      return prefix + '### ' + getPlainText(data.rich_text);
    case 'bulleted_list_item':
      return prefix + '• ' + getPlainText(data.rich_text);
    case 'numbered_list_item':
      return prefix + '1. ' + getPlainText(data.rich_text);
    case 'to_do':
      const checked = data.checked ? '[x]' : '[ ]';
      return prefix + checked + ' ' + getPlainText(data.rich_text);
    case 'toggle':
      return prefix + '▶ ' + getPlainText(data.rich_text);
    case 'code':
      return prefix + '```' + (data.language || '') + '\n' + getPlainText(data.rich_text) + '\n' + prefix + '```';
    case 'quote':
      return prefix + '> ' + getPlainText(data.rich_text);
    case 'divider':
      return prefix + '---';
    case 'image':
      const imgUrl = data.type === 'external' ? data.external.url : data.file.url;
      return prefix + '[Image: ' + imgUrl + ']';
    default:
      return prefix + '[' + type + ']';
  }
}

// Command implementations
const commands = {
  // Search Notion workspace
  async search(query) {
    const client = getNotionClient();
    console.error(`Searching for: "${query}"`);
    
    try {
      const response = await client.search({
        query: query,
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
      });
      
      if (response.results.length === 0) {
        console.log('No results found.');
        return;
      }
      
      console.log(`Found ${response.results.length} result(s):\n`);
      
      for (const item of response.results) {
        const title = item.object === 'page' ? getPageTitle(item) : 'Database: ' + item.title?.[0]?.plain_text || 'Untitled';
        const url = item.url || `notion://${item.id}`;
        console.log(`• ${title}`);
        console.log(`  ID: ${item.id}`);
        console.log(`  URL: ${url}`);
        console.log('');
      }
    } catch (error) {
      console.error('Search error:', error.message);
      process.exit(1);
    }
  },
  
  // Get page metadata
  async page(pageId) {
    const client = getNotionClient();
    
    try {
      const page = await client.pages.retrieve({ page_id: pageId });
      
      console.log('Page Details:');
      console.log('=============');
      console.log(`ID: ${page.id}`);
      console.log(`Title: ${getPageTitle(page)}`);
      console.log(`URL: ${page.url}`);
      console.log(`Created: ${page.created_time}`);
      console.log(`Last Edited: ${page.last_edited_time}`);
      console.log('');
      console.log('Properties:');
      console.log(JSON.stringify(page.properties, null, 2));
    } catch (error) {
      console.error('Error fetching page:', error.message);
      process.exit(1);
    }
  },
  
  // Get page blocks/content
  async blocks(pageId) {
    const client = getNotionClient();
    
    try {
      // Get page info first
      const page = await client.pages.retrieve({ page_id: pageId });
      console.log(`Page: ${getPageTitle(page)}`);
      console.log(`ID: ${pageId}`);
      console.log('');
      console.log('Content:');
      console.log('========');
      
      // Paginate through blocks
      let hasMore = true;
      let cursor;
      
      while (hasMore) {
        const response = await client.blocks.children.list({
          block_id: pageId,
          start_cursor: cursor,
        });
        
        for (const block of response.results) {
          console.log(formatBlock(block));
        }
        
        hasMore = response.has_more;
        cursor = response.next_cursor;
      }
    } catch (error) {
      console.error('Error fetching blocks:', error.message);
      process.exit(1);
    }
  },
  
  // List databases
  async databases() {
    const client = getNotionClient();
    console.error('Searching for databases...');
    
    try {
      const response = await client.search({
        filter: { value: 'database', property: 'object' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
      });
      
      if (response.results.length === 0) {
        console.log('No databases found. Make sure databases are shared with your integration.');
        return;
      }
      
      console.log(`Found ${response.results.length} database(s):\n`);
      
      for (const db of response.results) {
        console.log(`• ${db.title?.[0]?.plain_text || 'Untitled Database'}`);
        console.log(`  ID: ${db.id}`);
        console.log(`  URL: ${db.url}`);
        console.log('');
      }
    } catch (error) {
      console.error('Error listing databases:', error.message);
      process.exit(1);
    }
  },
  
  // Query a database
  async query(databaseId, filterJson) {
    const client = getNotionClient();
    
    try {
      // Get database info
      const database = await client.databases.retrieve({ database_id: databaseId });
      console.log(`Database: ${database.title?.[0]?.plain_text || 'Untitled'}`);
      console.log('');
      
      // Build query options
      const queryOptions = { database_id: databaseId };
      
      if (filterJson) {
        try {
          queryOptions.filter = JSON.parse(filterJson);
        } catch (e) {
          console.error('Invalid filter JSON:', e.message);
          process.exit(1);
        }
      }
      
      const response = await client.databases.query(queryOptions);
      
      if (response.results.length === 0) {
        console.log('No results found.');
        return;
      }
      
      console.log(`Found ${response.results.length} entry/entries:\n`);
      
      for (const item of response.results) {
        console.log('---');
        // Print key properties
        for (const [key, prop] of Object.entries(item.properties)) {
          let value = '';
          switch (prop.type) {
            case 'title':
              value = getPlainText(prop.title);
              break;
            case 'rich_text':
              value = getPlainText(prop.rich_text);
              break;
            case 'number':
              value = prop.number?.toString() || '';
              break;
            case 'select':
              value = prop.select?.name || '';
              break;
            case 'multi_select':
              value = prop.multi_select?.map(s => s.name).join(', ') || '';
              break;
            case 'date':
              value = prop.date?.start || '';
              break;
            case 'checkbox':
              value = prop.checkbox ? 'Yes' : 'No';
              break;
            case 'url':
              value = prop.url || '';
              break;
            case 'people':
              value = prop.people?.map(p => p.name).join(', ') || '';
              break;
            default:
              value = `[${prop.type}]`;
          }
          if (value) {
            console.log(`${key}: ${value}`);
          }
        }
        console.log(`ID: ${item.id}`);
        console.log('');
      }
    } catch (error) {
      console.error('Error querying database:', error.message);
      process.exit(1);
    }
  },
  
  // Create a new page
  async createPage(options) {
    const client = getNotionClient();
    
    const { parent, title, content } = options;
    
    if (!parent) {
      console.error('Error: --parent (page ID or database ID) is required');
      console.error('Usage: notion create-page --parent <ID> --title "Page Title" --content "Content"');
      process.exit(1);
    }
    
    if (!title) {
      console.error('Error: --title is required');
      process.exit(1);
    }
    
    try {
      // Determine if parent is a database or page
      let parentObj = { page_id: parent };
      
      // Try to determine if it's a database
      try {
        const db = await client.databases.retrieve({ database_id: parent });
        parentObj = { database_id: parent };
      } catch (e) {
        // Not a database, use as page
      }
      
      // Build children blocks
      const children = [];
      
      // Add title as heading
      children.push({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', text: { content: title } }]
        }
      });
      
      // Add content if provided
      if (content) {
        children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: content } }]
          }
        });
      }
      
      const newPage = await client.pages.create({
        ...parentObj,
        properties: {
          title: {
            title: [{ type: 'text', text: { content: title } }]
          }
        },
        children: children
      });
      
      console.log('Page created successfully!');
      console.log(`ID: ${newPage.id}`);
      console.log(`URL: ${newPage.url}`);
    } catch (error) {
      console.error('Error creating page:', error.message);
      process.exit(1);
    }
  },
  
  // Append blocks to a page
  async appendBlocks(pageId, content) {
    const client = getNotionClient();
    
    if (!content) {
      console.error('Error: --content is required');
      process.exit(1);
    }
    
    try {
      // Split content into paragraphs
      const paragraphs = content.split('\n\n').filter(p => p.trim());
      
      const children = paragraphs.map(text => ({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: text } }]
        }
      }));
      
      await client.blocks.children.append({
        block_id: pageId,
        children: children
      });
      
      console.log('Blocks appended successfully!');
      console.log(`Page: ${pageId}`);
    } catch (error) {
      console.error('Error appending blocks:', error.message);
      process.exit(1);
    }
  },
  
  // Create a new database
  async createDatabase(options) {
    const client = getNotionClient();
    
    const { parent, title, properties } = options;
    
    if (!parent) {
      console.error('Error: --parent (page ID) is required');
      console.error('Usage: notion create-database --parent <PAGE_ID> --title "DB Title" --properties JSON');
      process.exit(1);
    }
    
    if (!title) {
      console.error('Error: --title is required');
      process.exit(1);
    }
    
    try {
      let props = {};
      
      // Default properties
      props.Name = {
        title: {}
      };
      
      // Parse custom properties if provided
      if (properties) {
        try {
          props = { ...props, ...JSON.parse(properties) };
        } catch (e) {
          console.error('Invalid properties JSON:', e.message);
          process.exit(1);
        }
      } else {
        // Add default Status property
        props.Status = {
          select: {
            options: [
              { name: 'To Do', color: 'red' },
              { name: 'In Progress', color: 'yellow' },
              { name: 'Done', color: 'green' }
            ]
          }
        };
      }
      
      const newDb = await client.databases.create({
        parent: { page_id: parent },
        title: [{ type: 'text', text: { content: title } }],
        properties: props
      });
      
      console.log('Database created successfully!');
      console.log(`ID: ${newDb.id}`);
      console.log(`URL: ${newDb.url}`);
    } catch (error) {
      console.error('Error creating database:', error.message);
      process.exit(1);
    }
  }
};

// Parse options from command line
function parseOptions(args) {
  const options = {};
  const remaining = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      
      if (nextArg && !nextArg.startsWith('--')) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = true;
      }
    } else {
      remaining.push(arg);
    }
  }
  
  return { options, remaining };
}

// Main entry point
async function main() {
  if (!command) {
    console.log(`
Notion CLI - Interact with Notion workspaces

Usage:
  notion <command> [options]

Commands:
  search <query>           Search Notion workspace
  page <pageId>            Get page metadata
  blocks <pageId>          Get page content (blocks)
  databases                List accessible databases
  query <databaseId>      Query a database
  create-page              Create a new page
  append-blocks <pageId>   Add blocks to a page
  create-database          Create a new database

Options:
  --api-key <key>         Notion API key (or set NOTION_API_KEY env var)

Examples:
  notion search "meeting notes"
  notion page abc123def456789
  notion blocks abc123def456789
  notion databases
  notion query database123 --filter '{"Status": {"select": {"equals": "Done"}}}'
  notion create-page --parent abc123 --title "New Page" --content "Hello world"
  notion append-blocks abc123 --content "New paragraph"

Environment:
  NOTION_API_KEY           Your Notion integration secret
`);
    process.exit(0);
  }
  
  const { options, remaining } = parseOptions(commandArgs);
  
  // Handle commands
  switch (command) {
    case 'search':
      if (!remaining[0]) {
        console.error('Error: search query required');
        console.error('Usage: notion search "query"');
        process.exit(1);
      }
      await commands.search(remaining[0]);
      break;
      
    case 'page':
      if (!remaining[0]) {
        console.error('Error: page ID required');
        console.error('Usage: notion page <pageId>');
        process.exit(1);
      }
      await commands.page(remaining[0]);
      break;
      
    case 'blocks':
      if (!remaining[0]) {
        console.error('Error: page ID required');
        console.error('Usage: notion blocks <pageId>');
        process.exit(1);
      }
      await commands.blocks(remaining[0]);
      break;
      
    case 'databases':
      await commands.databases();
      break;
      
    case 'query':
      if (!remaining[0]) {
        console.error('Error: database ID required');
        console.error('Usage: notion query <databaseId> [--filter JSON]');
        process.exit(1);
      }
      await commands.query(remaining[0], options.filter);
      break;
      
    case 'create-page':
      await commands.createPage(options);
      break;
      
    case 'append-blocks':
      if (!remaining[0]) {
        console.error('Error: page ID required');
        console.error('Usage: notion append-blocks <pageId> --content "text"');
        process.exit(1);
      }
      await commands.appendBlocks(remaining[0], options.content);
      break;
      
    case 'create-database':
      await commands.createDatabase(options);
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "notion" without arguments for usage info');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
