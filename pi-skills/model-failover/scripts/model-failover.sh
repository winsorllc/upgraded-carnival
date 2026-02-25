#!/bin/bash
# Model failover wrapper - automatically falls back to backup providers

set -e

PROMPT="${1:-}"
CONFIG_FILE="${CONFIG_FILE:-}"
TIMEOUT="${TIMEOUT:-30}"
RETRIES="${RETRIES:-1}"
PROVIDER="${PROVIDER:-}"

# Default fallback chain
FALLBACK_CHAIN=(
    "anthropic:claude-3-5-sonnet-20241022"
    "openai:gpt-4o"
    "google:gemini-2.0-flash-exp"
)

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --config)
            CONFIG_FILE="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --retries)
            RETRIES="$2"
            shift 2
            ;;
        --provider)
            PROVIDER="$2"
            shift 2
            ;;
        *)
            PROMPT="$1"
            shift
            ;;
    esac
done

if [ -z "$PROMPT" ]; then
    echo "Usage: $0 <prompt> [options]"
    echo "  --config <file>   Config file with fallback chain"
    echo "  --timeout <sec>   Timeout per provider (default: 30)"
    echo "  --retries <n>    Retries per provider (default: 1)"
    echo "  --provider <name> Use specific provider only"
    exit 1
fi

# Call provider
call_provider() {
    local provider="$1"
    local model="$2"
    local prompt="$3"
    
    case "$provider" in
        anthropic)
            if [ -z "$ANTHROPIC_API_KEY" ]; then
                echo "Error: ANTHROPIC_API_KEY not set" >&2
                return 1
            fi
            # Use Claude API
            curl -s -X POST "https://api.anthropic.com/v1/messages" \
                -H "x-api-key: $ANTHROPIC_API_KEY" \
                -H "anthropic-version: 2023-06-01" \
                -H "content-type: application/json" \
                -d "{\"model\":\"$model\",\"max_tokens\":1024,\"messages\":[{\"role\":\"user\",\"content\":\"$prompt\"}]}" \
                --max-time "$TIMEOUT" | jq -r '.content[].text' 2>/dev/null
            ;;
        openai)
            if [ -z "$OPENAI_API_KEY" ]; then
                echo "Error: OPENAI_API_KEY not set" >&2
                return 1
            fi
            # Use OpenAI API
            curl -s -X POST "https://api.openai.com/v1/chat/completions" \
                -H "Authorization: Bearer $OPENAI_API_KEY" \
                -H "content-type: application/json" \
                -d "{\"model\":\"$model\",\"messages\":[{\"role\":\"user\",\"content\":\"$prompt\"}],\"max_tokens\":1024}" \
                --max-time "$TIMEOUT" | jq -r '.choices[].message.content' 2>/dev/null
            ;;
        google)
            if [ -z "$GOOGLE_API_KEY" ]; then
                echo "Error: GOOGLE_API_KEY not set" >&2
                return 1
            fi
            # Use Google Gemini API
            curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$GOOGLE_API_KEY" \
                -H "content-type: application/json" \
                -d "{\"contents\":[{\"parts\":[{\"text\":\"$prompt\"}]}]}" \
                --max-time "$TIMEOUT" | jq -r '.candidates[].content.parts[].text' 2>/dev/null
            ;;
        *)
            echo "Unknown provider: $provider" >&2
            return 1
            ;;
    esac
}

# Main fallback logic
main() {
    local chain=("${FALLBACK_CHAIN[@]}")
    local failures=()
    
    # Override chain if provider specified
    if [ -n "$PROVIDER" ]; then
        chain=("$PROVIDER:default")
    fi
    
    # Try each provider in chain
    for entry in "${chain[@]}"; do
        provider="${entry%%:*}"
        model="${entry#*:}"
        
        if [ "$model" = "default" ]; then
            # Set default models
            case "$provider" in
                anthropic) model="claude-3-5-sonnet-20241022" ;;
                openai) model="gpt-4o" ;;
                google) model="gemini-2.0-flash-exp" ;;
            esac
        fi
        
        echo "Trying $provider ($model)..." >&2
        
        if response=$(call_provider "$provider" "$model" "$PROMPT" 2>&1); then
            if [ -n "$response" ]; then
                echo "Provider: $provider" >&2
                echo "Model: $model" >&2
                echo "$response"
                return 0
            fi
        fi
        
        failures+=("$provider: $response")
        echo "Failed, trying next provider..." >&2
    done
    
    echo "All providers failed:" >&2
    for failure in "${failures[@]}"; do
        echo "  - $failure" >&2
    done
    return 1
}

main
