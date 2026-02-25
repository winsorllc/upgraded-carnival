---
name: url-tools
description: "URL manipulation and HTTP operations. Use when: user needs to encode/decode URLs, check HTTP headers, test APIs, or perform advanced curl operations."
---

# URL Tools Skill

URL manipulation and HTTP request tools.

## When to Use

- Encode or decode URL components
- Check HTTP headers
- Test API endpoints
- Download files
- Debug HTTP issues

## URL Encoding

### Encode URL
```bash
# Encode a string for URL use
python3 -c "import urllib.parse; print(urllib.parse.quote('hello world'))"
# Output: hello%20world
```

### Decode URL
```bash
# Decode URL-encoded string
python3 -c "import urllib.parse; print(urllib.parse.unquote('hello%20world'))"
# Output: hello world
```

## HTTP Operations

### Check Headers
```bash
# Get response headers
curl -I https://example.com

# Get specific header
curl -sI https://example.com | grep -i content-type
```

### Test API
```bash
# GET request
curl -s https://api.example.com/data

# POST request
curl -s -X POST https://api.example.com/data \
  -H "Content-Type: application/json" \
  -d '{"key":"value"}'

# With authentication
curl -s https://api.example.com/protected \
  -H "Authorization: Bearer TOKEN"
```

### Download File
```bash
# Download with progress
curl -L -O https://example.com/file.zip

# Resume download
curl -L -C - -O https://example.com/large-file.zip
```

### Debug Request
```bash
# Verbose output
curl -v https://example.com

# Show only headers
curl -sI https://example.com

# Timing
curl -w "@/dev/stdin" -s -o /dev/null https://example.com <<'EOF'
time_namelookup:  %{time_namelookup}
time_connect:     %{time_connect}
time_starttransfer: %{time_starttransfer}
time_total:       %{time_total}
EOF
```

## URL Parsing

### Extract Parts
```bash
# Using Python
python3 -c "
from urllib.parse import urlparse
url = 'https://user:pass@example.com:8080/path?query=value#frag'
p = urlparse(url)
print(f'scheme: {p.scheme}')
print(f'netloc: {p.netloc}')
print(f'host: {p.hostname}')
print(f'port: {p.port}')
print(f'path: {p.path}')
print(f'query: {p.query}')
"
```

## Common curl Flags

| Flag | Description |
|------|-------------|
| `-s` | Silent/quiet |
| `-S` | Show errors |
| `-v` | Verbose |
| `-I` | Headers only |
| `-L` | Follow redirects |
| `-O` | Output to file |
| `-X` | HTTP method |
| `-H` | Add header |
| `-d` | POST data |
| `-b` | Cookies |
| `-c` | Cookie jar |

## Examples

**Check if site is up:**
```bash
curl -s -o /dev/null -w "%{http_code}" https://example.com
```

**Get JSON and format:**
```bash
curl -s https://api.example.com/data | python3 -m json.tool
```

**Test webhook:**
```bash
curl -s -X POST https://webhook.example.com/hook \
  -H "Content-Type: application/json" \
  -d '{"event":"test","timestamp":"'"$(date -Iseconds)"'"}'
```
