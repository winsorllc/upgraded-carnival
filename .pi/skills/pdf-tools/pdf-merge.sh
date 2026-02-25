#!/bin/bash
# Merge multiple PDF files
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: pdf-merge.sh <pdf1> <pdf2> [pdf3 ...] [options]

Options:
  --out <path>       Output file path (default: merged.pdf)
  -h, --help         Show this help

Examples:
  pdf-merge.sh file1.pdf file2.pdf --out merged.pdf
  pdf-merge.sh *.pdf --out combined.pdf
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
PDFS=()
OUT="merged.pdf"

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
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            PDFS+=("$1")
            ;;
    esac
    shift
done

if [[ ${#PDFS[@]} -lt 2 ]]; then
    echo "Error: At least 2 PDF files required" >&2
    usage
fi

for pdf in "${PDFS[@]}"; do
    if [[ ! -f "$pdf" ]]; then
        echo "Error: File not found: $pdf" >&2
        exit 1
    fi
done

check_deps

# Merge PDFs
python3 << PYEOF
import sys
from pypdf import PdfWriter, PdfReader

pdfs = ${PDFS[@]@Q}
output = "$OUT"

try:
    writer = PdfWriter()
    
    for pdf_path in pdfs:
        reader = PdfReader(pdf_path)
        for page in reader.pages:
            writer.add_page(page)
    
    with open(output, 'wb') as f:
        writer.write(f)
    
    print(f"Merged {len(pdfs)} PDFs into: {output}")
    
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF