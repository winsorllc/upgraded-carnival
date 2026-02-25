#!/bin/bash
# Test: URL Tools Skill

echo "=== Testing URL Tools Skill ==="

# Test 1: URL parsing with node
echo "Test 1: URL parsing..."
parsed=$(node -e "
const url = require('url');
const u = new URL('https://user:pass@example.com:8080/path?query=value#fragment');
console.log(JSON.stringify({
  protocol: u.protocol,
  host: u.host,
  hostname: u.hostname,
  port: u.port,
  pathname: u.pathname,
  query: u.search
}));
")
if echo "$parsed" | grep -q "example.com"; then
    echo "PASS: URL parsed correctly"
else
    echo "FAIL"
    exit 1
fi

# Test 2: URL encoding
echo ""
echo "Test 2: URL encoding..."
encoded=$(node -e "console.log(encodeURIComponent('hello world'))")
if [ "$encoded" = "hello%20world" ]; then
    echo "PASS: URL encoded: $encoded"
else
    echo "FAIL: Got $encoded"
    exit 1
fi

# Test 3: URL decoding
echo ""
echo "Test 3: URL decoding..."
decoded=$(node -e "console.log(decodeURIComponent('hello%20world'))")
if [ "$decoded" = "hello world" ]; then
    echo "PASS: URL decoded: $decoded"
else
    echo "FAIL"
    exit 1
fi

# Test 4: Query string parsing
echo ""
echo "Test 4: Query string parsing..."
query=$(node -e "
const url = require('url');
const u = new URL('https://example.com?a=1&b=2');
const params = {};
u.searchParams.forEach((v,k) => params[k] = v);
console.log(JSON.stringify(params));
")
if echo "$query" | grep -q '"a":"1"'; then
    echo "PASS: Query parsed: $query"
else
    echo "FAIL"
    exit 1
fi

# Test 5: Base64 encoding
echo ""
echo "Test 5: Base64 encoding..."
encoded=$(node -e "console.log(Buffer.from('test string').toString('base64'))")
if [ "$encoded" = "dGVzdCBzdHJpbmc=" ]; then
    echo "PASS: Base64 encoded: $encoded"
else
    echo "FAIL"
    exit 1
fi

# Test 6: Base64 decoding
echo ""
echo "Test 6: Base64 decoding..."
decoded=$(node -e "console.log(Buffer.from('dGVzdCBzdHJpbmc=', 'base64').toString())")
if [ "$decoded" = "test string" ]; then
    echo "PASS: Base64 decoded: $decoded"
else
    echo "FAIL"
    exit 1
fi

# Test 7: SHA-256 hash
echo ""
echo "Test 7: SHA-256 hash..."
hash=$(node -e "
const crypto = require('crypto');
const h = crypto.createHash('sha256').update('test').digest('hex');
console.log(h);
")
if [ ${#hash} -eq 64 ]; then
    echo "PASS: SHA-256 hash generated"
else
    echo "FAIL"
    exit 1
fi

# Test 8: Generate random bytes
echo ""
echo "Test 8: Generate random bytes..."
random=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
if [ ${#random} -eq 32 ]; then
    echo "PASS: Random bytes generated"
else
    echo "FAIL"
    exit 1
fi

# Test 9: JSON stringification
echo ""
echo "Test 9: JSON operations..."
json_str='{"key":"value"}'
parsed_json=$(node -e "console.log(JSON.parse('$json_str').key)")
if [ "$parsed_json" = "value" ]; then
    echo "PASS: JSON parsed"
else
    echo "FAIL"
    exit 1
fi

echo ""
echo "=== All URL Tools Tests PASSED ==="
