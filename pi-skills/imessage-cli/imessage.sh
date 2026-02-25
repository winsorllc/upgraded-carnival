#!/bin/bash
# iMessage CLI wrapper for PopeBot (uses AppleScript)

# Check for help flag first
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    COMMAND="help"
else
    COMMAND="${1:-help}"
    shift || true
fi

# Only check macOS for actual commands (not help)
if [ "$(uname)" != "Darwin" ] && [ "$COMMAND" != "help" ]; then
    echo "Error: iMessage only works on macOS"
    echo ""
    echo "iMessage CLI for PopeBot"
    echo ""
    echo "Usage: imessage <command> [args]"
    echo ""
    echo "Commands:"
    echo "  send <recipient> <message>     Send iMessage"
    echo "  read <chat> [limit]             Read chat messages"
    echo "  list-chats                     List all chats"
    echo "  contact-find <query>           Find contact by name/phone"
    echo ""
    echo "Note: Requires macOS with Messages.app"
    exit 1
fi

case "$COMMAND" in
    send)
        RECIPIENT="$1"
        MESSAGE="$2"
        
        if [ -z "$RECIPIENT" ] || [ -z "$MESSAGE" ]; then
            echo "Usage: imessage-send <recipient> <message>"
            exit 1
        fi
        
        # Use AppleScript to send iMessage
        osascript -e "
        tell application \"Messages\"
            send \"$MESSAGE\" to buddy \"$RECIPIENT\"
        end tell" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo "✓ Message sent to $RECIPIENT"
        else
            echo "✗ Failed to send message"
            exit 1
        fi
        ;;
    
    read)
        CHAT="$1"
        LIMIT="${2:-10}"
        
        if [ -z "$CHAT" ]; then
            echo "Usage: imessage-read <chat-name> [limit]"
            exit 1
        fi
        
        osascript -e "
        tell application \"Messages\"
            set chatName to \"$CHAT\"
            set msgCount to $LIMIT
            set output to \"\"
            repeat with aChat in chats
                if name of aChat contains chatName then
                    set msgList to messages of aChat
                    set totalCount to length of msgList
                    set startIdx to totalCount - msgCount + 1
                    if startIdx < 1 then set startIdx to 1
                    repeat with i from startIdx to totalCount
                        set aMsg to item i of msgList
                        set senderName to sender of aMsg
                        set msgText to content of aMsg
                        set msgDate to time sent of aMsg
                        set output to output & senderName & \": \" & msgText & \" (\" & msgDate & \")\" & linefeed
                    end repeat
                    exit repeat
                end if
            end repeat
            return output
        end tell" 2>/dev/null
        ;;
    
    list-chats)
        osascript -e "
        tell application \"Messages\"
            set chatList to {}
            repeat with aChat in chats
                set chatName to name of aChat
                set lastMsg to \"\"
                set msgCount to (length of messages of aChat)
                if msgCount > 0 then
                    set lastMsg to content of item msgCount of messages of aChat
                end if
                set chatList to chatList & {chatName & \" (\" & msgCount & \" messages)\"}
            end repeat
            return chatList as text
        end tell" 2>/dev/null
        ;;
    
    contact-find)
        SEARCH="$1"
        
        if [ -z "$SEARCH" ]; then
            echo "Usage: imessage-contact <name-or-phone>"
            exit 1
        fi
        
        # Use Contacts app via AppleScript
        osascript -e "
        tell application \"Contacts\"
            set matches to {}
            set searchTerm to \"$SEARCH\"
            repeat with p in people
                set found to false
                set personName to name of p
                if personName contains searchTerm then set found to true
                repeat with ph in phones of p
                    if ph as text contains searchTerm then set found to true
                end repeat
                if found then
                    set phoneList to {}
                    repeat with ph in phones of p
                        set end of phoneList to ph as text
                    end repeat
                    set matches to matches & (personName & \": \" & phoneList as text)
                end if
            end repeat
            return matches as text
        end tell" 2>/dev/null
        ;;
    
    help)
        echo "iMessage CLI for PopeBot"
        echo ""
        echo "Usage: imessage <command> [args]"
        echo ""
        echo "Commands:"
        echo "  send <recipient> <message>     Send iMessage"
        echo "  read <chat> [limit]             Read chat messages"
        echo "  list-chats                     List all chats"
        echo "  contact-find <query>           Find contact by name/phone"
        echo ""
        echo "Note: Requires macOS with Messages.app"
        ;;
    
    *)
        echo "iMessage CLI for PopeBot"
        echo ""
        echo "Usage: imessage <command> [args]"
        echo ""
        echo "Commands:"
        echo "  send <recipient> <message>     Send iMessage"
        echo "  read <chat> [limit]             Read chat messages"
        echo "  list-chats                     List all chats"
        echo "  contact-find <query>           Find contact by name/phone"
        echo ""
        echo "Note: Requires macOS with Messages.app"
        ;;
esac
