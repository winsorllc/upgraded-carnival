#!/bin/bash
# GitHub Code Search - Search for code patterns across GitHub repositories
# Usage: search.sh "query" [options]
# 
# Options:
#   -n, --results NUM   Number of results (default: 5)
#   -l, --language LANG Filter by language (e.g., javascript, python, typescript)
#   -r, --repo SPEC    Search in specific repo (e.g., facebook/react)
#   -p, --page NUM     Page number for pagination (default: 1)
#   -h, --help         Show this help message

set -e

# Default values
NUM_RESULTS=5
LANGUAGE=""
REPO=""
PAGE=1
QUERY=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--results)
            NUM_RESULTS="$2"
            shift 2
            ;;
        -l|--language)
            LANGUAGE="$2"
            shift 2
            ;;
        -r|--repo)
            REPO="$2"
            shift 2
            ;;
        -p|--page)
            PAGE="$2"
            shift 2
            ;;
        -h|--help)
            echo "GitHub Code Search"
            echo "Usage: $0 \"query\" [options]"
            echo ""
            echo "Options:"
            echo "  -n, --results NUM   Number of results (default: 5)"
            echo "  -l, --language LANG Filter by language"
            echo "  -r, --repo SPEC    Search in specific repo"
            echo "  -p, --page NUM     Page number (default: 1)"
            echo ""
            echo "Examples:"
            echo "  $0 \"useState\""
            echo "  $0 \"async def\" --language python"
            echo "  $0 \"TODO\" --repo facebook/react"
            echo "  $0 \"console.log\" --language javascript --results 10"
            exit 0
            ;;
        *)
            QUERY="$1"
            shift
            ;;
    esac
done

if [[ -z "$QUERY" ]]; then
    echo "Error: Query is required"
    echo "Usage: $0 \"query\" [options]"
    exit 1
fi

# Build the search query
SEARCH_QUERY="$QUERY"

# Add language filter if specified
if [[ -n "$LANGUAGE" ]]; then
    SEARCH_QUERY="$SEARCH_QUERY language:$LANGUAGE"
fi

# Add repo filter if specified
if [[ -n "$REPO" ]]; then
    SEARCH_QUERY="$SEARCH_QUERY repo:$REPO"
fi

echo "=== GitHub Code Search ==="
echo "Query: $QUERY"
[[ -n "$LANGUAGE" ]] && echo "Language: $LANGUAGE"
[[ -n "$REPO" ]] && echo "Repository: $REPO"
echo "Results: $NUM_RESULTS"
echo ""

# Check for gh CLI
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Use gh api for code search
echo "Searching GitHub..."

# URL encode the query using Node.js
ENCODED_QUERY=$(node -e "console.log(encodeURIComponent('$SEARCH_QUERY').replace(/\%20/g, '+'))")

# Use gh api to search code
RESPONSE=$(gh api -H "Accept: application/vnd.github.text+json" \
    "search/code?q=${ENCODED_QUERY}&per_page=${NUM_RESULTS}&page=${PAGE}" 2>&1) || {
    echo "Error searching GitHub:"
    echo "$RESPONSE"
    echo ""
    echo "Make sure you're authenticated:"
    echo "  gh auth login"
    exit 1
}

# Check for errors in response
if echo "$RESPONSE" | jq -e '.message' &> /dev/null; then
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.message')
    echo "GitHub API Error: $ERROR_MSG"
    if [[ "$ERROR_MSG" == *"rate limit"* ]]; then
        echo "Rate limit exceeded. Wait a while and try again."
    fi
    exit 1
fi

# Parse and display results
TOTAL_COUNT=$(echo "$RESPONSE" | jq -r '.total_count // 0')

if [[ "$TOTAL_COUNT" == "0" ]]; then
    echo "No results found for: $SEARCH_QUERY"
else
    echo "Total results: $TOTAL_COUNT"
    echo ""
    
    # Extract and display results with previews
    echo "$RESPONSE" | jq -r --arg num "$NUM_RESULTS" '
        .items[:($num | tonumber)] | 
        .[] | 
        "---" as $sep |
        [$sep,
         "Repo: " + .repository.full_name,
         "File: " + .path,
         "URL: " + .html_url,
         "Score: " + (.score | tostring),
         ""] | 
        join("\n")
    '
fi
