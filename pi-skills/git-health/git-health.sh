#!/bin/bash
#
# Git Health Check - Repository diagnostics
# Inspired by zeroclaw doctor and modern git tooling
#

set -e

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

CHECK="${GREEN}✓${RESET}"
WARN="${YELLOW}!${RESET}"
FAIL="${RED}✗${RESET}"

ISSUES=0
WARNINGS=0

# Parse args
CHECK_COMMITS=false
CHECK_BRANCHES=false
CHECK_REMOTES=false
CHECK_HOOKS=false
CHECK_SIZE=false
CHECK_ALL=true

while [[ $# -gt 0 ]]; do
  case $1 in
    --commits) CHECK_COMMITS=true; CHECK_ALL=false; shift ;;
    --branches) CHECK_BRANCHES=true; CHECK_ALL=false; shift ;;
    --remotes) CHECK_REMOTES=true; CHECK_ALL=false; shift ;;
    --hooks) CHECK_HOOKS=true; CHECK_ALL=false; shift ;;
    --size) CHECK_SIZE=true; CHECK_ALL=false; shift ;;
    *) shift ;;
  esac
done

print_header() {
  echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${CYAN}║${BOLD}           Git Repository Health Report                 ${RESET}${CYAN}║${RESET}"
  echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${RESET}"
  echo
}

print_summary() {
  echo
  echo -e "${CYAN}═══════════════════════════════════════════════════════════${RESET}"
  if [ $ISSUES -gt 0 ]; then
    echo -e "${RED}${BOLD}Overall Status: ❌ ISSUES ($ISSUES critical)${RESET}"
  elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}${BOLD}Overall Status: ⚠️ WARNING ($WARNINGS warning(s))${RESET}"
  else
    echo -e "${GREEN}${BOLD}Overall Status: ✓ HEALTHY${RESET}"
  fi
  echo -e "${CYAN}═══════════════════════════════════════════════════════════${RESET}"
  echo
}

check_initialized() {
  if [ ! -d ".git" ]; then
    echo -e "  ${FAIL} Git Initialized       ${RED}Not a git repository${RESET}"
    ISSUES=$((ISSUES + 1))
    return 1
  fi
  echo -e "  ${CHECK} Git Initialized       Repository properly initialized"
  return 0
}

check_remotes() {
  local remotes=$(git remote 2>/dev/null | wc -l)
  if [ $remotes -eq 0 ]; then
    echo -e "  ${WARN} Remote Config         ${YELLOW}No remotes configured${RESET}"
    WARNINGS=$((WARNINGS + 1))
  else
    local origin_url=$(git remote get-url origin 2>/dev/null || echo "N/A")
    echo -e "  ${CHECK} Remote Config         origin: ${BLUE}$origin_url${RESET}"
  fi
}

check_branches() {
  local current=$(git branch --show-current 2>/dev/null || echo "detached")
  local branches=$(git branch -a 2>/dev/null | wc -l)
  
  echo -e "  ${CHECK} Branch Count          $branches branches"
  echo -e "  ${CHECK} Current Branch        ${BLUE}$current${RESET}"
  
  # Check for main/master
  if git show-ref --verify --quiet refs/heads/main 2>/dev/null; then
    echo -e "  ${CHECK} Main Branch           main branch exists"
  elif git show-ref --verify --quiet refs/heads/master 2>/dev/null; then
    echo -e "  ${CHECK} Main Branch           master branch exists"
  else
    echo -e "  ${WARN} Main Branch           ${YELLOW}No main or master branch${RESET}"
    WARNINGS=$((WARNINGS + 1))
  fi
}

check_commits() {
  local total=$(git rev-list --count HEAD 2>/dev/null || echo "0")
  local last=$(git log -1 --format="%cr" 2>/dev/null || echo "N/A")
  
  echo -e "  ${CHECK} Commit History        $total commits, last: $last"
  
  # Check for large commits by files changed
  local large_commits=$(git log --shortstat --all --no-merges -20 2>/dev/null | grep -E "[0-9]+ files changed" | awk '{if($1>50) print $1}' | wc -l)
  if [ $large_commits -gt 0 ]; then
    echo -e "  ${WARN} Large Commits         ${YELLOW}$large_commits recent commits changed >50 files${RESET}"
    WARNINGS=$((WARNINGS + 1))
  fi
}

check_unpushed() {
  local unpushed=$(git log --branches --not --remotes --oneline 2>/dev/null | wc -l)
  if [ $unpushed -gt 0 ]; then
    echo -e "  ${WARN} Unpushed Commits      ${YELLOW}$unpushed commits not pushed${RESET}"
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "  ${CHECK} Push Status           All commits pushed${RESET}"
  fi
}

check_stash() {
  local stashes=$(git stash list 2>/dev/null | wc -l)
  if [ $stashes -gt 0 ]; then
    echo -e "  ${CHECK} Stash Status          ${BLUE}$stashes stashes saved${RESET}"
  else
    echo -e "  ${CHECK} Stash Status          Clean (0 stashes)${RESET}"
  fi
}

check_hooks() {
  local hooks_dir=".git/hooks"
  local hook_count=$(find "$hooks_dir" -type f ! -name "*.sample" 2>/dev/null | wc -l)
  
  if [ $hook_count -gt 0 ]; then
    echo -e "  ${CHECK} Git Hooks             ${BLUE}$hook_count hooks configured${RESET}"
  else
    echo -e "  ${CHECK} Git Hooks             No hooks (using defaults)${RESET}"
  fi
}

check_repo_size() {
  local size=$(du -sh .git 2>/dev/null | cut -f1)
  echo -e "  ${CHECK} Repository Size       .git directory: ${BLUE}$size${RESET}"
  
  # Check for large files
  local large_files=$(find . -type f -size +10M -not -path "./.git/*" 2>/dev/null | wc -l)
  if [ $large_files -gt 0 ]; then
    echo -e "  ${WARN} Large Files           ${YELLOW}$large_files files larger than 10MB${RESET}"
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "  ${CHECK} Large Files           No files larger than 10MB${RESET}"
  fi
}

check_working_tree() {
  local changes=$(git status --porcelain 2>/dev/null | wc -l)
  if [ $changes -gt 0 ]; then
    local modified=$(git diff --name-only 2>/dev/null | wc -l)
    local untracked=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l)
    echo -e "  ${WARN} Working Tree          ${YELLOW}$changes changes ($modified modified, $untracked untracked)${RESET}"
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "  ${CHECK} Working Tree          Clean (no changes)${RESET}"
  fi
}

# Main
print_header

if [ "$CHECK_ALL" = true ] || [ "$CHECK_REMOTES" = true ]; then
  check_initialized || exit 1
  check_remotes
fi

if [ "$CHECK_ALL" = true ] || [ "$CHECK_BRANCHES" = true ]; then
  check_branches
fi

if [ "$CHECK_ALL" = true ] || [ "$CHECK_COMMITS" = true ]; then
  check_commits
fi

if [ "$CHECK_ALL" = true ]; then
  check_unpushed
  check_working_tree
  check_stash
fi

if [ "$CHECK_ALL" = true ] || [ "$CHECK_HOOKS" = true ]; then
  check_hooks
fi

if [ "$CHECK_ALL" = true ] || [ "$CHECK_SIZE" = true ]; then
  check_repo_size
fi

print_summary
