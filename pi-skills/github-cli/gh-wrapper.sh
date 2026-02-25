#!/bin/bash
# GitHub CLI wrapper for PopeBot

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: gh CLI not installed${NC}"
    echo "Install with: brew install gh"
    exit 1
fi

# Parse command
COMMAND="${1:-}"
shift || true

case "$COMMAND" in
    auth-status)
        gh auth status
        ;;
    repo-list)
        gh repo list "${1:-}" --limit 20
        ;;
    repo-view)
        if [ -z "$1" ]; then
            gh repo view
        else
            gh repo view "$1"
        fi
        ;;
    issue-list)
        gh issue list --state all --limit 20 "$@"
        ;;
    issue-create)
        gh issue create "$@"
        ;;
    issue-view)
        gh issue view "$1"
        ;;
    pr-list)
        gh pr list --limit 20 "$@"
        ;;
    pr-create)
        gh pr create "$@"
        ;;
    pr-view)
        gh pr view "$1"
        ;;
    pr-merge)
        gh pr merge "$1" --squash --delete-branch
        ;;
    release-list)
        gh release list
        ;;
    release-create)
        gh release create "$1" --title "$2" --notes "$3"
        ;;
    run-list)
        gh run list --limit 10
        ;;
    run-view)
        gh run view "$1"
        ;;
    workflow-list)
        gh workflow list
        ;;
    workflow-run)
        gh workflow run "$1" "$@"
        ;;
    search-repos)
        gh search repos "$1" --limit "${2:-10}"
        ;;
    search-issues)
        gh search issues "$1" --limit "${2:-10}"
        ;;
    gist-list)
        gh gist list --limit 10
        ;;
    gist-create)
        gh gist create "$@"
        ;;
    *)
        echo "GitHub CLI Wrapper for PopeBot"
        echo ""
        echo "Usage: gh-wrapper <command> [args]"
        echo ""
        echo "Commands:"
        echo "  auth-status              Check authentication status"
        echo "  repo-list [owner]        List repositories"
        echo "  repo-view [repo]         View repository details"
        echo "  issue-list               List issues"
        echo "  issue-create             Create an issue"
        echo "  issue-view <n>           View issue details"
        echo "  pr-list                  List pull requests"
        echo "  pr-create                Create a pull request"
        echo "  pr-view <n>              View pull request"
        echo "  pr-merge <n>            Merge pull request"
        echo "  release-list             List releases"
        echo "  release-create <tag>    Create a release"
        echo "  run-list                 List recent workflow runs"
        echo "  run-view <id>            View workflow run"
        echo "  workflow-list            List workflows"
        echo "  workflow-run <name>     Run a workflow"
        echo "  search-repos <query>     Search repositories"
        echo "  search-issues <query>    Search issues"
        echo "  gist-list                List gists"
        echo "  gist-create <file>      Create a gist"
        echo ""
        echo "All gh commands pass through directly. Use 'gh --help' for more."
        ;;
esac
