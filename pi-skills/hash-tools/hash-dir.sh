#!/bin/bash
# Hash Directory - Hash all files in a directory
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default values
ALGORITHM="sha256"
DIRECTORY=""
OUTPUT=""
RECURSIVE=true
RELATIVE=true

# Usage
usage() {
    cat << EOF
Usage: $(basename "$0") [algorithm] <directory> [options]

Hash all files in a directory.

Algorithms:
  md5, sha1, sha256 (default), sha512, blake2b, blake2s

Options:
  --output FILE     Write to file instead of stdout
  --no-recursive    Don't recurse into subdirectories
  --absolute        Use absolute paths in output
  --format FORMAT   Output format: standard, json, short
  --help            Show this help message

Examples:
  $(basename "$0") sha256 ./my-files
  $(basename "$0") sha256 ./my-files --output hashes.txt
  $(basename "$0") sha256 ./my-files --no-recursive
EOF
    exit 0
}

# Parse arguments
POSITIONAL_ARGS=()
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        md5|sha1|sha256|sha512|blake2b|blake2s)
            ALGORITHM="$1"
            shift
            ;;
        --output)
            OUTPUT="$2"
            shift 2
            ;;
        --no-recursive)
            RECURSIVE=false
            shift
            ;;
        --absolute)
            RELATIVE=false
            shift
            ;;
        --format)
            echo "Format specified via --output format" >&2
            shift 2
            ;;
        *)
            POSITIONAL_ARGS+=("$1")
            shift
            ;;
    esac
done

# Restore positional args
set -- "${POSITIONAL_ARGS[@]}"

# Get directory
if [[ $# -gt 0 ]]; then
    DIRECTORY="$1"
fi

# Validate
if [[ -z "$DIRECTORY" ]]; then
    echo "Error: Directory is required" >&2
    usage
fi

if [[ ! -d "$DIRECTORY" ]]; then
    echo "Error: Directory not found: $DIRECTORY" >&2
    exit 1
fi

# Get absolute path of directory
ABS_DIR=$(cd "$DIRECTORY" && pwd)

# Build find command
FIND_CMD="find \"$ABS_DIR\" -type f"
if [[ "$RECURSIVE" != "true" ]]; then
    FIND_CMD="$FIND_CMD -maxdepth 1"
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
        blake2s)
            if command -v b2sum &>/dev/null; then
                b2sum -l 256 "$file" | awk '{print $1}'
            else
                openssl blake2s256 "$file" | awk '{print $NF}'
            fi
            ;;
    esac
}

# Process files
OUTPUT_DATA=""

while IFS= read -r file; do
    # Get relative or absolute path
    if [[ "$RELATIVE" == "true" ]]; then
        # Make path relative to PWD or DIRECTORY
        if [[ "$DIRECTORY" == "." ]] || [[ "$DIRECTORY" == "./" ]]; then
            display_path="${file#$(pwd)/}"
        else
            display_path="${file#$ABS_DIR/}"
            if [[ -z "$display_path" ]]; then
                display_path=$(basename "$file")
            fi
        fi
    else
        display_path="$file"
    fi
    
    # Get hash
    hash=$(hash_file "$file" "$ALGORITHM")
    
    # Format output
    echo "${ALGORITHM^^} ($display_path) = $hash"
done < <(find "$ABS_DIR" -type f $(if [[ "$RECURSIVE" != "true" ]]; then echo "-maxdepth 1"; fi) | sort)

exit 0