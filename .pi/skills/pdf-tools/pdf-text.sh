#!/bin/bash
# Extract text from PDF files
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: pdf-text.sh <pdf-file> [options]

Options:
  --pages <range>    Page range (e.g., "1-5", "1,3,5")
  --out <path>       Output file path (default: stdout)
  --json             Output as JSON with page info
  -h, --help         Show this help

Examples:
  pdf-text.sh document.pdf
  pdf-text.sh document.pdf --pages 1-5
  pdf-text.sh document.pdf --out extracted.txt
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
PAGES=""
OUT=""
JSON=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --pages)
            shift
            PAGES="$1"
            ;;
        --out)
            shift
            OUT="$1"
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

# Extract text
python3 << PYEOF
import sys
import json
import re
from pypdf import PdfReader

pdf_path = "$PDF"
pages_range = "$PAGES" if "$PAGES" else None
output_json = $JSON

try:
    reader = PdfReader(pdf_path)
    total_pages = len(reader.pages)
    
    # Parse page range
    page_nums = list(range(total_pages))
    if pages_range:
        page_nums = []
        for part in pages_range.split(','):
            part = part.strip()
            if '-' in part:
                start, end = map(int, part.split('-'))
                page_nums.extend(range(start - 1, end))
            else:
                page_nums.append(int(part) - 1)
        page_nums = sorted(set(p for p in page_nums if 0 <= p < total_pages))
    
    if output_json:
        results = {"file": pdf_path, "total_pages": total_pages, "pages": []}
        for i in page_nums:
            text = reader.pages[i].extract_text()
            results["pages"].append({
                "page": i + 1,
                "text": text
            })
        print(json.dumps(results, indent=2))
    else:
        all_text = []
        for i in page_nums:
            text = reader.pages[i].extract_text()
            all_text.append(f"--- Page {i + 1} ---\n{text}")
        output = "\n\n".join(all_text)
        
        if "$OUT":
            with open("$OUT", 'w') as f:
                f.write(output)
            print(f"Extracted text written to: $OUT")
        else:
            print(output)

except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF