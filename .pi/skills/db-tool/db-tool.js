#!/usr/bin/env node

/**
 * DB Tool - Query and manage databases
 * 
 * Usage:
 *   db-tool.js --query "SELECT * FROM users LIMIT 10"
 *   db-tool.js --tables
 *   db-tool.js --describe "users"
 *   db-tool.js --execute "UPDATE users SET active = 1"
 */

const fs = require('fs');
const path = require('path');

// Simple in-memory SQLite implementation for basic queries
class SimpleSQLite {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.data = {};
  }
  
  // Simple table listing (mock)
  getTables() {
    return {
      message: 'Use --database to specify SQLite file. Use npm install better-sqlite3 for full support.'
    };
  }
  
  // Simple query parser
  parseQuery(sql) {
    sql = sql.trim().toLowerCase();
    
    if (sql.startsWith('select')) {
      return { type: 'select', query: sql };
    } else if (sql.startsWith('insert')) {
      return { type: 'insert', query: sql };
    } else if (sql.startsWith('update')) {
      return { type: 'update', query: sql };
    } else if (sql.startsWith('delete')) {
      return { type: 'delete', query: sql };
    } else if (sql.startsWith('create')) {
      return { type: 'create', query: sql };
    } else if (sql.startsWith('drop')) {
      return { type: 'drop', query: sql };
    } else if (sql.startsWith('alter')) {
      return { type: 'alter', query: sql };
    }
    
    return { type: 'unknown', query: sql };
  }
  
  // Execute query - note: requires better-sqlite3 for actual execution
  execute(sql) {
    // Try to load better-sqlite3 if available
    try {
      const Database = require('better-sqlite3');
      const db = new Database(this.dbPath);
      
      const result = db.exec(sql);
      db.close();
      
      return { success: true, result };
    } catch (e) {
      // better-sqlite3 not available
      const parsed = this.parseQuery(sql);
      
      return {
        success: false,
        error: e.message,
        note: 'For full database support, install: npm install better-sqlite3',
        parsed: parsed
      };
    }
  }
  
  // Run a prepared statement
  run(sql, params = []) {
    try {
      const Database = require('better-sqlite3');
      const db = new Database(this.dbPath);
      
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      db.close();
      
      return { success: true, changes: result.changes, lastInsertRowid: result.lastInsertRowid };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  
  // Run a select query
  all(sql, params = []) {
    try {
      const Database = require('better-sqlite3');
      const db = new Database(this.dbPath);
      
      const stmt = db.prepare(sql);
      const rows = params.length > 0 ? stmt.all(...params) : stmt.all();
      db.close();
      
      return { success: true, rows, count: rows.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  
  // Get table schema
  describe(table) {
    try {
      const Database = require('better-sqlite3');
      const db = new Database(this.dbPath);
      
      const stmt = db.prepare(`PRAGMA table_info(${table})`);
      const rows = stmt.all();
      db.close();
      
      return {
        success: true,
        table,
        columns: rows.map(r => ({
          name: r.name,
          type: r.type,
          notnull: r.notnull === 1,
          dflt_value: r.dflt_value,
          pk: r.pk === 1
        }))
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

// PostgreSQL helper (requires pg package)
class PostgresTool {
  constructor(connectionString) {
    this.connectionString = connectionString;
  }
  
  async query(sql) {
    try {
      const { Client } = require('pg');
      const client = new Client(this.connectionString);
      
      await client.connect();
      const result = await client.query(sql);
      await client.end();
      
      return {
        success: true,
        rows: result.rows,
        count: result.rowCount,
        fields: result.fields.map(f => f.name)
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  
  async tables() {
    return this.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
  }
  
  async describe(table) {
    return this.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = '${table}'
    `);
  }
}

// MySQL helper (requires mysql2 package)
class MySQLTool {
  constructor(connectionString) {
    this.connectionString = connectionString;
  }
  
  async query(sql) {
    try {
      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection(this.connectionString);
      
      const [rows, fields] = await connection.execute(sql);
      await connection.end();
      
      return {
        success: true,
        rows: Array.isArray(rows) ? rows : [rows],
        count: Array.isArray(rows) ? rows.length : 1,
        fields: fields ? fields.map(f => f.name) : []
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  
  async tables() {
    return this.query('SHOW TABLES');
  }
  
  async describe(table) {
    return this.query(`DESCRIBE ${table}`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  query: null,
  execute: null,
  tables: false,
  describe: null,
  database: null,
  type: null
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const nextArg = args[i + 1];
  
  switch (arg) {
    case '--query':
      options.query = nextArg;
      i++;
      break;
    case '--execute':
      options.execute = nextArg;
      i++;
      break;
    case '--tables':
      options.tables = true;
      break;
    case '--describe':
      options.describe = nextArg;
      i++;
      break;
    case '--database':
      options.database = nextArg;
      i++;
      break;
    case '--type':
      options.type = nextArg;
      i++;
      break;
    case '--help':
    case '-h':
      console.log(`
DB Tool - Query and manage databases

Usage:
  db-tool.js --query "SELECT * FROM users LIMIT 10"
  db-tool.js --tables
  db-tool.js --describe "users"
  db-tool.js --execute "UPDATE users SET active = 1"

Options:
  --query <sql>      Execute SELECT query
  --execute <sql>    Execute INSERT/UPDATE/DELETE
  --tables           List all tables
  --describe <table> Show table schema
  --database <path>  Database file or connection string
  --type <type>      Database type: sqlite, postgres, mysql

Environment Variables:
  DATABASE_URL       Full connection string
  DB_TYPE           sqlite, postgres, or mysql

Examples:
  db-tool.js --database ./data.db --query "SELECT * FROM users"
  db-tool.js --database postgres://user:pass@localhost/db --tables
  db-tool.js --type sqlite --database test.db --describe users
      `.trim());
      process.exit(0);
  }
}

// Determine database type and connection
function getDB() {
  const dbType = options.type || process.env.DB_TYPE || 'sqlite';
  const database = options.database || process.env.DATABASE_URL;
  
  if (dbType === 'sqlite' || !database.startsWith('postgres') && !database.startsWith('mysql')) {
    // Default to SQLite
    const dbPath = database || './database.sqlite';
    return new SimpleSQLite(dbPath), 'sqlite';
  } else if (dbType === 'postgres' || database.startsWith('postgres')) {
    return new PostgresTool(database), 'postgres';
  } else if (dbType === 'mysql' || database.startsWith('mysql')) {
    return new MySQLTool(database), 'mysql';
  }
  
  return new SimpleSQLite('./database.sqlite'), 'sqlite';
}

// Main execution
async function main() {
  try {
    const db = getDB()[0];
    const dbType = getDB()[1];
    
    let result;
    
    if (options.query) {
      if (dbType === 'sqlite') {
        result = db.all(options.query);
      } else {
        result = await db.query(options.query);
      }
      console.log(JSON.stringify(result, null, 2));
    } else if (options.execute) {
      if (dbType === 'sqlite') {
        result = db.run(options.execute);
      } else {
        result = await db.query(options.execute);
      }
      console.log(JSON.stringify(result, null, 2));
    } else if (options.tables) {
      if (dbType === 'sqlite') {
        result = db.getTables();
        // Try to get actual tables using better-sqlite3 if available
        try {
          const Database = require('better-sqlite3');
          const sqliteDb = new Database(options.database || './database.sqlite');
          const tables = sqliteDb.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
          `).all();
          sqliteDb.close();
          result = { success: true, tables: tables.map(t => t.name) };
        } catch (e) {
          result = { success: true, tables: [], note: 'Install better-sqlite3 for full support' };
        }
      } else {
        result = await db.tables();
      }
      console.log(JSON.stringify(result, null, 2));
    } else if (options.describe) {
      if (dbType === 'sqlite') {
        result = db.describe(options.describe);
      } else {
        result = await db.describe(options.describe);
      }
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('Use --help for usage information');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
