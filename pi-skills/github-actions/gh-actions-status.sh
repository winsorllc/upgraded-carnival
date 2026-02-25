#!/bin/bash
# GitHub Actions Status - List recent workflow runs
# Usage: gh-actions-status.sh [options]

# Default options
REPO=""
STATUS=""
LIMIT=10
BRANCH=""

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --repo)
            REPO="--repo $2"
            shift 2
            ;;
        --status)
            STATUS="$2"
            shift 2
            ;;
        --limit)
            LIMIT="$2"
            shift 2
            ;;
        --branch)
            BRANCH="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# Check if gh is available
if ! command -v gh &> /dev/null; then
    echo "Error: gh CLI not found. Install from https://cli.github.com/"
    exit 1
fi

# Build command
CMD="gh run list $REPO --limit $LIMIT"
[ -n "$STATUS" ] && CMD="$CMD --status $STATUS"
[ -n "$BRANCH" ] && CMD="$CMD --branch $BRANCH"

# Run
eval $CMD

if [ $? -ne 0 ]; then
    echo "Error: Failed to list workflow runs"
    exit 1
fi
