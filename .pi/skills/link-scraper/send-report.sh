#!/bin/bash
#
# Send Progress Report Email
# 
# To use: Set GMAIL_USER and GMAIL_PASS, then run:
#   GMAIL_USER=your-email@gmail.com GMAIL_PASS=xxxx ./send-report.sh
#

TO="winsorllc@yahoo.com"
SUBJECT="PopeBot Skill Development - Link Scraper Complete"

if [ -z "$GMAIL_PASS" ]; then
    echo "Error: GMAIL_PASS environment variable not set"
    echo ""
    echo "To send this email:"
    echo "1. Get a Gmail App Password: https://support.google.com/accounts/answer/185833"
    echo "2. Run: GMAIL_USER=your@gmail.com GMAIL_PASS=your-app-password $0"
    exit 1
fi

FROM="${GMAIL_USER:-thepopebot@gmail.com}"

# Read the report
BODY=$(cat << 'EOF'
=================================================================
POPEBOT SKILL DEVELOPMENT - PROGRESS REPORT
=================================================================
Date: February 25, 2026
Time: 8:00 AM UTC

=================================================================
REPOSITORY SCAN SUMMARY
=================================================================

I scanned three repositories for new tools, skills, and architectures:

1. zeroclaw-labs/zeroclaw - A Rust-based agent runtime (<5MB RAM)
   - Trait-driven architecture
   - Provider/channel/tool swappable
   - Not directly applicable as a PopeBot skill

2. openclaw/openclaw - Personal AI assistant platform
   - Multi-channel (WhatsApp, Telegram, Slack, Discord, etc.)
   - Link-understanding feature (extracts URLs from messages)
   - Skills platform with bundled/managed skills
   - Canvas for visual workspace
   - Voice wake + talk mode

3. stephengpope/thepopebot - This is our own PopeBot!
   - Two-layer architecture (Event Handler + Docker Agent)
   - Job-based workflow with PR creation
   - Pi coding agent integration
   - Skills platform

=================================================================
NEW SKILL CREATED: LINK-SCRAPER
=================================================================

Based on OpenClaw's link-understanding feature, I created a new 
PopeBot skill called "link-scraper" that enables the agent to:

✓ Fetch web pages from any URL
✓ Extract title, description, and main content
✓ Generate extractive summaries
✓ Extract key points from articles
✓ Calculate reading time
✓ Extract all links and images from pages

=================================================================
IMPLEMENTATION DETAILS
=================================================================

Location: /job/.pi/skills/link-scraper/

Files created:
- SKILL.md           - Skill documentation
- index.js           - Main extraction module  
- scrape.js          - Full-featured scraper with CLI
- scrape-wrapper.js  - Wrapper with additional utilities
- send-email.js      - Email sending utility
- send-gmail.sh      - Gmail SMTP sender via curl

KEY FEATURES:
-------------
1. Falls back gracefully if cheerio is not installed
2. Handles redirects automatically
3. Supports CSS selectors for custom extraction
4. Outputs JSON for easy integration
5. Works with any HTTP/HTTPS URL

=================================================================
TEST RESULTS
=================================================================

Test 1: httpbin.org/html
-------------------------
Status: ✓ SUCCESS
Title: Herman Melville - Moby-Dick
Word Count: 605
Read Time: 4 min
Summary: "Herman Melville - Moby-Dick Availing himself of the 
mild, summer-cool weather that now reigned in these latitudes..."

Key Points extracted: 5 points

Test 2: news.ycombinator.com
----------------------------
Status: ✓ SUCCESS  
Title: Hacker News
Word Count: 1720
Read Time: 9 min

=================================================================
CODE SAMPLES
=================================================================

Example 1: Basic URL extraction
-------------------------------
$ node /job/.pi/skills/link-scraper/index.js "https://example.com"

Output:
{
  "url": "https://example.com",
  "title": "Example Domain",
  "description": "Example description...",
  "content": "Full article content...",
  "wordCount": 500,
  "summary": "Extracted summary...",
  "keyPoints": ["Point 1", "Point 2", ...],
  "readTime": "3 min",
  "links": [...],
  "images": [...]
}

Example 2: Import as module
----------------------------
const { extract } = require('./index.js');

const result = await extract('https://news.ycombinator.com');
console.log(result.summary);
console.log(result.keyPoints);

=================================================================
USAGE INSTRUCTIONS
=================================================================

To use the link-scraper skill in PopeBot jobs:

1. The skill is already activated (symlinked in .pi/skills/)

2. Use in your job prompts:
   "Use the link-scraper skill to fetch and summarize 
    https://example.com/article for me"

3. Or call directly from shell:
   node /job/.pi/skills/link-scraper/index.js <url>

=================================================================
End of Report
=================================================================
EOF
)

# Create temp file for email
EMAIL_FILE="/tmp/email_$$.txt"

cat > "$EMAIL_FILE" << MAILHDR
To: $TO
From: $FROM
Subject: $SUBJECT
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8

$BODY
MAILHDR

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
    echo "✅ Email sent successfully to $TO"
else
    echo "❌ Failed to send email (exit code: $RESULT)"
    echo "Please check your Gmail App Password is correct"
    exit 1
fi
