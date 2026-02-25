#!/bin/bash
# Web Fetch - Fetch and parse web content
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: fetch.sh <url> [options]

Options:
  --markdown    Output as markdown
  --json        Output as JSON
  --text        Plain text output (default)
  --timeout N   Timeout in seconds (default: 30)
  --user-agent  Custom user agent string
  -h, --help    Show this help

Examples:
  fetch.sh "https://example.com"
  fetch.sh "https://example.com" --markdown
  fetch.sh "https://example.com" --json
EOF
    exit 2
}

# Default values
URL=""
FORMAT="text"
TIMEOUT=30
USER_AGENT="Mozilla/5.0 (compatible; PopeBot/1.0)"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --markdown)
            FORMAT="markdown"
            ;;
        --json)
            FORMAT="json"
            ;;
        --text)
            FORMAT="text"
            ;;
        --timeout)
            shift
            TIMEOUT="$1"
            ;;
        --user-agent)
            shift
            USER_AGENT="$1"
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

# Fetch content with curl
CONTENT=$(curl -sL --connect-timeout "$TIMEOUT" --max-time "$TIMEOUT" \
    -H "User-Agent: $USER_AGENT" \
    "$URL")

if [[ -z "$CONTENT" ]]; then
    echo "Error: Failed to fetch content" >&2
    exit 1
fi

case "$FORMAT" in
    text)
        # Extract text using Python
        python3 << PYEOF
import sys
import re
from html.parser import HTMLParser

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.skip = False
        
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'head', 'meta', 'link'):
            self.skip = True
            
    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'head', 'meta', 'link'):
            self.skip = False
        if tag in ('p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'br'):
            self.text.append('\n')
            
    def handle_data(self, data):
        if not self.skip:
            text = data.strip()
            if text:
                self.text.append(text)

html = """$CONTENT"""
parser = TextExtractor()
parser.feed(html)
result = ' '.join(parser.text)
# Clean up whitespace
result = re.sub(r'\s+', ' ', result)
result = re.sub(r'\n\s*\n', '\n\n', result)
print(result.strip())
PYEOF
        ;;
        
    markdown)
        # Convert to markdown using Python
        python3 << PYEOF
import sys
import re

def html_to_markdown(html):
    # Title
    html = re.sub(r'<h1[^>]*>(.*?)</h1>', r'# \1\n', html, flags=re.DOTALL)
    html = re.sub(r'<h2[^>]*>(.*?)</h2>', r'## \1\n', html, flags=re.DOTALL)
    html = re.sub(r'<h3[^>]*>(.*?)</h3>', r'### \1\n', html, flags=re.DOTALL)
    html = re.sub(r'<h4[^>]*>(.*?)</h4>', r'#### \1\n', html, flags=re.DOTALL)
    html = re.sub(r'<h5[^>]*>(.*?)</h5>', r'##### \1\n', html, flags=re.DOTALL)
    html = re.sub(r'<h6[^>]*>(.*?)</h6>', r'###### \1\n', html, flags=re.DOTALL)
    
    # Bold and italic
    html = re.sub(r'<(strong|b)>(.*?)</(strong|b)>', r'**\2**', html, flags=re.DOTALL)
    html = re.sub(r'<(em|i)>(.*?)</(em|i)>', r'*\2*', html, flags=re.DOTALL)
    
    # Links
    html = re.sub(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', r'[\2](\1)', html, flags=re.DOTALL)
    
    # Lists
    html = re.sub(r'<li[^>]*>(.*?)</li>', r'- \1\n', html, flags=re.DOTALL)
    
    # Paragraphs and divs
    html = re.sub(r'<p[^>]*>(.*?)</p>', r'\1\n\n', html, flags=re.DOTALL)
    html = re.sub(r'<div[^>]*>(.*?)</div>', r'\1\n', html, flags=re.DOTALL)
    html = re.sub(r'<br\s*/?>', r'\n', html)
    
    # Code
    html = re.sub(r'<code[^>]*>(.*?)</code>', r'`\1`', html, flags=re.DOTALL)
    html = re.sub(r'<pre[^>]*>(.*?)</pre>', r'```\n\1\n```\n', html, flags=re.DOTALL)
    
    # Remove remaining tags
    html = re.sub(r'<[^>]+>', '', html)
    
    # Clean up whitespace
    html = re.sub(r'\n\s*\n\s*\n', '\n\n', html)
    html = re.sub(r'^\s+', '', html, flags=re.MULTILINE)
    
    return html.strip()

content = """$CONTENT"""
# Remove script and style content
content = re.sub(r'<script[^>]*>.*?</script>', '', content, flags=re.DOTALL)
content = re.sub(r'<style[^>]*>.*?</style>', '', content, flags=re.DOTALL)

print(html_to_markdown(content))
PYEOF
        ;;
        
    json)
        # Extract structured data
        python3 << PYEOF
import sys
import json
import re
from html.parser import HTMLParser

class MetadataExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.data = {
            'title': '',
            'description': '',
            'keywords': [],
            'og': {},
            'twitter': {},
            'links': [],
            'images': [],
            'text': ''
        }
        self.in_title = False
        self.text_parts = []
        self.skip = False
        
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == 'title':
            self.in_title = True
        elif tag == 'meta':
            name = attrs_dict.get('name', attrs_dict.get('property', ''))
            content = attrs_dict.get('content', '')
            if name == 'description':
                self.data['description'] = content
            elif name == 'keywords':
                self.data['keywords'] = [k.strip() for k in content.split(',')]
            elif name.startswith('og:'):
                self.data['og'][name[3:]] = content
            elif name.startswith('twitter:'):
                self.data['twitter'][name[8:]] = content
        elif tag == 'a':
            href = attrs_dict.get('href', '')
            if href and not href.startswith('#'):
                self.data['links'].append(href)
        elif tag == 'img':
            src = attrs_dict.get('src', '')
            if src:
                self.data['images'].append(src)
        elif tag in ('script', 'style', 'head'):
            self.skip = True
            
    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if tag in ('script', 'style', 'head'):
            self.skip = False
            
    def handle_data(self, data):
        if self.in_title:
            self.data['title'] += data
        if not self.skip:
            text = data.strip()
            if text:
                self.text_parts.append(text)

html = """$CONTENT"""
parser = MetadataExtractor()
parser.feed(html)
parser.data['text'] = ' '.join(parser.text_parts)[:5000]
parser.data['links'] = parser.data['links'][:50]
parser.data['images'] = parser.data['images'][:50]

print(json.dumps(parser.data, indent=2))
PYEOF
        ;;
esac