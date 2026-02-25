#!/bin/bash
# Hash Tools - Calculate file and string hashes
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default values
ALGORITHM=""
INPUT=""
FORMAT="short"
IS_STRING=false

# Usage
usage() {
    cat << EOF
Usage: $(basename "$0") <algorithm> <file|--string "text"> [options]

Algorithms:
  md5       - MD5 hash
  sha1      - SHA-1 hash
  sha256    - SHA-256 hash (recommended)
  sha512    - SHA-512 hash
  blake2b   - BLAKE2b hash
  blake2s   - BLAKE2s hash

Options:
  --string "text"  Hash a string instead of a file
  --format FORMAT  Output format: short, long, json, base64
  --json           Shorthand for --format json
  --base64         Shorthand for --format base64
  --help           Show this help message

Examples:
  $(basename "$0") sha256 file.txt
  $(basename "$0") sha256 --string "hello world"
  $(basename "$0") sha256 file.txt --json
  $(basename "$0") sha256 file.txt --base64
EOF
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        md5|sha1|sha256|sha512|blake2b|blake2s)
            ALGORITHM="$1"
            shift
            ;;
        --string)
            IS_STRING=true
            INPUT="$2"
            shift 2
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        --json)
            FORMAT="json"
            shift
            ;;
        --base64)
            FORMAT="base64"
            shift
            ;;
        -*)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
        *)
            if [[ -z "$ALGORITHM" ]]; then
                echo "Error: Algorithm must be specified first" >&2
                exit 1
            fi
            INPUT="$1"
            shift
            ;;
    esac
done

# Validate
if [[ -z "$ALGORITHM" ]]; then
    echo "Error: Algorithm is required" >&2
    usage
fi

if [[ -z "$INPUT" ]]; then
    echo "Error: Input (file or string) is required" >&2
    usage
fi

# Get hash command based on algorithm
get_hash_cmd() {
    local algo="$1"
    case "$algo" in
        md5)
            if command -v md5sum &>/dev/null; then
                echo "md5sum"
            elif command -v md5 &>/dev/null; then
                echo "md5 -r"
            else
                echo "openssl md5 | awk '{print \$NF}'"
            fi
            ;;
        sha1)
            if command -v sha1sum &>/dev/null; then
                echo "sha1sum"
            else
                echo "openssl sha1 | awk '{print \$NF}'"
            fi
            ;;
        sha256)
            if command -v sha256sum &>/dev/null; then
                echo "sha256sum"
            else
                echo "openssl sha256 | awk '{print \$NF}'"
            fi
            ;;
        sha512)
            if command -v sha512sum &>/dev/null; then
                echo "sha512sum"
            else
                echo "openssl sha512 | awk '{print \$NF}'"
            fi
            ;;
        blake2b)
            if command -v b2sum &>/dev/null; then
                echo "b2sum"
            else
                echo "openssl blake2b512 | awk '{print \$NF}'"
            fi
            ;;
        blake2s)
            if command -v b2sum &>/dev/null; then
                echo "b2sum -l 256"
            else
                echo "openssl blake2s256 | awk '{print \$NF}'"
            fi
            ;;
        *)
            echo "Unknown algorithm: $algo" >&2
            exit 1
            ;;
    esac
}

# Calculate hash
calculate_hash() {
    local algo="$1"
    local cmd
    cmd=$(get_hash_cmd "$algo")
    
    if [[ "$IS_STRING" == "true" ]]; then
        # Hash a string
        if [[ "$cmd" == *"openssl"* ]]; then
            echo -n "$INPUT" | openssl dgst -"${algo}" -r | awk '{print $1}'
        else
            echo -n "$INPUT" | eval "$cmd" | awk '{print $1}'
        fi
    else
        # Hash a file
        if [[ ! -f "$INPUT" ]]; then
            echo "Error: File not found: $INPUT" >&2
            exit 1
        fi
        
        if [[ "$cmd" == *"openssl"* ]]; then
            openssl dgst -"${algo}" -r "$INPUT" | awk '{print $1}'
        else
            eval "$cmd" "$INPUT" | awk '{print $1}'
        fi
    fi
}

# Main
HASH=$(calculate_hash "$ALGORITHM")

# Convert to base64 if requested
if [[ "$FORMAT" == "base64" ]]; then
    # Convert hex to base64
    HASH=$(echo -n "$HASH" | xxd -r -p | base64)
fi

# Output in requested format
case "$FORMAT" in
    short)
        echo "$HASH"
        ;;
    long)
        if [[ "$IS_STRING" == "true" ]]; then
            echo "${ALGORITHM^^} (\"$INPUT\") = $HASH"
        else
            echo "${ALGORITHM^^} ($INPUT) = $HASH"
        fi
        ;;
    json)
        cat << EOF
{
  "algorithm": "$ALGORITHM",
  "input": $(if [[ "$IS_STRING" == "true" ]]; then echo "\"$INPUT\""; else echo "\"$INPUT\""; fi),
  "inputType": "$(if [[ "$IS_STRING" == "true" ]]; then echo "string"; else echo "file"; fi)",
  "hash": "$HASH"
}
EOF
        ;;
    base64)
        echo "$HASH"
        ;;
    *)
        echo "$HASH"
        ;;
esac