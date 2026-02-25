#!/bin/bash
# GitHub Actions View - Get run details
# Usage: gh-actions-view.sh <run-id> [options]

RUN_ID="$1"
shift || true

REPO=""
OUTPUT_JSON=false

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --repo)
            REPO="--repo $2"
            shift 2
            ;;
        --json)
            OUTPUT_JSON=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

if [ -z "$RUN_ID" ]; then
    echo "Usage: gh-actions-view.sh <run-id> [options]"
    echo "  --repo NAME   Repository"
    echo "  --json        Output as JSON"
    exit 1
fi

# Check if gh is available
if ! command -v gh &> /dev/null; then
    echo "Error: gh CLI not found. Install from https://cli.github.com/"
    exit 1
fi

if [ "$OUTPUT_JSON" = true ]; then
    gh run view "$RUN_ID" $REPO --json
else
    gh run view "$RUN_ID" $REPO
fi
