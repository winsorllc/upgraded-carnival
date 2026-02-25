---
name: db-tool
description: Query and manage databases (SQLite, PostgreSQL, MySQL). Execute queries, explore schemas, and manage data.
---

# DB Tool

Query and manage databases including SQLite, PostgreSQL, and MySQL. Execute queries, explore schemas, and manage data.

## Setup

Database connection is configured via environment variables or command line options:
- `DATABASE_URL` - Full connection string
- `DB_TYPE` - sqlite, postgres, or mysql

## Usage

### Query SQLite

```bash
{baseDir}/db-tool.js --query "SELECT * FROM users LIMIT 10"
```

### List Tables

```bash
{baseDir}/db-tool.js --tables
```

### Describe Table

```bash
{baseDir}/db-tool.js --describe "users"
```

### Execute SQL

```bash
{baseDir}/db-tool.js --execute "UPDATE users SET active = 1 WHERE id = 5"
```

## Options

| Option | Description | Required |
|--------|-------------|----------|
| `--query` | Execute SELECT query | No |
| `--execute` | Execute INSERT/UPDATE/DELETE | No |
| `--tables` | List all tables | No |
| `--describe` | Show table schema | No |
| `--database` | Database file or connection string | No |
| `--type` | Database type: sqlite, postgres, mysql | No |

## When to Use

- Querying databases for debugging
- Data exploration and analysis
- Running migrations
- Database administration tasks
