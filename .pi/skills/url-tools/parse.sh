#!/bin/bash
# URL Parsing Tool - Parse URL components
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: parse.sh <url> [options]

Options:
  --json    Output as JSON
  -h, --help    Show this help

Examples:
  parse.sh "https://user:pass@example.com:8080/path?q=1#frag"
  parse.sh "https://example.com/path" --json
EOF
    exit 2
}

# Default values
URL=""
JSON_OUTPUT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --json)
            JSON_OUTPUT=true
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            if [[ -z "$URL" ]]; then
                URL="$1"
            fi
            ;;
    esac
    shift
done

if [[ -z "$URL" ]]; then
    echo "Error: URL required" >&2
    usage
fi

# Parse URL with Node.js
node -e "
const url = '$URL';
const json_output = $JSON_OUTPUT;

try {
    const parsed = new URL(url);
    
    const result = {
        scheme: parsed.protocol.replace(':', ''),
        netloc: parsed.host,
        path: parsed.pathname,
        params: '',
        query: parsed.search.replace('?', ''),
        fragment: parsed.hash.replace('#', ''),
        username: parsed.username,
        password: parsed.password,
        hostname: parsed.hostname,
        port: parsed.port || null
    };
    
    // Parse query string into object
    if (parsed.search) {
        const params = new URLSearchParams(parsed.search);
        result.query_params = {};
        params.forEach((value, key) => {
            result.query_params[key] = value;
        });
    }
    
    if (json_output) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log('URL:', url);
        console.log('Scheme:', result.scheme || '(none)');
        console.log('Host:', result.hostname || '(none)');
        if (result.port) console.log('Port:', result.port);
        if (result.username) console.log('Username:', result.username);
        if (result.password) console.log('Password:', result.password);
        console.log('Path:', result.path || '/');
        if (result.query) console.log('Query:', result.query);
        if (result.fragment) console.log('Fragment:', result.fragment);
    }
} catch (e) {
    console.error('Error parsing URL:', e.message);
    process.exit(1);
}
"