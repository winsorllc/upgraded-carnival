#!/bin/bash
# QR Code Generator - Create QR codes from text/URLs
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: qr.sh <data> [options]

Options:
  --out <path>       Output file path (default: qr.png)
  --size <N>         Module size in pixels (default: 10)
  --border <N>       Border size in modules (default: 4)
  --color <color>    QR code color (default: black)
  --bg <color>       Background color (default: white)
  --format <fmt>     Output format: PNG, SVG (default: PNG)
  -h, --help         Show this help

Examples:
  qr.sh "https://example.com"
  qr.sh "Hello World" --out /tmp/qr.png
  qr.sh "data" --size 20 --border 2 --color darkblue
  qr.sh "data" --format SVG --out qr.svg
EOF
    exit 2
}

# Check for qrcode library
check_qrcode() {
    if ! python3 -c "import qrcode" 2>/dev/null; then
        echo "Error: qrcode library not installed" >&2
        echo "Install with: pip install qrcode pillow" >&2
        exit 1
    fi
}

# Default values
DATA=""
OUT="qr.png"
SIZE=10
BORDER=4
COLOR="black"
BG="white"
FORMAT="PNG"

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
        --size)
            shift
            SIZE="$1"
            ;;
        --border)
            shift
            BORDER="$1"
            ;;
        --color)
            shift
            COLOR="$1"
            ;;
        --bg)
            shift
            BG="$1"
            ;;
        --format)
            shift
            FORMAT="$1"
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            if [[ -z "$DATA" ]]; then
                DATA="$1"
            fi
            ;;
    esac
    shift
done

if [[ -z "$DATA" ]]; then
    echo "Error: Data required" >&2
    usage
fi

check_qrcode

# Create output directory if needed
mkdir -p "$(dirname "$OUT")" 2>/dev/null || true

# Generate QR code with Python
python3 << PYEOF
import qrcode
import sys

data = """$DATA"""
out = """$OUT"""
size = $SIZE
border = $BORDER
color = """$COLOR"""
bg = """$BG"""
format = """$FORMAT""".upper()

try:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    if format == "SVG":
        from qrcode.image.svg import SvgImage
        img = qr.make_image(fill_color=color, back_color=bg, image_factory=SvgImage)
    else:
        img = qr.make_image(fill_color=color, back_color=bg)
    
    img.save(out)
    print(f"Generated QR code: {out}")
except Exception as e:
    print(f"Error generating QR code: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF