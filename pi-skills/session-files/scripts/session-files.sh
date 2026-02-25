#!/bin/bash
# Session Files - Track all file operations during the current session
# This script provides a summary of files read, written, or edited

set -e

REPO_DIR="${1:-/job}"
cd "$REPO_DIR"

echo "═══════════════════════════════════════════════════════════"
echo "  📁 Session File Summary"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
echo "  Current branch: $BRANCH"
echo ""

# Check if we're on a job branch
if [[ "$BRANCH" == job/* ]]; then
    # Compare against main/master for job branches
    BASE_BRANCH=$(git rev-parse --abbrev-ref origin/main 2>/dev/null) || \
    BASE_BRANCH=$(git rev-parse --abbrev-ref origin/master 2>/dev/null) || \
    BASE_BRANCH="main"
    
    echo "  Base branch: $BASE_BRANCH"
    echo ""
    
    # Get all files changed from base (committed changes)
    CHANGED_FILES=$(git diff --name-status "$BASE_BRANCH"...HEAD 2>/dev/null || echo "")
    
    # Get untracked files (not in any commit)
    UNTRACKED_FILES=$(git status --porcelain 2>/dev/null | grep "^??" | cut -c4- || true)
    
    # Combine changed and untracked
    TOTAL_FILES="$CHANGED_FILES"$'\n'"$UNTRACKED_FILES"
    
    if [ -z "$(echo "$TOTAL_FILES" | grep -v '^$')" ]; then
        echo "  ──────────────────────────────────────────────────"
        echo "  No files changed from $BASE_BRANCH"
        echo "  (working directory is clean)"
        echo "  ──────────────────────────────────────────────────"
    else
        # Categorize files
        echo "  ──────────────────────────────────────────────────"
        echo "  📝 Modified Files:"
        echo "  ──────────────────────────────────────────────────"
        MODIFIED=$(echo "$CHANGED_FILES" | grep "^[M]" || true)
        if [ -n "$MODIFIED" ]; then
            echo "$MODIFIED" | sed 's/^M\t/    /'
        else
            echo "    (none)"
        fi
        echo ""
        
        echo "  ──────────────────────────────────────────────────"
        echo "  ➕ Added Files:"
        echo "  ──────────────────────────────────────────────────"
        ADDED=$(echo "$CHANGED_FILES" | grep "^[A]" || true)
        if [ -n "$ADDED" ]; then
            echo "$ADDED" | sed 's/^A\t/    /'
        fi
        if [ -n "$UNTRACKED_FILES" ]; then
            echo "$UNTRACKED_FILES" | sed 's/^/    (untracked) /'
        fi
        if [ -z "$ADDED" ] && [ -z "$UNTRACKED_FILES" ]; then
            echo "    (none)"
        fi
        echo ""
        
        echo "  ──────────────────────────────────────────────────"
        echo "  🗑️  Deleted Files:"
        echo "  ──────────────────────────────────────────────────"
        DELETED=$(echo "$CHANGED_FILES" | grep "^[D]" || true)
        if [ -n "$DELETED" ]; then
            echo "$DELETED" | sed 's/^D\t/    /'
        else
            echo "    (none)"
        fi
        echo ""
    fi
else
    # Not on a job branch - just show current status
    echo "  (Not on a job branch - showing current git status)"
    echo ""
    
    STATUS=$(git status --porcelain)
    
    if [ -z "$STATUS" ]; then
        echo "  No changes in working directory"
    else
        echo "  ──────────────────────────────────────────────────"
        echo "$STATUS" | while read line; do
            status="${line:0:2}"
            file="${line:3}"
            printf "    [%s] %s\n" "$status" "$file"
        done
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════"

# Show commit count for this session
if [[ "$BRANCH" == job/* ]]; then
    COMMIT_COUNT=$(git rev-list --count "$BASE_BRANCH"...HEAD 2>/dev/null || echo "0")
    echo "  Commits in this session: $COMMIT_COUNT"
    echo ""
fi

# Show last few commits
echo "  Recent commits:"
git log --oneline -5 2>/dev/null | sed 's/^/    /'
echo ""
