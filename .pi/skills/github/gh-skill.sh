#!/bin/bash
# GitHub operations skill - Wraps gh CLI for common GitHub operations

COMMAND="${1:-}"
REPO="${2:-}"
shift 2 || true

case "$COMMAND" in
    pr-list)
        gh pr list --repo "$REPO" "$@"
        ;;
    pr-view)
        gh pr view "$REPO" "$@"
        ;;
    pr-checks)
        gh pr checks "$REPO" "$@"
        ;;
    pr-create)
        gh pr create --repo "$REPO" "$@"
        ;;
    pr-merge)
        gh pr merge --repo "$REPO" "$@"
        ;;
    issue-list)
        gh issue list --repo "$REPO" "$@"
        ;;
    issue-create)
        gh issue create --repo "$REPO" "$@"
        ;;
    issue-view)
        gh issue view "$REPO" "$@"
        ;;
    run-list)
        gh run list --repo "$REPO" "$@"
        ;;
    run-view)
        gh run view "$REPO" "$@"
        ;;
    api)
        gh api "$REPO" "$@"
        ;;
    auth-status)
        gh auth status
        ;;
    *)
        echo "GitHub Skill - Available commands:"
        echo ""
        echo "  pr-list <repo>          List PRs"
        echo "  pr-view <pr>            View PR details"
        echo "  pr-checks <pr>          Check PR CI status"
        echo "  pr-create <repo>       Create a PR"
        echo "  pr-merge <pr>          Merge a PR"
        echo "  issue-list <repo>      List issues"
        echo "  issue-create <repo>     Create issue"
        echo "  issue-view <issue>     View issue"
        echo "  run-list <repo>         List CI runs"
        echo "  run-view <run-id>       View run details"
        echo "  api <endpoint>          Query API"
        echo "  auth-status             Check auth"
        echo ""
        echo "Examples:"
        echo "  gh-skill pr-list owner/repo"
        echo "  gh-skill pr-checks 55 --repo owner/repo"
        echo "  gh-skill api repos/owner/repo --jq '.stargazers_count'"
        exit 1
        ;;
esac
