#!/bin/bash
#
# Port Scanner - TCP port scanning tool
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

OPEN="${GREEN}OPEN${RESET}"
CLOSED="${RED}CLOSED${RESET}"

TARGET=""
SINGLE_PORT=""
PORT_RANGE=""
PORT_LIST=""
QUICK=false
TIMEOUT=2

# Common ports and their services
declare -A PORT_SERVICES=(
  [21]="ftp"
  [22]="ssh"
  [23]="telnet"
  [25]="smtp"
  [53]="dns"
  [80]="http"
  [110]="pop3"
  [143]="imap"
  [443]="https"
  [3306]="mysql"
  [5432]="postgresql"
  [6379]="redis"
  [8080]="http-alt"
  [8443]="https-alt"
)

# Common ports for quick scan
COMMON_PORTS=(22 80 443 3306 5432 6379 8080 8443)

show_help() {
  echo "Usage: portscan.sh <host> [options]"
  echo
  echo "Options:"
  echo "  --port, -p <port>       Scan single port"
  echo "  --range, -r <start-end> Scan port range"
  echo "  --ports <list>          Comma-separated port list"
  echo "  --quick, -q             Scan common ports only"
  echo "  --timeout <sec>         Connection timeout (default: 2)"
  echo "  --help, -h              Show this help"
  echo
  echo "Common ports: 22(ssh), 80(http), 443(https), 3306(mysql), 5432(postgres), 6379(redis), 8080(http-alt)"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --port|-p)
      SINGLE_PORT="$2"
      shift 2
      ;;
    --range|-r)
      PORT_RANGE="$2"
      shift 2
      ;;
    --ports)
      PORT_LIST="$2"
      shift 2
      ;;
    --quick|-q)
      QUICK=true
      shift
      ;;
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    -*)
      echo -e "${RED}Unknown option: $1${RESET}"
      show_help
      exit 1
      ;;
    *)
      if [ -z "$TARGET" ]; then
        TARGET="$1"
      fi
      shift
      ;;
  esac
done

# Validate target
if [ -z "$TARGET" ]; then
  echo -e "${RED}Error: Target host required${RESET}"
  show_help
  exit 1
fi

# Build port list to scan
PORTS_TO_SCAN=()

if [ -n "$SINGLE_PORT" ]; then
  PORTS_TO_SCAN=($SINGLE_PORT)
elif [ -n "$PORT_RANGE" ]; then
  START=$(echo "$PORT_RANGE" | cut -d'-' -f1)
  END=$(echo "$PORT_RANGE" | cut -d'-' -f2)
  for ((p=START; p<=END; p++)); do
    PORTS_TO_SCAN+=($p)
  done
elif [ -n "$PORT_LIST" ]; then
  IFS=',' read -ra PORTS_TO_SCAN <<< "$PORT_LIST"
elif [ "$QUICK" = true ]; then
  PORTS_TO_SCAN=(${COMMON_PORTS[@]})
else
  # Default: scan common ports
  PORTS_TO_SCAN=(${COMMON_PORTS[@]})
fi

print_header() {
  echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${CYAN}║${BOLD}                      PORT SCAN RESULTS                         ${RESET}${CYAN}║${RESET}"
  echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${RESET}"
  echo
  echo -e "${BOLD}Target:${RESET} ${BLUE}$TARGET${RESET}"
  echo -e "${BOLD}Ports Scanned:${RESET} ${#PORTS_TO_SCAN[@]}"
  echo
}

scan_port() {
  local host="$1"
  local port="$2"
  local tmo="${3:-2}"
  
  # Try to connect with timeout
  if timeout $tmo bash -c "> /dev/tcp/$host/$port" 2>/dev/null; then
    echo "open"
  else
    echo "closed"
  fi
}

get_service() {
  local port="$1"
  if [ -n "${PORT_SERVICES[$port]}" ]; then
    echo "${PORT_SERVICES[$port]}"
  else
    # Try /etc/services lookup
    local svc=$(grep "^[^#]* $port/tcp" /etc/services 2>/dev/null | head -1 | awk '{print $1}')
    if [ -n "$svc" ]; then
      echo "$svc"
    else
      echo "unknown"
    fi
  fi
}

print_header

echo -e "${BOLD}PORT      STATE     SERVICE${RESET}"
echo -e "${CYAN}────────────────────────────────${RESET}"

OPEN_COUNT=0
CLOSED_COUNT=0

START_TIME=$(date +%s)

for port in "${PORTS_TO_SCAN[@]}"; do
  # Skip invalid ports
  if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
    continue
  fi
  
  state=$(scan_port "$TARGET" "$port" $TIMEOUT)
  service=$(get_service "$port")
  
  if [ "$state" = "open" ]; then
    printf "  %4d    ${GREEN}%-7s${RESET}   %s\n" "$port" "OPEN" "$service"
    ((OPEN_COUNT++))
  else
    printf "  %4d    ${RED}%-7s${RESET}   %s\n" "$port" "CLOSED" "$service"
    ((CLOSED_COUNT++))
  fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo
echo -e "${CYAN}────────────────────────────────────────────────────────────────${RESET}"
echo -e "${BOLD}Summary:${RESET} ${GREEN}$OPEN_COUNT open${RESET} | ${RED}$CLOSED_COUNT closed${RESET} | Duration: ${DURATION}s"
echo -e "${CYAN}────────────────────────────────────────────────────────────────${RESET}"
