#!/usr/bin/env node
/**
 * Code Intelligence Test Suite
 * Tests all functionality of the code-intelligence skill
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEST_DIR = '/tmp/code-intelligence-test';
const DB_PATH = path.join(TEST_DIR, '.code-intelligence', 'index.db');

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

let testsPassed = 0;
let testsFailed = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createTestFiles() {
  log('\n📝 Creating test files...', 'blue');
  
  // Clean up
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
  
  fs.mkdirSync(TEST_DIR, { recursive: true });
  
  // Create auth.js - authentication utilities
  fs.writeFileSync(path.join(TEST_DIR, 'auth.js'), `
// Authentication utilities

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

/**
 * Verify a JWT token
 * @param {string} token 
 * @returns {boolean}
 */
function verifyToken(token) {
  if (!token) return false;
  return token.startsWith('Bearer ');
}

/**
 * Hash a password
 * @param {string} password 
 * @returns {string}
 */
async function hashPassword(password) {
  return Buffer.from(password).toString('base64');
}

/**
 * Check if user is authenticated
 * @param {object} req 
 * @returns {boolean}
 */
function isAuthenticated(req) {
  return verifyToken(req.headers?.authorization);
}

module.exports = {
  verifyToken,
  hashPassword,
  isAuthenticated,
  JWT_SECRET
};
`);

  // Create database.js - database connection
  fs.writeFileSync(path.join(TEST_DIR, 'database.js'), `
// Database connection module
const auth = require('./auth');

let connection = null;

/**
 * Connect to database
 * @returns {Promise<object>}
 */
async function connectToDatabase() {
  if (connection) return connection;
  
  connection = {
    query: (sql) => Promise.resolve([]),
    close: () => Promise.resolve()
  };
  
  return connection;
}

/**
 * Execute a query with authentication check
 * @param {string} sql 
 * @param {object} req 
 * @returns {Promise<any>}
 */
async function executeQuery(sql, req) {
  if (!auth.isAuthenticated(req)) {
    throw new Error('Not authenticated');
  }
  const db = await connectToDatabase();
  return db.query(sql);
}

class DatabaseManager {
  constructor() {
    this.pools = new Map();
  }
  
  addPool(name, config) {
    this.pools.set(name, config);
  }
  
  getPool(name) {
    return this.pools.get(name);
  }
}

module.exports = {
  connectToDatabase,
  executeQuery,
  DatabaseManager
};
`);

  // Create api.js - API routes
  fs.writeFileSync(path.join(TEST_DIR, 'api.js'), `
// API routes
const db = require('./database');
const auth = require('./auth');

/**
 * Handle login request
 * @param {object} req 
 * @param {object} res 
 */
async function handleLogin(req, res) {
  const { username, password } = req.body;
  const hashed = await auth.hashPassword(password);
  // ... login logic
  res.json({ success: true });
}

/**
 * Get user data
 * @param {object} req 
 * @param {object} res 
 */
async function getUser(req, res) {
  const data = await db.executeQuery('SELECT * FROM users', req);
  res.json(data);
}

class APIRouter {
  routes = new Map();
  
  register(path, handler) {
    this.routes.set(path, handler);
  }
  
  handle(path, req, res) {
    const handler = this.routes.get(path);
    if (handler) {
      handler(req, res);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  }
}

module.exports = {
  handleLogin,
  getUser,
  APIRouter
};
`);

  // Create utils.js - utility functions
  fs.writeFileSync(path.join(TEST_DIR, 'utils.js'), `
// Utility functions

/**
 * Format a date
 * @param {Date} date 
 * @returns {string}
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Generate a random ID
 * @param {number} length 
 * @returns {string}
 */
function generateId(length = 8) {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Debounce a function
 * @param {function} fn 
 * @param {number} delay 
 * @returns {function}
 */
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

module.exports = {
  formatDate,
  generateId,
  debounce
};
`);

  // Create Python test file
  fs.writeFileSync(path.join(TEST_DIR, 'main.py'), `
# Main Python file
import asyncio
from typing import Dict, Any

class UserService:
    \"\"\"Service for user operations\"\"\"
    
    def __init__(self, db_connection):
        self.db = db_connection
        self.cache = {}
    
    async def get_user(self, user_id: str) -> Dict[str, Any]:
        \"\"\"Fetch a user by ID\"\"\"
        if user_id in self.cache:
            return self.cache[user_id]
        
        # Fetch from database
        user = await self.db.query("SELECT * FROM users WHERE id = ?", user_id)
        self.cache[user_id] = user
        return user
    
    async def create_user(self, data: Dict[str, Any]) -> str:
        \"\"\"Create a new user\"\"\"
        user_id = str(generate_id())
        await self.db.execute("INSERT INTO users VALUES (?, ?)", user_id, data)
        return user_id

def generate_id() -> int:
    \"\"\"Generate unique ID\"\"\"
    import random
    return random.randint(1000, 9999)

async def main():
    \"\"\"Main entry point\"\"\"
    service = UserService(None)
    user = await service.get_user("123")
    print(user)

if __name__ == "__main__":
    asyncio.run(main())
`);

  log('✓ Test files created', 'green');
}

function runTest(name, fn) {
  try {
    log(`\n▶ Testing: ${name}`, 'blue');
    fn();
    testsPassed++;
    log('✓ PASSED', 'green');
  } catch (err) {
    testsFailed++;
    log(`✗ FAILED: ${err.message}`, 'red');
    console.error(err);
  }
}

function testIndexing() {
  const result = execSync(
    `node "${path.join(__dirname, 'index.js')}" --scan "${TEST_DIR}" --output "${DB_PATH}" --json`,
    { encoding: 'utf-8', cwd: __dirname }
  );
  
  const data = JSON.parse(result);
  if (!data.success) {
    throw new Error('Indexing failed');
  }
  if (data.stats.files_indexed < 5) {
    throw new Error(`Expected at least 5 files, got ${data.stats.files_indexed}`);
  }
  
  log(`  Indexed ${data.stats.files_indexed} files`, 'yellow');
  log(`  Found ${data.stats.total_functions} functions`, 'yellow');
  log(`  Found ${data.stats.total_classes} classes`, 'yellow');
}

function testSearch() {
  // Test search for functions
  const result = execSync(
    `node "${path.join(__dirname, 'search.js')}" "verifyToken" --db "${DB_PATH}" --json`,
    { encoding: 'utf-8', cwd: __dirname }
  );
  
  const data = JSON.parse(result);
  if (data.results_count < 1) {
    throw new Error('Expected at least 1 result for verifyToken search');
  }
  
  const hasCorrectResult = data.results.some(r => 
    r.name === 'verifyToken' && r.type === 'function'
  );
  
  if (!hasCorrectResult) {
    throw new Error('Expected to find verifyToken function');
  }
  
  log(`  Found ${data.results_count} results`, 'yellow');
}

function testClassSearch() {
  const result = execSync(
    `node "${path.join(__dirname, 'search.js')}" "DatabaseManager" --db "${DB_PATH}" --type class --json`,
    { encoding: 'utf-8', cwd: __dirname }
  );
  
  const data = JSON.parse(result);
  if (data.results_count < 1) {
    throw new Error('Expected to find DatabaseManager class');
  }
  
  const hasClass = data.results.some(r => r.type === 'class');
  if (!hasClass) {
    throw new Error('Filter by type class failed');
  }
  
  log(`  Found ${data.results_count} classes`, 'yellow');
}

function testDependencies() {
  // Test dependency analysis
  const dbFile = path.join(TEST_DIR, 'database.js');
  const result = execSync(
    `node "${path.join(__dirname, 'deps.js')}" "${dbFile}" --imports --db "${DB_PATH}" --json`,
    { encoding: 'utf-8', cwd: __dirname }
  );
  
  const data = JSON.parse(result);
  if (!data.imports || data.imports.length === 0) {
    throw new Error('Expected to find imports for database.js');
  }
  
  const hasAuthImport = data.imports.some(i => i.path && i.path.includes('auth'));
  if (!hasAuthImport) {
    throw new Error('Expected database.js to import auth.js');
  }
  
  log(`  Found ${data.imports.length} imports`, 'yellow');
}

function testDependents() {
  // Test finding dependents
  const authFile = path.join(TEST_DIR, 'auth.js');
  const result = execSync(
    `node "${path.join(__dirname, 'deps.js')}" "${authFile}" --dependents --db "${DB_PATH}" --json`,
    { encoding: 'utf-8', cwd: __dirname }
  );
  
  const data = JSON.parse(result);
  if (!data.dependents) {
    throw new Error('Expected dependents array');
  }
  
  // database.js and api.js should depend on auth.js
  if (data.dependents.length < 1) {
    throw new Error(`Expected at least 1 dependent, got ${data.dependents.length}`);
  }
  
  log(`  Found ${data.dependents.length} dependents`, 'yellow');
}

function testImpactAnalysis() {
  // Test impact analysis on a function
  const authFile = path.join(TEST_DIR, 'auth.js');
  const result = execSync(
    `node "${path.join(__dirname, 'impact.js')}" "${authFile}" --function verifyToken --db "${DB_PATH}" --json`,
    { encoding: 'utf-8', cwd: __dirname }
  );
  
  const data = JSON.parse(result);
  if (!data.impact) {
    throw new Error('Expected impact data');
  }
  
  // verifyToken is used in auth.js (isAuthenticated) and database.js (executeQuery)
  if (data.impact.totalAffectedFiles < 1) {
    throw new Error(`Expected at least 1 affected file, got ${data.impact.totalAffectedFiles}`);
  }
  
  log(`  Risk: ${data.impact.risk}`, 'yellow');
  log(`  Affected: ${data.impact.totalAffectedFiles} files`, 'yellow');
}

function testAsk() {
  // Test Q&A
  const result = execSync(
    `node "${path.join(__dirname, 'ask.js')}" "Where is authentication handled?" --db "${DB_PATH}" --json`,
    { encoding: 'utf-8', cwd: __dirname }
  );
  
  const data = JSON.parse(result);
  if (!data.answers || data.answers.length === 0) {
    throw new Error('Expected answers from Q&A');
  }
  
  const hasAuth = data.answers.some(a => 
    a.name.toLowerCase().includes('auth') ||
    a.file.toLowerCase().includes('auth')
  );
  
  if (!hasAuth) {
    throw new Error('Expected auth-related results');
  }
  
  log(`  Found ${data.answers.length} relevant items`, 'yellow');
}

function testExtensionFilter() {
  // Test extension filter
  const result = execSync(
    `node "${path.join(__dirname, 'search.js')}" "class" --db "${DB_PATH}" --ext .py --json`,
    { encoding: 'utf-8', cwd: __dirname }
  );
  
  const data = JSON.parse(result);
  
  // Should find UserService class in Python file
  const pythonResults = data.results.filter(r => r.file.endsWith('.py'));
  if (pythonResults.length === 0) {
    throw new Error('Expected Python results with .py extension filter');
  }
  
  log(`  Found ${pythonResults.length} Python results`, 'yellow');
}

// Main test runner
async function main() {
  log('╔════════════════════════════════════════════════╗', 'blue');
  log('║     Code Intelligence Skill Test Suite         ║', 'blue');
  log('╚════════════════════════════════════════════════╝', 'blue');
  
  const startTime = Date.now();
  
  // Setup
  createTestFiles();
  
  // Install dependencies
  log('\n📦 Installing dependencies...', 'blue');
  execSync('npm install', { cwd: __dirname, stdio: 'ignore' });
  log('✓ Dependencies installed', 'green');
  
  // Run tests
  runTest('Codebase Indexing', testIndexing);
  runTest('Symbol Search', testSearch);
  runTest('Class Search with Type Filter', testClassSearch);
  runTest('Import Analysis', testDependencies);
  runTest('Dependent Analysis', testDependents);
  runTest('Impact Analysis', testImpactAnalysis);
  runTest('Extension Filter', testExtensionFilter);
  runTest('Question Answering', testAsk);
  
  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  log('\n' + '═'.repeat(50), 'blue');
  log(`  Tests Passed: ${colors.green}${testsPassed}${colors.reset}`, 'reset');
  log(`  Tests Failed: ${colors.red}${testsFailed}${colors.reset}`, 'reset');
  log(`  Duration: ${duration}s`, 'reset');
  log('═'.repeat(50), 'blue');
  
  // Cleanup
  log('\n🧹 Cleaning up...', 'blue');
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
  log('✓ Cleanup complete', 'green');
  
  // Exit with appropriate code
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Handle uncaught errors
process.on('unhandledRejection', (err) => {
  log(`\nUnhandled error: ${err.message}`, 'red');
  process.exit(1);
});

main();
