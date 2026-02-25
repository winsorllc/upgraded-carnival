---
name: email-agent
description: Send emails to the user or external contacts using a Gmail SMTP relay. Use when: user explicitly requests to email something, completed a job needs notification, or asks to email a draft.
metadata:
  openclaw:
    emoji: "📧"
    requires:
      bins:
        - sendmail
    env:
      - POPEBOT_EMAIL_USER
      - POPEBOT_EMAIL_PASS
---

# Email Agent Skill

Send emails using a Gmail SMTP relay.

## When to Use

✅ **USE this skill when:**

- User explicitly requests to "email" or "send" something
- Completed a long-running job and need to notify the user
- User asks to email a draft or document for review

❌ **DON'T use this skill when:**

- Just summarizing results in chat (notify via chat)
- User didn't explicitly ask for an email

## Prerequisites

Set environment variables:
- `POPEBOT_EMAIL_USER` - Gmail address (e.g., `bot@gmail.com`)
- `POPEBOT_EMAIL_PASS` - 16-character Google App Password (NOT regular password)

## Commands

### Send Email

```bash
# Using sendmail
echo -e "Subject: Test Email\n\nBody text here" | sendmail -v -f "sender@gmail.com" recipient@example.com

# Using msmtp (alternative)
echo -e "Subject: Test\n\nBody" | msmtp recipient@example.com
```

### With Attachment

```bash
# Using mail
echo "Body" | mail -s "Subject" -A attachment.pdf recipient@example.com

# Using mpack
mpack -s "Subject" attachment.pdf recipient@example.com
```

### HTML Email

```bash
# Using sendmail with HTML
(
echo "From: sender@gmail.com"
echo "To: recipient@example.com"
echo "Subject: HTML Email"
echo "MIME-Version: 1.0"
echo "Content-Type: text/html; charset=utf-8"
echo ""
echo "<html><body><h1>Hello</h1></body></html>"
) | sendmail -v recipient@example.com
```

### Using Python (recommended for reliability)

```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email(to_email, subject, body, is_html=False):
    msg = MIMEMultipart()
    msg['From'] = os.environ.get('POPEBOT_EMAIL_USER')
    msg['To'] = to_email
    msg['Subject'] = subject
    
    content_type = 'html' if is_html else 'plain'
    msg.attach(MIMEText(body, content_type))
    
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(
        os.environ.get('POPEBOT_EMAIL_USER'),
        os.environ.get('POPEBOT_EMAIL_PASS')
    )
    server.send_message(msg)
    server.quit()
```

## Quick Reference

| Action | Command |
|--------|---------|
| Simple email | `echo "Body" \| mail -s "Subject" to@example.com` |
| With attachment | `mail -s "Subject" -A file.pdf to@example.com < body.txt` |
| HTML email | Use Python script above |

## Notes

- Requires Google App Password, not regular password
- Enable 2-Factor Authentication on Gmail first
- Generate App Password at: https://myaccount.google.com/apppasswords
- Rate limit: ~100 emails/day for Gmail
