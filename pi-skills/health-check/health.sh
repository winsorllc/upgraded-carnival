#!/bin/bash
# Health Check - HTTP endpoint health checking
set -euo pipefail

# Default values
TIMEOUT=30
CONNECT_TIMEOUT=5
READ_TIMEOUT=10
RETRIES=0
EXPECT_STATUS=""
EXPECT_BODY=""
EXPECT_JSON=""
INSECURE=false
CERT_FILE=""
KEY_FILE=""
FORMAT="short"
FILE=""
SHOW_HEADERS=false
FOLLOW_REDIRECTS=5
PARALLEL=false
URLS=()

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Usage
usage() {
    cat << EOF
Usage: $(basename "$0") <url> [options]
       $(basename "$0") --file <file> [options]

Check HTTP endpoint health.

URL Options:
  url(s)                     One or more URLs to check
  --file FILE               Read URLs from file (one per line)

Request Options:
  --timeout SECS             Total request timeout (default: 30)
  --connect-timeout SECS    Connection timeout (default: 5)
  --read-timeout SECS        Read timeout (default: 10)
  --retries N               Retry attempts (default: 0)
  --insecure                Skip SSL verification
  --cert FILE               Client certificate file
  --key FILE                Client certificate key file
  --follow-redirects N      Max redirects to follow (default: 5)

Validation Options:
  --expect-status CODES     Expected status codes (e.g., "200,201,301")
  --expect-body REGEX       Expected body content pattern
  --expect-json PATH=VALUE  JSON path check (e.g., ".status=ok")

Output Options:
  --format FORMAT           Output format: short, detailed, json, table
  --headers                 Show response headers
  --parallel                Check URLs in parallel

EOF
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --connect-timeout)
            CONNECT_TIMEOUT="$2"
            shift 2
            ;;
        --read-timeout)
            READ_TIMEOUT="$2"
            shift 2
            ;;
        --retries)
            RETRIES="$2"
            shift 2
            ;;
        --expect-status)
            EXPECT_STATUS="$2"
            shift 2
            ;;
        --expect-body)
            EXPECT_BODY="$2"
            shift 2
            ;;
        --expect-json)
            EXPECT_JSON="$2"
            shift 2
            ;;
        --insecure)
            INSECURE=true
            shift
            ;;
        --cert)
            CERT_FILE="$2"
            shift 2
            ;;
        --key)
            KEY_FILE="$2"
            shift 2
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        --file)
            FILE="$2"
            shift 2
            ;;
        --headers)
            SHOW_HEADERS=true
            shift
            ;;
        --follow-redirects)
            FOLLOW_REDIRECTS="$2"
            shift 2
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        http://*|https://*)
            URLS+=("$1")
            shift
            ;;
        -*)
            echo "Unknown option: $1" >&2
            exit 2
            ;;
        *)
            # Could be URL without scheme
            if [[ "$1" =~ ^[a-zA-Z0-9] ]]; then
                # Assume http for non-URL strings
                if [[ -z "$FILE" ]] && [[ ! -f "$1" ]]; then
                    echo "Error: Not a valid URL: $1" >&2
                    exit 2
                fi
            fi
            FILE="$1"
            shift
            ;;
    esac
done

# Read URLs from file if specified
if [[ -n "$FILE" ]]; then
    if [[ ! -f "$FILE" ]]; then
        echo "Error: File not found: $FILE" >&2
        exit 2
    fi
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Skip empty lines and comments
        [[ -z "$line" ]] && continue
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        URLS+=("$line")
    done < "$FILE"
fi

# Validate
if [[ ${#URLS[@]} -eq 0 ]]; then
    echo "Error: No URLs specified" >&2
    usage
fi

# Check a single URL
check_url() {
    local url="$1"
    local result
    result=$(mktemp)
    local cert_info
    cert_info=$(mktemp)
    
    # Build curl command
    local curl_args=()
    curl_args+=("-s" "-o" "$result")
    curl_args+=("-w" "%{http_code}|%{time_total}|%{time_namelookup}|%{time_connect}|%{time_appconnect}|%{content_type}|%{size_download}|%{ssl_verify_result}|%{url_effective}")
    curl_args+=("--connect-timeout" "$CONNECT_TIMEOUT")
    curl_args+=("--max-time" "$TIMEOUT")
    curl_args+=("-L")
    curl_args+=("--max-redirs" "$FOLLOW_REDIRECTS")
    
    if [[ "$INSECURE" == "true" ]]; then
        curl_args+=("-k")
    fi
    
    if [[ -n "$CERT_FILE" ]]; then
        curl_args+=("--cert" "$CERT_FILE")
    fi
    
    if [[ -n "$KEY_FILE" ]]; then
        curl_args+=("--key" "$KEY_FILE")
    fi
    
    # Execute curl
    local curl_output
    local exit_code=0
    
    set +e
    curl_output=$(curl "${curl_args[@]}" "$url" 2>&1)
    exit_code=$?
    set -e
    
    # Parse response
    local status dns_time connect_time tls_time total_time content_type size ssl_verify effective_url=""
    
    if [[ $exit_code -eq 0 ]]; then
        IFS='|' read -r status total_time dns_time connect_time tls_time content_type size ssl_verify effective_url <<< "$curl_output"
        
        # Convert times to milliseconds
        dns_time=$(echo "$dns_time * 1000" | bc -l | cut -d. -f1)
        connect_time=$(echo "$connect_time * 1000" | bc -l | cut -d. -f1)
        tls_time=$(echo "$tls_time * 1000" | bc -l | cut -d. -f1)
        total_time=$(echo "$total_time * 1000" | bc -l | cut -d. -f1)
        
        # Get SSL certificate info if HTTPS
        local cert_valid="N/A"
        local cert_expires=""
        if [[ "$url" =~ ^https:// ]]; then
            cert_info_output=$(echo | openssl s_client -servername "$(echo "$url" | sed -E 's#https?://([^/]*).*#\1#')" -connect "$(echo "$url" | sed -E 's#https?://([^/:]*)(:[0-9]+)?.*#\1:443#')" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")
            if [[ -n "$cert_info_output" ]]; then
                cert_expires=$(echo "$cert_info_output" | grep -oP 'notAfter=\K.*' | head -1)
                if [[ -n "$cert_expires" ]]; then
                    cert_valid="Expires: $cert_expires"
                fi
            fi
        fi
        
        # Check expected status
        local status_ok=true
        if [[ -n "$EXPECT_STATUS" ]]; then
            IFS=',' read -ra EXPECTED_CODES <<< "$EXPECT_STATUS"
            local found=false
            for code in "${EXPECTED_CODES[@]}"; do
                if [[ "$status" == "$code" ]]; then
                    found=true
                    break
                fi
            done
            [[ "$found" != "true" ]] && status_ok=false
        else
            # Default: expect 2xx
            if [[ ! "$status" =~ ^2[0-9]{2}$ ]]; then
                status_ok=false
            fi
        fi
        
        # Check expected body
        local body_ok=true
        local body_content=""
        if [[ -n "$EXPECT_BODY" ]]; then
            body_content=$(cat "$result")
            if ! echo "$body_content" | grep -qE "$EXPECT_BODY"; then
                body_ok=false
            fi
        fi
        
        # Check expected JSON
        local json_ok=true
        if [[ -n "$EXPECT_JSON" ]]; then
            local json_path json_value
            IFS='=' read -r json_path json_value <<< "$EXPECT_JSON"
            body_content=$(cat "$result")
            local actual_value
            actual_value=$(echo "$body_content" | jq -r "$json_path" 2>/dev/null || echo "")
            [[ "$actual_value" != "$json_value" ]] && json_ok=false
        fi
        
        # Determine overall health
        local healthy=true
        [[ "$status_ok" != "true" ]] && healthy=false
        [[ "$body_ok" != "true" ]] && healthy=false
        [[ "$json_ok" != "true" ]] && healthy=false
        
        # Output based on format
        case "$FORMAT" in
            short)
                if [[ "$healthy" == "true" ]]; then
                    echo -e "${GREEN}✅${NC} $url ($status, ${total_time}ms)"
                else
                    echo -e "${RED}❌${NC} $url ($status, ${total_time}ms)"
                fi
                ;;
            detailed)
                echo "URL: $url"
                echo "Status: $status"
                echo "Response Time: ${total_time}ms"
                echo "DNS Time: ${dns_time}ms"
                echo "Connect Time: ${connect_time}ms"
                [[ "$url" =~ ^https:// ]] && echo "TLS Time: ${tls_time}ms"
                echo "Content-Type: $content_type"
                echo "Content-Length: $size bytes"
                [[ -n "$cert_expires" ]] && echo "Certificate: Valid ($cert_expires)"
                if [[ "$healthy" == "true" ]]; then
                    echo -e "Health: ${GREEN}✅ Healthy${NC}"
                else
                    echo -e "Health: ${RED}❌ Unhealthy${NC}"
                    [[ "$status_ok" != "true" ]] && echo "  - Unexpected status code: $status"
                    [[ "$body_ok" != "true" ]] && echo "  - Body pattern not found: $EXPECT_BODY"
                    [[ "$json_ok" != "true" ]] && echo "  - JSON check failed: $EXPECT_JSON"
                fi
                echo ""
                ;;
            json)
                cat << EOF
{
  "url": "$url",
  "status": $status,
  "statusText": "$(curl -s -o /dev/null -w "%{http_code}" "$url" | sed 's/'"$status"'//')",
  "responseTime": $total_time,
  "dnsTime": $dns_time,
  "connectTime": $connect_time,
  "tlsTime": $tls_time,
  "contentType": "$content_type",
  "size": $size,
  "certificate": {
    "valid": $([[ -n "$cert_expires" ]] && echo "true" || echo "null"),
    "expiresAt": $([[ -n "$cert_expires" ]] && echo "\"$cert_expires\"" || echo "null")
  },
  "healthy": $healthy
}
EOF
                ;;
            table)
                if [[ "$healthy" == "true" ]]; then
                    echo -e "$url|${GREEN}$status${NC}|${GREEN}${total_time}ms${NC}|${GREEN}✅${NC}"
                else
                    echo -e "$url|${RED}$status${NC}|${RED}${total_time}ms${NC}|${RED}❌${NC}"
                fi
                ;;
        esac
        
        # Return exit code
        if [[ "$healthy" == "true" ]]; then
            rm -f "$result" "$cert_info"
            return 0
        else
            rm -f "$result" "$cert_info"
            return 1
        fi
    else
        # Curl failed
        case "$FORMAT" in
            short)
                echo -e "${RED}❌${NC} $url (failed: $curl_output)"
                ;;
            detailed)
                echo "URL: $url"
                echo "Status: Error"
                echo -e "Health: ${RED}❌ Failed${NC}"
                echo "Error: $curl_output"
                echo ""
                ;;
            json)
                cat << EOF
{
  "url": "$url",
  "status": 0,
  "statusText": "Error",
  "error": "$curl_output",
  "healthy": false
}
EOF
                ;;
            table)
                echo -e "$url|${RED}Error${NC}|${RED}-${NC}|${RED}❌${NC}"
                ;;
        esac
        rm -f "$result" "$cert_info"
        return 1
    fi
}

# Table header
if [[ "$FORMAT" == "table" ]]; then
    echo "URL|Status|Time|Healthy"
    echo "---|---|---|---"
fi

# Check URLs
if [[ "$PARALLEL" == "true" ]] && [[ ${#URLS[@]} -gt 1 ]]; then
    # Parallel checking
    pids=()
    for url in "${URLS[@]}"; do
        check_url "$url" &
        pids+=($!)
    done
    
    # Wait for all to complete
    failed=0
    for pid in "${pids[@]}"; do
        wait "$pid" || ((failed++))
    done
    
    [[ $failed -gt 0 ]] && exit 1
else
    # Sequential checking
    failed=0
    for url in "${URLS[@]}"; do
        check_url "$url" || ((failed++))
    done
    
    [[ $failed -gt 0 ]] && exit 1
fi

exit 0