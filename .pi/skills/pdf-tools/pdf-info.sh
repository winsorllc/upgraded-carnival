#!/bin/bash
# Get PDF file information
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: pdf-info.sh <pdf-file> [options]

Options:
  --json             Output as JSON
  -h, --help         Show this help

Examples:
  pdf-info.sh document.pdf
  pdf-info.sh document.pdf --json
EOF
    exit 2
}

# Check for pypdf
check_deps() {
    if ! python3 -c "import pypdf" 2>/dev/null; then
        echo "Error: pypdf not installed" >&2
        echo "Install with: pip install pypdf" >&2
        exit 1
    fi
}

# Default values
PDF=""
JSON=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --json)
            JSON=true
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            if [[ -z "$PDF" ]]; then
                PDF="$1"
            fi
            ;;
    esac
    shift
done

if [[ -z "$PDF" ]]; then
    echo "Error: PDF file required" >&2
    usage
fi

if [[ ! -f "$PDF" ]]; then
    echo "Error: File not found: $PDF" >&2
    exit 1
fi

check_deps

# Get PDF info
python3 << PYEOF
import sys
import json
import os
from pypdf import PdfReader

pdf_path = "$PDF"
output_json = $JSON

try:
    reader = PdfReader(pdf_path)
    
    info = {
        "file": pdf_path,
        "size_bytes": os.path.getsize(pdf_path),
        "pages": len(reader.pages),
        "metadata": {},
        "encrypted": reader.is_encrypted
    }
    
    # Extract metadata
    if reader.metadata:
        for key, value in reader.metadata.items():
            info["metadata"][key] = str(value)
    
    # Common metadata fields
    meta = reader.metadata or {}
    info["title"] = str(meta.get("/Title", ""))
    info["author"] = str(meta.get("/Author", ""))
    info["subject"] = str(meta.get("/Subject", ""))
    info["creator"] = str(meta.get("/Creator", ""))
    info["producer"] = str(meta.get("/Producer", ""))
    info["created"] = str(meta.get("/CreationDate", ""))
    
    if output_json:
        print(json.dumps(info, indent=2))
    else:
        print(f"File: {info['file']}")
        print(f"Size: {info['size_bytes']:,} bytes")
        print(f"Pages: {info['pages']}")
        print(f"Encrypted: {info['encrypted']}")
        if info["title"]:
            print(f"Title: {info['title']}")
        if info["author"]:
            print(f"Author: {info['author']}")
        if info["subject"]:
            print(f"Subject: {info['subject']}")
        if info["creator"]:
            print(f"Creator: {info['creator']}")
        if info["producer"]:
            print(f"Producer: {info['producer']}")
        if info["created"]:
            print(f"Created: {info['created']}")

except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF