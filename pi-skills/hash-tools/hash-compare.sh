#!/bin/bash
# Hash Compare - Compare two files by hash
set -euo pipefail

ALGORITHM="sha256"
FILE1=""
FILE2=""

# Usage
usage() {
    cat << EOF
Usage: $(basename "$0") <file1> <file2> [options]

Compare two files by their hash values.

Options:
  --algorithm ALGO   Hash algorithm (default: sha256)
                      Options: md5, sha1, sha256, sha512, blake2b
  --show-hash         Display the hashes being compared
  --help              Show this help message

Examples:
  $(basename "$0") file1.txt file2.txt
  $(basename "$0") file1.txt file2.txt --algorithm md5
  $(basename "$0") file1.txt file2.txt --show-hash
EOF
    exit 0
}

SHOW_HASH=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        --algorithm)
            ALGORITHM="$2"
            shift 2
            ;;
        --show-hash)
            SHOW_HASH=true
            shift
            ;;
        -*)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
        *)
            if [[ -z "$FILE1" ]]; then
                FILE1="$1"
            elif [[ -z "$FILE2" ]]; then
                FILE2="$1"
            fi
            shift
            ;;
    esac
done

# Validate
if [[ -z "$FILE1" ]] || [[ -z "$FILE2" ]]; then
    echo "Error: Two files are required for comparison" >&2
    usage
fi

if [[ ! -f "$FILE1" ]]; then
    echo "Error: File not found: $FILE1" >&2
    exit 1
fi

if [[ ! -f "$FILE2" ]]; then
    echo "Error: File not found: $FILE2" >&2
    exit 1
fi

# Hash function
hash_file() {
    local file="$1"
    local algo="$2"
    
    case "$algo" in
        md5)
            if command -v md5sum &>/dev/null; then
                md5sum "$file" | awk '{print $1}'
            else
                openssl md5 "$file" | awk '{print $NF}'
            fi
            ;;
        sha1)
            if command -v sha1sum &>/dev/null; then
                sha1sum "$file" | awk '{print $1}'
            else
                openssl sha1 "$file" | awk '{print $NF}'
            fi
            ;;
        sha256)
            if command -v sha256sum &>/dev/null; then
                sha256sum "$file" | awk '{print $1}'
            else
                openssl sha256 "$file" | awk '{print $NF}'
            fi
            ;;
        sha512)
            if command -v sha512sum &>/dev/null; then
                sha512sum "$file" | awk '{print $1}'
            else
                openssl sha512 "$file" | awk '{print $NF}'
            fi
            ;;
        blake2b)
            if command -v b2sum &>/dev/null; then
                b2sum "$file" | awk '{print $1}'
            else
                openssl blake2b512 "$file" | awk '{print $NF}'
            fi
            ;;
        *)
            echo "Unknown algorithm: $algo" >&2
            exit 1
            ;;
    esac
}

# Calculate hashes
HASH1=$(hash_file "$FILE1" "$ALGORITHM")
HASH2=$(hash_file "$FILE2" "$ALGORITHM")

# Show hashes if requested
if [[ "$SHOW_HASH" == "true" ]]; then
    echo "File 1: $FILE1"
    echo "  ${ALGORITHM^^}: $HASH1"
    echo ""
    echo "File 2: $FILE2"
    echo "  ${ALGORITHM^^}: $HASH2"
    echo ""
fi

# Compare and output result
echo "Comparing: $FILE1"
echo "     with: $FILE2"
echo ""

if [[ "$HASH1" == "$HASH2" ]]; then
    echo "✅ Files are IDENTICAL (${ALGORITHM^^} hashes match)"
    exit 0
else
    echo "❌ Files are DIFFERENT (${ALGORITHM^^} hashes do not match)"
    exit 1
fi