#!/bin/bash
# Gmail SMTP email sender using curl

if [ $# -lt 3 ]; then
    echo "Usage: $0 <to> <subject> <body>"
    echo "Environment variables required:"
    echo "  GMAIL_USER - Gmail address (or App Password)"
    echo "  GMAIL_PASS - Gmail password or App Password"
    echo ""
    echo "Example:"
    echo "  GMAIL_USER=myemail@gmail.com GMAIL_PASS=xxxxx $0 user@example.com 'Subject' 'Body'"
    exit 1
fi

TO="$1"
SUBJECT="$2"
BODY="$3"
FROM="${GMAIL_USER:-thepopebot@gmail.com}"

if [ -z "$GMAIL_PASS" ]; then
    echo "Error: GMAIL_PASS not set"
    exit 1
fi

# Create temp file for email content
EMAIL_FILE="/tmp/email_$$.txt"

cat > "$EMAIL_FILE" <<EOF
To: $TO
From: $FROM
Subject: $SUBJECT
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8

$BODY
EOF

# Send via Gmail SMTP using curl
curl -s --url "smtps://smtp.gmail.com:465" \
    --ssl-reqd \
    --mail-from "$FROM" \
    --mail-rcpt "$TO" \
    --user "$GMAIL_USER:$GMAIL_PASS" \
    --upload-file "$EMAIL_FILE" 2>&1

RESULT=$?
rm -f "$EMAIL_FILE"

if [ $RESULT -eq 0 ]; then
    echo "Email sent successfully to $TO"
    exit 0
else
    echo "Failed to send email (exit code: $RESULT)"
    exit 1
fi
