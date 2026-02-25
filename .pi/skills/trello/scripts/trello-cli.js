#!/usr/bin/env node
/**
 * Trello CLI - Command-line interface for Trello
 * 
 * Usage: node trello-cli.js <command> [options]
 * 
 * Commands:
 *   boards                          List all boards
 *   board <id>                      Get board details
 *   create-board <name>             Create a new board
 *   archive-board <id>              Archive a board
 *   lists <board-id>                List lists in a board
 *   create-list <board-id> <name>  Create a list
 *   archive-list <id>              Archive a list
 *   cards <list-id>                List cards in a list
 *   create-card <list-id> <name>   Create a card
 *   move-card <card-id> <list-id>  Move card to another list
 *   comment <card-id> <text>        Add comment to card
 *   label <card-id> <label>         Add label to card
 *   due <card-id> <date>            Set due date
 *   archive-card <card-id>         Archive a card
 *   search <query>                  Search cards
 * 
 * Options:
 *   --key <api-key>          Trello API key
 *   --token <token>          Trello token
 *   --json                   Output as JSON
 *   --quiet                  Minimal output
 *   --desc <description>     Card description (for create-card)
 *   --board <id>             Board ID for search
 *   --cards                  Include cards in board output
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
let API_KEY = process.env.TRELLO_API_KEY || '';
let TOKEN = process.env.TRELLO_TOKEN || '';

// Output mode
let JSON_OUTPUT = false;
let QUIET = false;

// Parse arguments
const args = process.argv.slice(2);

// Check for help
if (args.includes('--help') || args.includes('-h')) {
    console.log(`Trello CLI
Usage: trello-cli.js <command> [options]

Commands:
  boards                          List all boards
  board <id>                      Get board details
  create-board <name>             Create a new board
  archive-board <id>              Archive a board
  lists <board-id>                List lists in a board
  create-list <board-id> <name>  Create a list
  archive-list <id>              Archive a list
  cards <list-id>                List cards in a list
  create-card <list-id> <name>   Create a card
  move-card <card-id> <list-id>  Move card to another list
  comment <card-id> <text>        Add comment to card
  label <card-id> <label>         Add label to card
  due <card-id> <date>            Set due date
  archive-card <card-id>          Archive a card
  search <query>                  Search cards

Options:
  --key <api-key>          Trello API key
  --token <token>          Trello token
  --json                   Output as JSON
  --quiet                  Minimal output
  --desc <description>     Card description (for create-card)
  --board <id>             Board ID for search
  --cards                  Include cards in board output
`);
    process.exit(0);
}

let command = args[0];
let param1 = args[1];
let param2 = args[2];

const options = {};
let i = 3;
while (i < args.length) {
    const arg = args[i];
    if (arg === '--key') {
        API_KEY = args[++i];
    } else if (arg === '--token') {
        TOKEN = args[++i];
    } else if (arg === '--json') {
        JSON_OUTPUT = true;
    } else if (arg === '--quiet') {
        QUIET = true;
    } else if (arg === '--desc' && args[i + 1]) {
        options.desc = args[++i];
    } else if (arg === '--board' && args[i + 1]) {
        options.board = args[++i];
    } else if (arg === '--cards') {
        options.includeCards = true;
    }
    i++;
}

// Helper: Make HTTP request
function trelloRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        if (!API_KEY || !TOKEN) {
            reject(new Error('TRELLO_API_KEY and TRELLO_TOKEN are required'));
            return;
        }

        const baseUrl = 'https://api.trello.com/1';
        let urlStr = `${baseUrl}${path}`;
        
        // Add auth to query string for GET, form data for POST/PUT
        const urlObj = new URL(urlStr);
        urlObj.searchParams.set('key', API_KEY);
        urlObj.searchParams.set('token', TOKEN);
        
        const isGet = method === 'GET';
        const finalUrl = urlObj.toString();
        
        const url = new URL(finalUrl);
        const reqOptions = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Accept': 'application/json'
            }
        };

        if (!isGet && data) {
            const formData = new URLSearchParams(data).toString();
            reqOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            reqOptions.body = formData;
        }

        const req = (url.protocol === 'https:' ? https : http).request(reqOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = body ? JSON.parse(body) : {};
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(json);
                    } else {
                        reject(new Error(json.error || `HTTP ${res.statusCode}: ${body}`));
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${body}`));
                }
            });
        });

        req.on('error', reject);
        
        if (!isGet && data) {
            req.write(new URLSearchParams(data).toString());
        }
        req.end();
    });
}

// Output helpers
function output(data) {
    if (JSON_OUTPUT) {
        console.log(JSON.stringify(data));
    } else if (QUIET) {
        console.log(data);
    } else {
        console.log(data);
    }
}

function error(msg) {
    if (JSON_OUTPUT) {
        console.log(JSON.stringify({ error: msg }));
    } else {
        console.error(msg);
    }
    process.exit(1);
}

// Commands
async function listBoards() {
    try {
        const boards = await trelloRequest('GET', '/members/me/boards', { fields: 'name,id,closed,url' });
        output(boards);
    } catch (e) {
        error(e.message);
    }
}

async function getBoard(id) {
    try {
        const board = await trelloRequest('GET', `/boards/${id}`, { 
            fields: 'name,id,closed,url,description',
            ...(options.includeCards ? { cards: 'all', card_fields: 'name,id,idList,due,closed,labels' } : {})
        });
        output(board);
    } catch (e) {
        error(e.message);
    }
}

async function createBoard(name) {
    try {
        const board = await trelloRequest('POST', '/boards', { name });
        output(board);
    } catch (e) {
        error(e.message);
    }
}

async function archiveBoard(id) {
    try {
        const board = await trelloRequest('PUT', `/boards/${id}`, { closed: 'true' });
        output({ success: true, id });
    } catch (e) {
        error(e.message);
    }
}

async function listLists(boardId) {
    try {
        const lists = await trelloRequest('GET', `/boards/${boardId}/lists`, { 
            fields: 'name,id,closed',
            ...(options.includeCards ? { cards: 'all' } : {})
        });
        output(lists);
    } catch (e) {
        error(e.message);
    }
}

async function createList(boardId, name) {
    try {
        const list = await trelloRequest('POST', '/lists', { idBoard: boardId, name });
        output(list);
    } catch (e) {
        error(e.message);
    }
}

async function archiveList(id) {
    try {
        const list = await trelloRequest('PUT', `/lists/${id}`, { closed: 'true' });
        output({ success: true, id });
    } catch (e) {
        error(e.message);
    }
}

async function listCards(listId) {
    try {
        const cards = await trelloRequest('GET', `/lists/${listId}/cards`, { 
            fields: 'name,id,desc,due,closed,idList,labels'
        });
        output(cards);
    } catch (e) {
        error(e.message);
    }
}

async function createCard(listId, name) {
    try {
        const data = { idList: listId, name };
        if (options.desc) data.desc = options.desc;
        const card = await trelloRequest('POST', '/cards', data);
        output(card);
    } catch (e) {
        error(e.message);
    }
}

async function moveCard(cardId, listId) {
    try {
        const card = await trelloRequest('PUT', `/cards/${cardId}`, { idList: listId });
        output(card);
    } catch (e) {
        error(e.message);
    }
}

async function addComment(cardId, text) {
    try {
        const result = await trelloRequest('POST', `/cards/${cardId}/actions/comments`, { text });
        output(result);
    } catch (e) {
        error(e.message);
    }
}

async function addLabel(cardId, label) {
    try {
        // Get available labels first
        const card = await trelloRequest('GET', `/cards/${cardId}`, { fields: 'idBoard' });
        const labels = await trelloRequest('GET', `/boards/${card.idBoard}/labels`, { fields: 'name,color' });
        
        // Find matching label or use common colors
        const labelMap = {
            'red': 'red', 'orange': 'orange', 'yellow': 'yellow',
            'green': 'green', 'blue': 'blue', 'purple': 'purple'
        };
        const color = labelMap[label.toLowerCase()] || 'blue';
        
        // Create or find label
        const existing = labels.find(l => l.name.toLowerCase() === label.toLowerCase());
        let labelId = existing?.id;
        
        if (!labelId) {
            const newLabel = await trelloRequest('POST', `/boards/${card.idBoard}/labels`, { 
                name: label, color 
            });
            labelId = newLabel.id;
        }
        
        // Add label to card
        const result = await trelloRequest('PUT', `/cards/${cardId}`, { 
            idLabels: labelId
        });
        output(result);
    } catch (e) {
        error(e.message);
    }
}

async function setDue(cardId, date) {
    try {
        const card = await trelloRequest('PUT', `/cards/${cardId}`, { due: date });
        output(card);
    } catch (e) {
        error(e.message);
    }
}

async function archiveCard(cardId) {
    try {
        const card = await trelloRequest('PUT', `/cards/${cardId}`, { closed: 'true' });
        output({ success: true, id: cardId });
    } catch (e) {
        error(e.message);
    }
}

async function search(query) {
    try {
        const params = { query, modelTypes: 'cards', card_fields: 'name,id,idBoard,idList,due' };
        if (options.board) params.idBoards = options.board;
        const results = await trelloRequest('GET', '/search', params);
        output(results.cards || []);
    } catch (e) {
        error(e.message);
    }
}

// Main dispatcher
async function main() {
    if (!command) {
        console.log(`Trello CLI
Usage: trello-cli.js <command> [options]

Commands:
  boards                          List all boards
  board <id>                      Get board details
  create-board <name>             Create a new board
  archive-board <id>              Archive a board
  lists <board-id>                List lists in a board
  create-list <board-id> <name>  Create a list
  archive-list <id>              Archive a list
  cards <list-id>                List cards in a list
  create-card <list-id> <name>   Create a card
  move-card <card-id> <list-id>  Move card to another list
  comment <card-id> <text>       Add comment to card
  label <card-id> <label>        Add label to card
  due <card-id> <date>           Set due date
  archive-card <card-id>         Archive a card
  search <query>                 Search cards

Options:
  --key <api-key>          Trello API key
  --token <token>          Trello token
  --json                   Output as JSON
  --quiet                  Minimal output
  --desc <description>     Card description
  --board <id>             Board ID for search
  --cards                  Include cards in board output
`);
        process.exit(0);
    }

    try {
        switch (command) {
            case 'boards':
                await listBoards();
                break;
            case 'board':
                if (!param1) error('Board ID required');
                await getBoard(param1);
                break;
            case 'create-board':
                if (!param1) error('Board name required');
                await createBoard(param1);
                break;
            case 'archive-board':
                if (!param1) error('Board ID required');
                await archiveBoard(param1);
                break;
            case 'lists':
                if (!param1) error('Board ID required');
                await listLists(param1);
                break;
            case 'create-list':
                if (!param1 || !param2) error('Board ID and list name required');
                await createList(param1, param2);
                break;
            case 'archive-list':
                if (!param1) error('List ID required');
                await archiveList(param1);
                break;
            case 'cards':
                if (!param1) error('List ID required');
                await listCards(param1);
                break;
            case 'create-card':
                if (!param1 || !param2) error('List ID and card name required');
                await createCard(param1, param2);
                break;
            case 'move-card':
                if (!param1 || !param2) error('Card ID and list ID required');
                await moveCard(param1, param2);
                break;
            case 'comment':
                if (!param1 || !param2) error('Card ID and comment text required');
                await addComment(param1, param2);
                break;
            case 'label':
                if (!param1 || !param2) error('Card ID and label required');
                await addLabel(param1, param2);
                break;
            case 'due':
                if (!param1 || !param2) error('Card ID and date required');
                await setDue(param1, param2);
                break;
            case 'archive-card':
                if (!param1) error('Card ID required');
                await archiveCard(param1);
                break;
            case 'search':
                if (!param1) error('Search query required');
                await search(param1);
                break;
            default:
                error(`Unknown command: ${command}`);
        }
    } catch (e) {
        error(e.message);
    }
}

main();
