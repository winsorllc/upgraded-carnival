#!/bin/bash
# Split PDF into pages or extract page ranges
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: pdf-split.sh <pdf-file> [options]

Options:
  --out <path>       Output file for extracted pages
  --out-dir <dir>    Output directory for split pages (default: ./split_pages/)
  --pages <range>    Page range to extract (e.g., "1-5")
  -h, --help         Show this help

Examples:
  pdf-split.sh document.pdf                    # Split into individual pages
  pdf-split.sh document.pdf --pages 1-5 --out extracted.pdf
  pdf-split.sh document.pdf --out-dir /tmp/pages/
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
OUT=""
OUT_DIR=""
PAGES=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --out)
            shift
            OUT="$1"
            ;;
        --out-dir)
            shift
            OUT_DIR="$1"
            ;;
        --pages)
            shift
            PAGES="$1"
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

# Split PDF
python3 << PYEOF
import sys
import os
from pypdf import PdfReader, PdfWriter

pdf_path = "$PDF"
output = "$OUT" if "$OUT" else None
output_dir = "$OUT_DIR" if "$OUT_DIR" else "./split_pages"
pages_range = "$PAGES" if "$PAGES" else None

try:
    reader = PdfReader(pdf_path)
    total_pages = len(reader.pages)
    
    # Parse page range
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
        
        # Extract pages to single file
        if output:
            writer = PdfWriter()
            for i in page_nums:
                writer.add_page(reader.pages[i])
            with open(output, 'wb') as f:
                writer.write(f)
            print(f"Extracted pages {', '.join(str(p+1) for p in page_nums)} to: {output}")
        else:
            # Create output directory
            os.makedirs(output_dir, exist_ok=True)
            for i in page_nums:
                writer = PdfWriter()
                writer.add_page(reader.pages[i])
                out_path = os.path.join(output_dir, f"page_{i+1:03d}.pdf")
                with open(out_path, 'wb') as f:
                    writer.write(f)
            print(f"Extracted {len(page_nums)} pages to: {output_dir}")
    else:
        # Split into individual pages
        os.makedirs(output_dir, exist_ok=True)
        for i in range(total_pages):
            writer = PdfWriter()
            writer.add_page(reader.pages[i])
            out_path = os.path.join(output_dir, f"page_{i+1:03d}.pdf")
            with open(out_path, 'wb') as f:
                writer.write(f)
        print(f"Split {total_pages} pages into: {output_dir}")

except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF