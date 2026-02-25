#!/usr/bin/env node

/**
 * Trello CLI - Manage Trello boards, lists, and cards
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'api.trello.com';
const API_VERSION = 1;

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function getCreds() {
  return {
    key: process.env.TRELLO_API_KEY,
    token: process.env.TRELLO_TOKEN
  };
}

function trelloRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const { key, token } = getCreds();
    
    if (!key || !token) {
      return reject(new Error('TRELLO_API_KEY and TRELLO_TOKEN environment variables required'));
    }
    
    const params = new URLSearchParams({ key, token, ...options.query });
    const url = new URL(`/${API_VERSION}${endpoint}?${params}`);
    
    const reqOptions = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'thepopebot-trello'
      }
    };
    
    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(json)}`));
          }
        } catch (e) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

function parseArgs(args) {
  const parsed = {
    positional: [],
    options: {}
  };
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.replace('--', '');      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        parsed.options[key] = next;
        i += 2;
      } else {
        parsed.options[key] = true;
        i++;
      }
    } else {
      parsed.positional.push(arg);
      i++;
    }
  }
  
  return parsed;
}

// Board Commands
async function cmdBoards(options) {
  const boards = await trelloRequest('/members/me/boards', { query: { fields: 'name,desc,dateLastActivity,closed' } });
  
  if (options.json) {
    console.log(JSON.stringify(boards, null, 2));
    return;
  }
  
  log(`\n${colors.bright}Your Boards${colors.reset}\n`, 'cyan');
  
  if (boards.length === 0) {
    log('No boards found');
    return;
  }
  
  boards.forEach(board => {
    const status = board.closed ? '(archived)' : '';
    log(`${board.name} ${status}`, 'green');
    log(`  ID: ${board.id}`);
    if (board.desc) log(`  ${board.desc.substring(0, 60)}...`);
    log(`  Last activity: ${new Date(board.dateLastActivity).toLocaleString()}`);
    log('');
  });
}

async function cmdBoard(boardId, options) {
  if (!boardId) {
    log('Error: Board ID required', 'red');
    process.exit(1);
  }
  
  const board = await trelloRequest(`/boards/${boardId}`, {
    query: { fields: 'name,desc,dateLastActivity,closed,url' }
  });
  
  if (options.json) {
    console.log(JSON.stringify(board, null, 2));
    return;
  }
  
  log(`\n${colors.bright}${board.name}${colors.reset}`, 'cyan');
  log(`URL: ${board.url}`);
  log(`ID: ${board.id}`);
  if (board.desc) log(`Description: ${board.desc}`);
  log(`Last Activity: ${new Date(board.dateLastActivity).toLocaleString()}`);
  
  if (options.cards) {
    const lists = await trelloRequest(`/boards/${boardId}/lists`, { query: { fields: 'name,id' } });
    log(`\n${colors.yellow}Lists and Cards:${colors.reset}`);
    
    for (const list of lists) {
      const cards = await trelloRequest(`/lists/${list.id}/cards`, { query: { fields: 'name,desc,due,idLabels,closed' } });
      log(`\n  ${list.name} (${cards.length} cards)`);
      cards.forEach(card => {
        const due = card.due ? ` Due: ${new Date(card.due).toLocaleDateString()}` : '';
        const labels = card.idLabels.length > 0 ? ` [${card.idLabels.length} labels]` : '';
        const archived = card.closed ? ' (archived)' : '';
        log(`    - ${card.name}${archived}${labels}${due}`);
      });
    }
  }
}

async function cmdCreateBoard(name, options) {
  if (!name) {
    log('Error: Board name required', 'red');
    process.exit(1);
  }
  
  const board = await trelloRequest('/boards/', {
    method: 'POST',
    query: { name, desc: options.desc || '', defaultLists: 'false' }
  });
  
  log(`\n${colors.green}Created board: ${board.name}${colors.reset}`);
  log(`ID: ${board.id}`);
  log(`URL: ${board.url}`);
}

async function cmdArchiveBoard(boardId) {
  if (!boardId) {
    log('Error: Board ID required', 'red');
    process.exit(1);
  }
  
  const board = await trelloRequest(`/boards/${boardId}`, {
    method: 'PUT',
    query: { closed: 'true' }
  });
  
  log(`\n${colors.green}Archived board: ${board.name}${colors.reset}`);
}

// List Commands
async function cmdLists(boardId, options) {
  if (!boardId) {
    log('Error: Board ID required', 'red');
    process.exit(1);
  }
  
  const lists = await trelloRequest(`/boards/${boardId}/lists`, {
    query: { fields: 'name,id,closed' }
  });
  
  if (options.json) {
    console.log(JSON.stringify(lists, null, 2));
    return;
  }
  
  log(`\n${colors.bright}Lists in Board${colors.reset}\n`, 'cyan');
  
  lists.forEach(list => {
    const status = list.closed ? '(archived)' : '';
    log(`${list.name} ${status}`, 'green');
    log(`  ID: ${list.id}`);
    log('');
  });
}

async function cmdCreateList(boardId, name) {
  if (!boardId || !name) {
    log('Error: Board ID and list name required', 'red');
    process.exit(1);
  }
  
  const list = await trelloRequest('/lists', {
    method: 'POST',
    query: { name, idBoard: boardId }
  });
  
  log(`\n${colors.green}Created list: ${list.name}${colors.reset}`);
  log(`ID: ${list.id}`);
}

async function cmdArchiveList(listId) {
  if (!listId) {
    log('Error: List ID required', 'red');
    process.exit(1);
  }
  
  const list = await trelloRequest(`/lists/${listId}`, {
    method: 'PUT',
    query: { closed: 'true' }
  });
  
  log(`\n${colors.green}Archived list: ${list.name}${colors.reset}`);
}

// Card Commands
async function cmdCards(listId, options) {
  if (!listId) {
    log('Error: List ID required', 'red');
    process.exit(1);
  }
  
  const cards = await trelloRequest(`/lists/${listId}/cards`, {
    query: { fields: 'name,desc,due,idLabels,closed,idList' }
  });
  
  if (options.json) {
    console.log(JSON.stringify(cards, null, 2));
    return;
  }
  
  log(`\n${colors.bright}Cards in List${colors.reset}\n`, 'cyan');
  
  if (cards.length === 0) {
    log('No cards found');
    return;
  }
  
  cards.forEach(card => {
    const due = card.due ? ` Due: ${new Date(card.due).toLocaleString()}` : '';
    const labels = card.idLabels.length > 0 ? ` [${card.idLabels.length} labels]` : '';
    const archived = card.closed ? ' (archived)' : '';
    log(`${card.name}${archived}${labels}${due}`, 'green');
    if (card.desc) log(`  ${card.desc.substring(0, 80)}...`);
    log(`  ID: ${card.id}`);
    log('');
  });
}

async function cmdCreateCard(listId, name, options) {
  if (!listId || !name) {
    log('Error: List ID and card name required', 'red');
    process.exit(1);
  }
  
  const card = await trelloRequest('/cards', {
    method: 'POST',
    query: { name, idList: listId, desc: options.desc || '' }
  });
  
  log(`\n${colors.green}Created card: ${card.name}${colors.reset}`);
  log(`ID: ${card.id}`);
  log(`URL: ${card.url}`);
}

async function cmdMoveCard(cardId, listId) {
  if (!cardId || !listId) {
    log('Error: Card ID and list ID required', 'red');
    process.exit(1);
  }
  
  const card = await trelloRequest(`/cards/${cardId}`, {
    method: 'PUT',
    query: { idList: listId }
  });
  
  log(`\n${colors.green}Moved card to new list${colors.reset}`);
}

async function cmdComment(cardId, text) {
  if (!cardId || !text) {
    log('Error: Card ID and comment text required', 'red');
    process.exit(1);
  }
  
  const comment = await trelloRequest(`/cards/${cardId}/actions/comments`, {
    method: 'POST',
    query: { text }
  });
  
  log(`\n${colors.green}Added comment to card${colors.reset}`);
}

async function cmdLabel(cardId, labelName) {
  if (!cardId || !labelName) {
    log('Error: Card ID and label name required', 'red');
    process.exit(1);
  }
  
  // Get available labels on the card's board
  const card = await trelloRequest(`/cards/${cardId}`, { query: { fields: 'idBoard' } });
  const labels = await trelloRequest(`/boards/${card.idBoard}/labels`, { query: { fields: 'name,color' } });
  
  // Find or create label
  let label = labels.find(l => l.name.toLowerCase() === labelName.toLowerCase());
  
  if (!label) {
    // Create new label
    const colorsMap = ['green', 'yellow', 'orange', 'red', 'purple', 'blue'];
    const color = colorsMap[labels.length % colorsMap.length];
    label = await trelloRequest(`/boards/${card.idBoard}/labels`, {
      method: 'POST',
      query: { name: labelName, color }
    });
  }
  
  // Add label to card
  await trelloRequest(`/cards/${cardId}/labels`, {
    method: 'POST',
    query: { value: label.id }
  });
  
  log(`\n${colors.green}Added label: ${label.name}${colors.reset}`);
}

async function cmdDue(cardId, dueDate) {
  if (!cardId || !dueDate) {
    log('Error: Card ID and due date required', 'red');
    process.exit(1);
  }
  
  const card = await trelloRequest(`/cards/${cardId}`, {
    method: 'PUT',
    query: { due: dueDate }
  });
  
  log(`\n${colors.green}Set due date: ${new Date(dueDate).toLocaleString()}${colors.reset}`);
}

async function cmdArchiveCard(cardId) {
  if (!cardId) {
    log('Error: Card ID required', 'red');
    process.exit(1);
  }
  
  const card = await trelloRequest(`/cards/${cardId}`, {
    method: 'PUT',
    query: { closed: 'true' }
  });
  
  log(`\n${colors.green}Archived card: ${card.name}${colors.reset}`);
}

async function cmdSearch(query, options) {
  if (!query) {
    log('Error: Search query required', 'red');
    process.exit(1);
  }
  
  const results = await trelloRequest('/search', {
    query: { query, modelTypes: 'cards', fields: 'name,idBoard,idList,due,closed' }
  });
  
  if (options.json) {
    console.log(JSON.stringify(results.cards, null, 2));
    return;
  }
  
  log(`\n${colors.bright}Search Results (${results.cards?.length || 0})${colors.reset}\n`, 'cyan');
  
  if (!results.cards || results.cards.length === 0) {
    log('No cards found');
    return;
  }
  
  for (const card of results.cards) {
    const due = card.due ? ` Due: ${new Date(card.due).toLocaleDateString()}` : '';
    log(`Card: ${card.name}`, 'green');
    log(`  Board: ${card.idBoard}`);
    log(`  List: ${card.idList}`);
    log(`  ID: ${card.id}${due}`);
    log('');
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log(`
${colors.bright}Trello CLI${colors.reset}
Manage Trello boards, lists, and cards

${colors.cyan}Boards:${colors.reset}
  trello-cli.js boards                      List your boards
  trello-cli.js board <id>                  Get board details
  trello-cli.js board <id> --cards          Include cards
  trello-cli.js create-board <name>         Create board
  trello-cli.js create-board <name> --desc "Description"
  trello-cli.js archive-board <id>          Archive board

${colors.cyan}Lists:${colors.reset}
  trello-cli.js lists <board-id>           List lists in board
  trello-cli.js create-list <board-id> <name>
  trello-cli.js archive-list <list-id>

${colors.cyan}Cards:${colors.reset}
  trello-cli.js cards <list-id>             List cards in list
  trello-cli.js create-card <list-id> <name>
  trello-cli.js create-card <list-id> <name> --desc "Description"
  trello-cli.js move-card <card-id> <list-id>
  trello-cli.js comment <card-id> "text"
  trello-cli.js label <card-id> <name>
  trello-cli.js due <card-id> "2024-12-31"
  trello-cli.js archive-card <card-id>

${colors.cyan}Search:${colors.reset}
  trello-cli.js search "query"
  trello-cli.js search "query" --json

${colors.cyan}Options:${colors.reset}
  --json    JSON output
  --cards   Include cards in board output

${colors.cyan}Environment:${colors.reset}
  TRELLO_API_KEY    Your Trello API key
  TRELLO_TOKEN      Your Trello token
`);
    process.exit(0);
  }
  
  const cmd = args[0];
  const cmdArgs = args.slice(1);
  const { positional, options } = parseArgs(cmdArgs);
  
  try {
    switch (cmd) {
      case 'boards':
        await cmdBoards(options);
        break;
      case 'board':
        await cmdBoard(positional[0], options);
        break;
      case 'create-board':
        await cmdCreateBoard(positional[0], options);
        break;
      case 'archive-board':
        await cmdArchiveBoard(positional[0]);
        break;
      case 'lists':
        await cmdLists(positional[0], options);
        break;
      case 'create-list':
        await cmdCreateList(positional[0], positional[1]);
        break;
      case 'archive-list':
        await cmdArchiveList(positional[0]);
        break;
      case 'cards':
        await cmdCards(positional[0], options);
        break;
      case 'create-card':
        await cmdCreateCard(positional[0], positional[1], options);
        break;
      case 'move-card':
        await cmdMoveCard(positional[0], positional[1]);
        break;
      case 'comment':
        await cmdComment(positional[0], positional.slice(1).join(' '));
        break;
      case 'label':
        await cmdLabel(positional[0], positional[1]);
        break;
      case 'due':
        await cmdDue(positional[0], positional[1]);
        break;
      case 'archive-card':
        await cmdArchiveCard(positional[0]);
        break;
      case 'search':
        await cmdSearch(positional.join(' '), options);
        break;
      default:
        log(`Unknown command: ${cmd}`, 'red');
        process.exit(1);
    }
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
