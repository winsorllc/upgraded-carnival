---
name: database-tools
description: "Database operations for SQLite and PostgreSQL. Use when: user needs to query databases, run migrations, backup data, or perform admin tasks."
---

# Database Tools Skill

Database operations for SQLite and PostgreSQL.

## When to Use

- Query databases
- Run migrations
- Backup and restore
- Check database health
- Analyze queries

## SQLite Operations

### Connect & Query
```bash
# Connect to database
sqlite3 my.db

# List tables
sqlite3 my.db ".tables"

# Schema of table
sqlite3 my.db ".schema users"

# List indexes
sqlite3 my.db ".indexes"
```

### Query Examples
```bash
# Select all from table
sqlite3 my.db "SELECT * FROM users;"

# Select with where
sqlite3 my.db "SELECT * FROM users WHERE id = 1;"

# Count rows
sqlite3 my.db "SELECT COUNT(*) FROM users;"

# Insert row
sqlite3 my.db "INSERT INTO users (name, email) VALUES ('John', 'john@example.com');"

# Update row
sqlite3 my.db "UPDATE users SET name = 'Jane' WHERE id = 1;"

# Delete row
sqlite3 my.db "DELETE FROM users WHERE id = 1;"
```

### Export/Import
```bash
# Export to CSV
sqlite3 my.db -header -csv "SELECT * FROM users;" > users.csv

# Import from CSV
sqlite3 my.db ".import users.csv users"

# Export schema
sqlite3 my.db ".schema" > schema.sql

# Full database dump
sqlite3 my.db ".dump" > backup.sql
```

### Vacuum & Optimize
```bash
# Check database size
ls -lh my.db

# Vacuum (reclaim space)
sqlite3 my.db "VACUUM;"

# Analyze (update statistics)
sqlite3 my.db "ANALYZE;"
```

## PostgreSQL Operations

### Connect & Query
```bash
# Connect
psql -U user -d database

# Connect to remote
psql -h hostname -U user -d database

# With password
PGPASSWORD=secret psql -U user -d database
```

### Common Commands
```bash
# List tables
\dt

# Describe table
\d users

# List indexes
\di

# List sequences
\ds

# List views
\dv

# Quit
\q
```

### Query Examples
```bash
# Select all
SELECT * FROM users;

# Select with limit
SELECT * FROM users LIMIT 10;

# Join example
SELECT u.name, o.total FROM users u 
  JOIN orders o ON u.id = o.user_id;

# Aggregate
SELECT status, COUNT(*) FROM orders GROUP BY status;

# Subquery
SELECT * FROM users WHERE id IN (
  SELECT user_id FROM orders WHERE total > 100
);
```

### User Management
```bash
# Create user
CREATE USER newuser WITH PASSWORD 'secret';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE mydb TO newuser;

# Grant table access
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO newuser;

# Revoke access
REVOKE ALL PRIVILEGES ON DATABASE mydb FROM newuser;
```

### Backup & Restore

```bash
# Dump single database
pg_dump -U user database > backup.sql

# Dump with compression
pg_dump -U user database | gzip > backup.sql.gz

# Restore
psql -U user database < backup.sql

# Restore from gzipped
gunzip -c backup.sql.gz | psql -U user database

# Dump all databases
pg_dumpall -U user > all_databases.sql
```

## Migration Examples

### Create Table Migration
```sql
-- migrations/001_create_users.sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### Add Column Migration
```sql
-- migrations/002_add_status.sql
ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';

-- Rollback
ALTER TABLE users DROP COLUMN status;
```

### Rename/Migrate
```sql
-- Rename table
ALTER TABLE users RENAME TO accounts;

-- Rename column
ALTER TABLE users RENAME COLUMN name TO full_name;
```

## Performance Analysis

### Explain Queries
```sql
-- Explain query plan
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- Explain without running
EXPLAIN SELECT * FROM users;
```

### Find Slow Queries
```bash
# PostgreSQL: Enable slow query log
# In postgresql.conf:
# log_min_duration_statement = 1000

# View logs
tail -f /var/log/postgresql/postgresql.log

# Using pg_stat_statements
SELECT query, calls, mean_time, total_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
```

### Index Recommendations
```sql
-- Find missing indexes from queries
SELECT 
    schemaname,
    relname,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_scan DESC;
```

## Database Health Check

### SQLite Health
```bash
#!/bin/bash
# SQLite health check
DB="$1"

echo "=== SQLite Health Check ==="
echo "Database: $DB"
echo ""

echo "Size:"
ls -lh "$DB"
echo ""

echo "Table count:"
sqlite3 "$DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';"
echo ""

echo "Index count:"
sqlite3 "$DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='index';"
echo ""

echo "Integrity check:"
sqlite3 "$DB" "PRAGMA integrity_check;"
```

### PostgreSQL Health
```bash
#!/bin/bash
# PostgreSQL health check

echo "=== PostgreSQL Health ==="
echo ""

echo "Database size:"
psql -U user -d db -c "SELECT pg_database_size(current_database());"

echo "Table sizes:"
psql -U user -d db -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 5;"

echo "Active connections:"
psql -U user -d db -c "SELECT count(*) FROM pg_stat_activity;"

echo "Long running queries:"
psql -U user -d db -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' AND query NOT ILIKE '%pg_stat_activity%' ORDER BY duration DESC LIMIT 5;"
```

## Notes

- Always backup before migrations
- Use transactions for multi-step changes
- Test migrations on staging first
- Use parameterized queries to prevent SQL injection
- Thepopebot stores data in SQLite at `data/thepopebot.sqlite`
