/**
 * Trello Operations Skill
 * Manage Trello boards, lists, and cards via REST API
 */

const axios = require('axios');

const BASE_URL = 'https://api.trello.com/1';

function getAuthParams() {
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  
  if (!apiKey || !token) {
    throw new Error('TRELLO_API_KEY and TRELLO_TOKEN environment variables must be set');
  }
  
  return { key: apiKey, token };
}

async function request(method, path, data = {}) {
  const params = getAuthParams();
  const url = `${BASE_URL}${path}`;
  
  const config = {
    method,
    url,
    params: method === 'GET' ? { ...params, ...data } : params,
    data: method !== 'GET' ? { ...params, ...data } : undefined,
    timeout: 10000
  };

  const response = await axios(config);
  return response.data;
}

// Boards
async function listBoards() {
  return request('GET', '/members/me/boards', { fields: 'name,id,desc' });
}

async function getBoard(boardId) {
  return request('GET', `/boards/${boardId}`, { lists: 'open', cards: 'open' });
}

// Lists
async function getLists(boardId) {
  return request('GET', `/boards/${boardId}/lists`);
}

async function createList(boardId, name) {
  return request('POST', '/lists', { idBoard: boardId, name });
}

// Cards
async function getCards(listId) {
  return request('GET', `/lists/${listId}/cards`);
}

async function getCard(cardId) {
  return request('GET', `/cards/${cardId}`, { actions: 'commentCard' });
}

async function createCard({ idList, name, desc = '', idLabels = [], pos = 'bottom' }) {
  return request('POST', '/cards', { idList, name, desc, idLabels, pos });
}

async function moveCard(cardId, idList, pos = 'top') {
  return request('PUT', `/cards/${cardId}`, { idList, pos });
}

async function archiveCard(cardId) {
  return request('PUT', `/cards/${cardId}`, { closed: true });
}

async function unarchiveCard(cardId) {
  return request('PUT', `/cards/${cardId}`, { closed: false });
}

async function updateCard(cardId, updates) {
  return request('PUT', `/cards/${cardId}`, updates);
}

// Comments
async function addComment(cardId, text) {
  return request('POST', `/cards/${cardId}/actions/comments`, { text });
}

async function getComments(cardId) {
  return request('GET', `/cards/${cardId}/actions`, { filter: 'commentCard' });
}

// Labels
async function getLabels(boardId) {
  return request('GET', `/boards/${boardId}/labels`);
}

async function getCardsByLabel(labelId) {
  return request('GET', `/labels/${labelId}/cards`);
}

// Search helpers
async function findBoardByName(name) {
  const boards = await listBoards();
  return boards.find(b => b.name.toLowerCase().includes(name.toLowerCase()));
}

async function findListByName(boardId, name) {
  const lists = await getLists(boardId);
  return lists.find(l => l.name.toLowerCase().includes(name.toLowerCase()));
}

module.exports = {
  listBoards,
  getBoard,
  getLists,
  createList,
  getCards,
  getCard,
  createCard,
  moveCard,
  archiveCard,
  unarchiveCard,
  updateCard,
  addComment,
  getComments,
  getLabels,
  getCardsByLabel,
  findBoardByName,
  findListByName
};
