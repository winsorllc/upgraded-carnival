#!/bin/bash
# vCard QR Code Generator - Create QR codes for contact information
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: qr-vcard.sh [options]

Required:
  --name <name>      Full name (e.g., "John Doe")

Options:
  --phone <number>   Phone number
  --email <email>    Email address
  --org <company>    Organization/company
  --title <title>    Job title
  --url <url>        Website URL
  --address <addr>   Street address
  --note <note>      Note
  --out <path>       Output file path (default: vcard-qr.png)
  --size <N>         Module size in pixels (default: 10)
  -h, --help         Show this help

Examples:
  qr-vcard.sh --name "John Doe" --phone "+1234567890" --email "john@example.com"
  qr-vcard.sh --name "Jane" --org "Company Inc" --url "https://example.com"
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
NAME=""
PHONE=""
EMAIL=""
ORG=""
TITLE=""
URL=""
ADDRESS=""
NOTE=""
OUT="vcard-qr.png"
SIZE=10

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --name)
            shift
            NAME="$1"
            ;;
        --phone)
            shift
            PHONE="$1"
            ;;
        --email)
            shift
            EMAIL="$1"
            ;;
        --org)
            shift
            ORG="$1"
            ;;
        --title)
            shift
            TITLE="$1"
            ;;
        --url)
            shift
            URL="$1"
            ;;
        --address)
            shift
            ADDRESS="$1"
            ;;
        --note)
            shift
            NOTE="$1"
            ;;
        --out)
            shift
            OUT="$1"
            ;;
        --size)
            shift
            SIZE="$1"
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
    esac
    shift
done

if [[ -z "$NAME" ]]; then
    echo "Error: --name required" >&2
    usage
fi

check_qrcode

# Create output directory if needed
mkdir -p "$(dirname "$OUT")" 2>/dev/null || true

# Generate vCard QR code
python3 << PYEOF
import qrcode
import sys

name = """$NAME"""
phone = """$PHONE"""
email = """$EMAIL"""
org = """$ORG"""
title = """$TITLE"""
url = """$URL"""
address = """$ADDRESS"""
note = """$NOTE"""
out = """$OUT"""
size = $SIZE

try:
    # Build vCard string
    vcard_lines = ["BEGIN:VCARD", "VERSION:3.0"]
    
    # Name
    name_parts = name.split(" ", 1)
    if len(name_parts) == 2:
        vcard_lines.append(f"N:{name_parts[1]};{name_parts[0]};;;")
    else:
        vcard_lines.append(f"N:;{name};;;")
    vcard_lines.append(f"FN:{name}")
    
    # Phone
    if phone:
        vcard_lines.append(f"TEL:{phone}")
    
    # Email
    if email:
        vcard_lines.append(f"EMAIL:{email}")
    
    # Organization and title
    if org:
        vcard_lines.append(f"ORG:{org}")
    if title:
        vcard_lines.append(f"TITLE:{title}")
    
    # URL
    if url:
        vcard_lines.append(f"URL:{url}")
    
    # Address
    if address:
        vcard_lines.append(f"ADR:;;{address};;;;")
    
    # Note
    if note:
        vcard_lines.append(f"NOTE:{note}")
    
    vcard_lines.append("END:VCARD")
    vcard_str = "\n".join(vcard_lines)
    
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=size,
        border=4,
    )
    qr.add_data(vcard_str)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(out)
    
    print(f"vCard QR Code Generated")
    print(f"Name: {name}")
    if phone: print(f"Phone: {phone}")
    if email: print(f"Email: {email}")
    if org: print(f"Organization: {org}")
    print(f"Output: {out}")
except Exception as e:
    print(f"Error generating QR code: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF