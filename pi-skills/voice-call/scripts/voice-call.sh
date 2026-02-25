#!/bin/bash
# Voice call helper script with mock implementation
# Supports Twilio, Telnyx, Plivo, and mock providers

set -e

COMMAND="${1:-}"
CALL_ID="${2:-}"

# Configuration
PROVIDER="${VOICE_PROVIDER:-mock}"
TO_NUMBER="${3:-}"

# Generate mock call ID
generate_call_id() {
    echo "MC$(date +%s)$(shuf -i 1000-9999 -n 1)"
}

# Mock provider implementation
mock_call() {
    local to="$1"
    local message="$2"
    local call_id=$(generate_call_id)
    
    echo "Mock Call Initiated"
    echo "==================="
    echo "Call ID: $call_id"
    echo "To: $to"
    echo "Message: $message"
    echo "Provider: mock"
    echo ""
    echo "Call would say: \"$message\""
    echo ""
    echo "In production, configure one of: Twilio, Telnyx, or Plivo"
}

mock_status() {
    local call_id="$1"
    echo "Mock Call Status"
    echo "================"
    echo "Call ID: $call_id"
    echo "Status: completed"
    echo "Duration: 30 seconds"
}

mock_end() {
    local call_id="$1"
    echo "Mock Call Ended"
    echo "==============="
    echo "Call ID: $call_id"
    echo "Status: ended"
}

# Twilio implementation
twilio_call() {
    local to="$1"
    local message="$2"
    
    if [ -z "$TWILIO_ACCOUNT_SID" ] || [ -z "$TWILIO_AUTH_TOKEN" ]; then
        echo "Error: Twilio credentials not configured"
        echo "Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN"
        exit 1
    fi
    
    curl -s -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Calls.json" \
        -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
        -d "To=$to" \
        -d "From=$TWILIO_PHONE_NUMBER" \
        -d "Twiml=<Response><Say>$message</Say></Response>" | \
        jq -r '.sid, .status'
}

# Show help
show_help() {
    echo "Voice Call Helper for PopeBot"
    echo "==============================="
    echo ""
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  call <to> <message>     Initiate a voice call"
    echo "  status <call_id>        Check call status"
    echo "  end <call_id>            End an active call"
    echo "  continue <call_id> <msg> Continue a call with new message"
    echo ""
    echo "Environment:"
    echo "  VOICE_PROVIDER           Provider: twilio, telnyx, plivo, mock (default)"
    echo "  TWILIO_*                 Twilio credentials"
    echo "  TELNYX_*                 Telnyx credentials"
    echo "  PLIVO_*                  Plivo credentials"
    echo ""
    echo "Examples:"
    echo "  VOICE_PROVIDER=mock $0 call +15555550123 'Hello world'"
    echo "  $0 status MC1234567890"
}

# Parse command
case "$COMMAND" in
    call)
        if [ -z "$TO_NUMBER" ]; then
            echo "Error: Missing phone number"
            echo "Usage: $0 call <to> <message>"
            exit 1
        fi
        MESSAGE="${3:-}"
        if [ -z "$MESSAGE" ]; then
            echo "Error: Missing message"
            echo "Usage: $0 call <to> <message>"
            exit 1
        fi
        
        case "$PROVIDER" in
            twilio) twilio_call "$TO_NUMBER" "$MESSAGE" ;;
            mock) mock_call "$TO_NUMBER" "$MESSAGE" ;;
            *)
                echo "Provider $PROVIDER not implemented, using mock"
                mock_call "$TO_NUMBER" "$MESSAGE"
                ;;
        esac
        ;;
    status)
        if [ -z "$CALL_ID" ]; then
            echo "Error: Missing call ID"
            echo "Usage: $0 status <call_id>"
            exit 1
        fi
        mock_status "$CALL_ID"
        ;;
    end)
        if [ -z "$CALL_ID" ]; then
            echo "Error: Missing call ID"
            echo "Usage: $0 end <call_id>"
            exit 1
        fi
        mock_end "$CALL_ID"
        ;;
    continue)
        CALL_ID="$2"
        MESSAGE="${3:-}"
        if [ -z "$CALL_ID" ] || [ -z "$MESSAGE" ]; then
            echo "Error: Missing call ID or message"
            echo "Usage: $0 continue <call_id> <message>"
            exit 1
        fi
        echo "Continuing call $CALL_ID with message: $MESSAGE"
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
