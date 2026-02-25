#!/bin/bash
# Extract metadata from web pages
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: metadata.sh <url> [options]

Options:
  --json             Output as JSON (default)
  --markdown         Output as markdown
  -h, --help         Show this help

Examples:
  metadata.sh "https://example.com"
  metadata.sh "https://example.com" --markdown
EOF
    exit 2
}

# Default values
URL=""
FORMAT="json"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --json)
            FORMAT="json"
            ;;
        --markdown)
            FORMAT="markdown"
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

# Fetch HTML
HTML=$(curl -sL -A "Mozilla/5.0 (compatible)" "$URL")

# Extract metadata
python3 << PYEOF
import sys
import json
import re
from html.parser import HTMLParser

class MetadataParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.metadata = {
            'url': '$URL',
            'title': '',
            'description': '',
            'keywords': [],
            'author': '',
            'og': {},
            'twitter': {},
            'favicon': '',
            'canonical': '',
            'alternate': []
        }
        self.in_title = False
        
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        
        if tag == 'title':
            self.in_title = True
        elif tag == 'meta':
            name = attrs_dict.get('name', attrs_dict.get('property', ''))
            content = attrs_dict.get('content', '')
            
            if name == 'description':
                self.metadata['description'] = content
            elif name == 'keywords':
                self.metadata['keywords'] = [k.strip() for k in content.split(',')]
            elif name == 'author':
                self.metadata['author'] = content
            elif name.startswith('og:'):
                self.metadata['og'][name[3:]] = content
            elif name.startswith('twitter:'):
                self.metadata['twitter'][name[8:]] = content
                
        elif tag == 'link':
            rel = attrs_dict.get('rel', '')
            href = attrs_dict.get('href', '')
            
            if 'icon' in rel:
                self.metadata['favicon'] = href
            elif 'canonical' in rel:
                self.metadata['canonical'] = href
            elif 'alternate' in rel:
                self.metadata['alternate'].append({
                    'href': href,
                    'type': attrs_dict.get('type', ''),
                    'hreflang': attrs_dict.get('hreflang', '')
                })
                
    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
            
    def handle_data(self, data):
        if self.in_title:
            self.metadata['title'] += data

html = """$HTML"""
parser = MetadataParser()
parser.feed(html)

if '$FORMAT' == 'json':
    print(json.dumps(parser.metadata, indent=2))
else:
    # Markdown output
    print(f"# {parser.metadata['title']}")
    print()
    print(f"**URL:** {parser.metadata['url']}")
    print()
    if parser.metadata['description']:
        print(f"**Description:** {parser.metadata['description']}")
        print()
    if parser.metadata['keywords']:
        print(f"**Keywords:** {', '.join(parser.metadata['keywords'])}")
        print()
    if parser.metadata['author']:
        print(f"**Author:** {parser.metadata['author']}")
        print()
    if parser.metadata['og']:
        print("## Open Graph")
        for k, v in parser.metadata['og'].items():
            print(f"- **{k}:** {v}")
        print()
    if parser.metadata['twitter']:
        print("## Twitter Card")
        for k, v in parser.metadata['twitter'].items():
            print(f"- **{k}:** {v}")
PYEOF