#!/bin/bash
#
# Environment Checker - Validate dev environment setup
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
MISSING="${RED}✗${RESET}"
OPTIONAL="${BLUE}-${RESET}"

MISSING_COUNT=0
WARNING_COUNT=0
OPTIONAL_MISSING=0

# Tool requirements
declare -A REQUIRED_TOOLS=(
  ["node"]="Node.js runtime"
  ["npm"]="Node package manager"
  ["git"]="Version control"
  ["curl"]="HTTP client"
)

declare -A OPTIONAL_TOOLS=(
  ["docker"]="Container runtime"
  ["python3"]="Python runtime"
  ["pnpm"]="Fast package manager"
  ["yarn"]="Yarn package manager"
  ["jq"]="JSON processor"
  ["htop"]="Process viewer"
)

# Configuration files
declare -a CONFIG_FILES=(
  ".env"
  ".gitignore"
  ".editorconfig"
  "README.md"
)

# Parse arguments
CHECK_NODE=false
CHECK_GIT=false
CHECK_DOCKER=false
NEED_LIST=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --node)
      CHECK_NODE=true
      shift
      ;;
    --git)
      CHECK_GIT=true
      shift
      ;;
    --docker)
      CHECK_DOCKER=true
      shift
      ;;
    --need)
      NEED_LIST="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

print_header() {
  echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${CYAN}║${BOLD}                    ENVIRONMENT CHECK REPORT                    ${RESET}${CYAN}║${RESET}"
  echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${RESET}"
  echo
}

check_tool() {
  local cmd="$1"
  local name="$2"
  local required="$3"
  
  local path_cmd=$(which "$cmd" 2>/dev/null || echo "")
  
  if [ -n "$path_cmd" ]; then
    local version=""
    case "$cmd" in
      node)
        version=$("$cmd" --version 2>/dev/null | head -1 || echo "unknown")
        ;;
      npm|pnpm|yarn)
        version=$("$cmd" --version 2>/dev/null | head -1 || echo "unknown")
        ;;
      git)
        version=$("$cmd" --version 2>/dev/null | head -1 | awk '{print $3}' || echo "unknown")
        ;;
      docker)
        version=$("$cmd" --version 2>/dev/null | awk '{print $3}' | tr -d ',' || echo "unknown")
        ;;
      python3|python)
        version=$("$cmd" --version 2>/dev/null | awk '{print $2}' || echo "unknown")
        ;;
      curl)
        version=$("$cmd" --version 2>/dev/null | head -1 | awk '{print $2}' || echo "unknown")
        ;;
      jq)
        version=$("$cmd" --version 2>/dev/null || echo "unknown")
        ;;
      *)
        version=$("$cmd" --version 2>/dev/null | head -1 || echo "installed")
        ;;
    esac
    
    printf "  ${CHECK} %-15s %-17s %s\n" "$cmd" "$version" "$path_cmd"
    return 0
  else
    if [ "$required" = "true" ]; then
      printf "  ${MISSING} ${RED}%-15s${RESET} ${RED}%-17s${RESET} -\n" "$cmd" "Missing"
      ((MISSING_COUNT++))
    else
      printf "  ${OPTIONAL} ${BLUE}%-15s${RESET} ${BLUE}%-17s${RESET} Install if needed\n" "$cmd" "Not found"
      ((OPTIONAL_MISSING++))
    fi
    return 1
  fi
}

check_config_files() {
  echo -e "${BOLD}CONFIGURATION FILES${RESET}"
  echo -e "${CYAN}───────────────────${RESET}"
  
  for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$file" ]; then
      printf "  ${CHECK} %-20s Found\n" "$file"
    else
      printf "  ${MISSING} ${RED}%-20s${RESET} Not found\n" "$file"
      ((MISSING_COUNT++))
    fi
  done
  echo
}

check_env_vars() {
  echo -e "${BOLD}KEY ENVIRONMENT VARIABLES${RESET}"
  echo -e "${CYAN}────────────────────────${RESET}"
  
  local important_vars=("HOME" "PATH" "USER" "SHELL" "NODE_ENV")
  
  for var in "${important_vars[@]}"; do
    if [ -n "${!var}" ]; then
      local val="${!var}"
      # Truncate long values
      if [ ${#val} -gt 40 ]; then
        val="${val:0:37}..."
      fi
      echo -e "  ${CHECK} ${var.padEnd(15)} ${val}"
    else
      echo -e "  ${OPTIONAL} ${BLUE}${var.padEnd(15)}${RESET} Not set"
    fi
  done
  echo
}

# Main
print_header

echo -e "${BOLD}PLATFORM${RESET}"
echo -e "${CYAN}────────${RESET}"
echo -e "  OS:     $(uname -s)"
echo -e "  Arch:   $(uname -m)"
echo
echo -e "${BOLD}REQUIRED TOOLS${RESET}"
echo -e "${CYAN}──────────────${RESET}"

for tool in "${!REQUIRED_TOOLS[@]}"; do
  check_tool "$tool" "${REQUIRED_TOOLS[$tool]}" "true"
done
echo

echo -e "${BOLD}OPTIONAL TOOLS${RESET}"
echo -e "${CYAN}──────────────${RESET}"

for tool in "${!OPTIONAL_TOOLS[@]}"; do
  check_tool "$tool" "${OPTIONAL_TOOLS[$tool]}" "false"
done
echo

# Check config files
check_config_files

# Check env vars
check_env_vars

# Check for specific required commands
if [ -n "$NEED_LIST" ]; then
  echo -e "${BOLD}REQUESTED TOOLS${RESET}"
  echo -e "${CYAN}───────────────${RESET}"
  
  IFS=',' read -ra NEEDS <<< "$NEED_LIST"
  for need in "${NEEDS[@]}"; do
    need=$(echo "$need" | xargs) # trim
    check_tool "$need" "" "true"
  done
  echo
fi

# Summary
echo -e "${CYAN}══════════════════════════════════════════════════════════════════${RESET}"
if [ $MISSING_COUNT -eq 0 ]; then
  echo -e "${GREEN}${BOLD}Status: ✓ ALL GOOD${RESET}"
elif [ $MISSING_COUNT -gt 0 ]; then
  echo -e "${RED}${BOLD}Status: ✗ MISSING ($MISSING_COUNT required)${RESET}"
else
  echo -e "${YELLOW}${BOLD}Status: ⚠ WARNING ($MISSING_COUNT issues)${RESET}"
fi
echo -e "${CYAN}══════════════════════════════════════════════════════════════════${RESET}"

exit $MISSING_COUNT
