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
    
    # Get working directory changes (staged and unstaged)
    WORKING_STATUS=$(git status --porcelain 2>/dev/null || echo "")
    
    if [ -z "$CHANGED_FILES" ] && [ -z "$WORKING_STATUS" ]; then
        echo "  ──────────────────────────────────────────────────"
        echo "  No files changed from $BASE_BRANCH"
        echo "  (working directory is clean)"
        echo "  ──────────────────────────────────────────────────"
    else
        # Parse working directory status
        # Format: XY filename (X = staged, Y = working tree)
        # M  = modified in working tree
        # M  = modified in staging area (first char)
        # A  = added to staging area
        # ?? = untracked
        
        declare -A modified_files
        declare -A added_files
        declare -A deleted_files
        
        # Process working directory status
        while IFS= read -r line; do
            if [ -z "$line" ]; then
                continue
            fi
            status="${line:0:2}"
            file="${line:3}"
            
            # Check first char (staged)
            staged="${status:0:1}"
            # Check second char (working tree)
            working="${status:1:1}"
            
            if [ "$staged" = "?" ] && [ "$working" = "?" ]; then
                added_files["$file"]="untracked"
            elif [ "$working" = "M" ]; then
                if [ "$staged" = "M" ]; then
                    modified_files["$file"]="staged"
                else
                    modified_files["$file"]="unstaged"
                fi
            elif [ "$staged" = "M" ]; then
                modified_files["$file"]="staged"
            elif [ "$staged" = "A" ]; then
                added_files["$file"]="staged"
            elif [ "$working" = "D" ]; then
                deleted_files["$file"]="unstaged"
            elif [ "$staged" = "D" ]; then
                deleted_files["$file"]="staged"
            fi
        done <<< "$WORKING_STATUS"
        
        # Process committed changes
        while IFS= read -r line; do
            if [ -z "$line" ]; then
                continue
            fi
            status="${line:0:1}"
            file="${line:2}"
            
            case "$status" in
                M) modified_files["$file"]="committed" ;;
                A) added_files["$file"]="committed" ;;
                D) deleted_files["$file"]="committed" ;;
            esac
        done <<< "$CHANGED_FILES"
        
        echo "  ──────────────────────────────────────────────────"
        echo "  📝 Modified Files:"
        echo "  ──────────────────────────────────────────────────"
        
        if [ ${#modified_files[@]} -eq 0 ]; then
            echo "    (none)"
        else
            for file in "${!modified_files[@]}"; do
                status="${modified_files[$file]}"
                case "$status" in
                    committed) echo "    $file" ;;
                    staged) echo "    $file (staged)" ;;
                    unstaged) echo "    $file (unstaged)" ;;
                esac
            done
        fi
        echo ""
        
        echo "  ──────────────────────────────────────────────────"
        echo "  ➕ Added Files:"
        echo "  ──────────────────────────────────────────────────"
        
        if [ ${#added_files[@]} -eq 0 ]; then
            echo "    (none)"
        else
            for file in "${!added_files[@]}"; do
                status="${added_files[$file]}"
                case "$status" in
                    committed) echo "    $file" ;;
                    staged) echo "    $file (staged)" ;;
                    untracked) echo "    $file (untracked)" ;;
                esac
            done
        fi
        echo ""
        
        echo "  ──────────────────────────────────────────────────"
        echo "  🗑️  Deleted Files:"
        echo "  ──────────────────────────────────────────────────"
        
        if [ ${#deleted_files[@]} -eq 0 ]; then
            echo "    (none)"
        else
            for file in "${!deleted_files[@]}"; do
                status="${deleted_files[$file]}"
                case "$status" in
                    committed) echo "    $file" ;;
                    staged) echo "    $file (staged)" ;;
                    unstaged) echo "    $file (unstaged)" ;;
                esac
            done
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
        while IFS= read -r line; do
            if [ -n "$line" ] && [ ${#line} -ge 3 ]; then
                status="${line:0:2}"
                file="${line:3}"
                printf "    [%s] %s\n" "$status" "$file"
            fi
        done <<< "$STATUS"
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
