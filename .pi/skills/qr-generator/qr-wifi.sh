#!/bin/bash
# WiFi QR Code Generator - Create QR codes for WiFi network access
set -euo pipefail

usage() {
    cat >&2 <<'EOF'
Usage: qr-wifi.sh [options]

Required:
  --ssid <name>      WiFi network name
  --password <pass>  WiFi password

Options:
  --security <type>  Security type: WPA, WPA2, WPA3, WEP, nopass (default: WPA)
  --hidden           Network is hidden
  --out <path>       Output file path (default: wifi-qr.png)
  --size <N>         Module size in pixels (default: 10)
  -h, --help         Show this help

Examples:
  qr-wifi.sh --ssid "MyNetwork" --password "secret123"
  qr-wifi.sh --ssid "MyNetwork" --password "secret123" --security WPA3
  qr-wifi.sh --ssid "MyNetwork" --password "secret123" --hidden --out /tmp/wifi.png
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
SSID=""
PASSWORD=""
SECURITY="WPA"
HIDDEN=false
OUT="wifi-qr.png"
SIZE=10

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --ssid)
            shift
            SSID="$1"
            ;;
        --password)
            shift
            PASSWORD="$1"
            ;;
        --security)
            shift
            SECURITY="$1"
            ;;
        --hidden)
            HIDDEN=true
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

if [[ -z "$SSID" ]]; then
    echo "Error: --ssid required" >&2
    usage
fi

if [[ -z "$PASSWORD" ]] && [[ "$SECURITY" != "nopass" ]]; then
    echo "Error: --password required (unless --security nopass)" >&2
    usage
fi

check_qrcode

# Create output directory if needed
mkdir -p "$(dirname "$OUT")" 2>/dev/null || true

# Generate WiFi QR code
python3 << PYEOF
import qrcode
import sys

ssid = """$SSID"""
password = """$PASSWORD"""
security = """$SECURITY"""
hidden = $HIDDEN
out = """$OUT"""
size = $SIZE

try:
    # Escape special characters
    def escape(s):
        return s.replace("\\\\", "\\\\\\\\").replace('"', '\\\\"').replace(";", ";;").replace(",", ";;")
    
    # Build WiFi string
    wifi_str = f"WIFI:T:{security};S:{escape(ssid)};P:{escape(password)};"
    if hidden:
        wifi_str += "H:true;"
    wifi_str += ";"
    
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=size,
        border=4,
    )
    qr.add_data(wifi_str)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(out)
    
    print(f"WiFi QR Code Generated")
    print(f"SSID: {ssid}")
    print(f"Security: {security}")
    print(f"Output: {out}")
except Exception as e:
    print(f"Error generating QR code: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF