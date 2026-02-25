---
name: http-request
description: "Make HTTP requests with enhanced output. GET, POST, PUT, DELETE with JSON handling, authentication, and custom headers. No API key required for basic use."
---

# HTTP Request Skill

Make HTTP requests with enhanced output and JSON handling.

## When to Use

✅ **USE this skill when:**

- "Make a GET request to..."
- "POST this JSON to..."
- "Call this API endpoint"
- "Download data from URL"
- "Test an API"

## When NOT to Use

❌ **DON'T use this skill when:**

- Simple file downloads → use web-fetch/download.sh
- Browser automation → use browser-tools
- Web scraping → use web-fetch

## Commands

### GET Request

```bash
{baseDir}/request.sh GET "https://api.example.com/data"
{baseDir}/request.sh GET "https://api.example.com/data" --json
{baseDir}/request.sh GET "https://api.example.com/data" --header "Authorization: Bearer token"
```

### POST Request

```bash
{baseDir}/request.sh POST "https://api.example.com/create" --data '{"name": "test"}'
{baseDir}/request.sh POST "https://api.example.com/create" --file data.json
{baseDir}/request.sh POST "https://api.example.com/upload" --form "file=@upload.txt"
```

### PUT/PATCH/DELETE

```bash
{baseDir}/request.sh PUT "https://api.example.com/update/1" --data '{"name": "updated"}'
{baseDir}/request.sh PATCH "https://api.example.com/patch/1" --data '{"status": "active"}'
{baseDir}/request.sh DELETE "https://api.example.com/delete/1"
```

### With Authentication

```bash
{baseDir}/request.sh GET "https://api.example.com/private" --auth bearer:TOKEN
{baseDir}/request.sh GET "https://api.example.com/private" --auth basic:user:pass
{baseDir}/request.sh GET "https://api.example.com/private" --header "X-API-Key: secret"
```

### Custom Options

```bash
{baseDir}/request.sh GET "https://api.example.com" --timeout 60
{baseDir}/request.sh GET "https://api.example.com" --follow --max-redirects 5
{baseDir}/request.sh GET "https://api.example.com" --verbose
```

## Options

- `--data <json>`: Request body (JSON string)
- `--file <path>`: Read request body from file
- `--form <data>`: Form data or file upload (@filename)
- `--header <header>`: Custom header (can be repeated)
- `--auth <type:credentials>`: Authentication (bearer:TOKEN or basic:user:pass)
- `--timeout <sec>`: Request timeout (default: 30)
- `--json`: Format JSON response
- `--verbose`: Show request details
- `--follow`: Follow redirects
- `--max-redirects <n>`: Max redirects (default: 5)
- `--out <file>`: Save response to file

## Examples

**Get JSON and format:**
```bash
{baseDir}/request.sh GET "https://jsonplaceholder.typicode.com/users" --json
```

**POST data:**
```bash
{baseDir}/request.sh POST "https://api.example.com/users" \
  --data '{"name": "John", "email": "john@example.com"}' \
  --json
```

**With Bearer token:**
```bash
{baseDir}/request.sh GET "https://api.example.com/protected" \
  --auth bearer:your_token_here
```

**Upload file:**
```bash
{baseDir}/request.sh POST "https://api.example.com/upload" \
  --form "file=@document.pdf"
```

## Notes

- Automatically adds Content-Type: application/json for JSON data
- Handles response body parsing
- Shows response headers with --verbose
- Supports multipart form data uploads