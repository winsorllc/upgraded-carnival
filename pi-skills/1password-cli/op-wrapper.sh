#!/bin/bash
# 1Password CLI wrapper for PopeBot

set -e

COMMAND="${1:-}"
shift || true

# Check if op is installed
if ! command -v op &> /dev/null && [ "$COMMAND" != "help" ] && [ "$COMMAND" != "install" ]; then
    echo "Error: 1Password CLI (op) not installed"
    echo "Install with: brew install --cask 1password-cli"
    echo ""
    COMMAND="help"
fi

case "$COMMAND" in
    install)
        echo "Installing 1Password CLI..."
        
        if [ "$(uname)" = "Darwin" ]; then
            echo "Run: brew install --cask 1password-cli"
        elif [ "$(uname)" = "Linux" ]; then
            echo "Installing on Linux..."
            curl -sS https://downloads.1password.com/linux/keys/1password.asc | \
                sudo gpg --dearmor --output /usr/share/keyrings/1password-archive-keyring.gpg 2>/dev/null || \
                echo "Warning: Could not import key"
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/1password-archive-keyring.gpg] https://downloads.1password.com/linux/debian/$(dpkg --print-architecture) stable main" | \
                sudo tee /etc/apt/sources.list.d/1password.list > /dev/null
            sudo apt update && sudo apt install -y 1password-cli
        fi
        ;;
    
    signin)
        op signin "$@"
        ;;
    
    signout)
        op signout "$@"
        ;;
    
    vault-list)
        op vault list "$@"
        ;;
    
    vault-create)
        op vault create "$@"
        ;;
    
    list|item-list)
        if [ -n "$1" ]; then
            op item list --vault "$@"
        else
            op item list
        fi
        ;;
    
    get|item-get)
        if [ -z "$1" ]; then
            echo "Usage: op-get <item-name>"
            exit 1
        fi
        op item get "$1" --format json "$@"
        ;;
    
    read)
        if [ -z "$1" ]; then
            echo "Usage: op-read <item> [--fields field]"
            exit 1
        fi
        op read "$@"
        ;;
    
    create|item-create)
        op item create "$@"
        ;;
    
    edit|item-edit)
        if [ -z "$1" ]; then
            echo "Usage: op-edit <item> [--field value]"
            exit 1
        fi
        op item edit "$@"
        ;;
    
    delete|item-delete)
        if [ -z "$1" ]; then
            echo "Usage: op-delete <item>"
            exit 1
        fi
        op item delete "$@"
        ;;
    
    document-list)
        op document list "$@"
        ;;
    
    document-attach)
        op document attach "$@"
        ;;
    
    document-get)
        if [ -z "$1" ]; then
            echo "Usage: op-document-get <name> [--output dir]"
            exit 1
        fi
        op document get "$@"
        ;;
    
    help|--help|-h)
        echo "1Password CLI Wrapper for PopeBot"
        echo ""
        echo "Usage: op-wrapper <command> [args]"
        echo ""
        echo "Commands:"
        echo "  install              Install 1Password CLI"
        echo "  signin              Sign in to 1Password"
        echo "  vault-list          List vaults"
        echo "  vault-create        Create vault"
        echo "  list [vault]        List items"
        echo "  get <item>          Get item details"
        echo "  read <item>         Read item (use --fields password)"
        echo "  create              Create item"
        echo "  edit <item>         Edit item"
        echo "  delete <item>       Delete item"
        echo "  document-list       List documents"
        echo "  document-attach     Attach document"
        echo "  document-get        Get document"
        echo ""
        echo "Note: Run 'op signin' first to authenticate"
        ;;
    
    *)
        # Pass through to op CLI
        if [ -n "$COMMAND" ]; then
            op "$COMMAND" "$@"
        else
            echo "1Password CLI Wrapper"
            echo "Run with --help for usage"
            op --help
        fi
        ;;
esac
