#!/usr/bin/env python3
"""
Simple SMTP email sender using Python's built-in smtplib.
This script can send emails when proper SMTP credentials are configured.
"""
import smtplib
import os
import sys
from email.message import EmailMessage

def send_email(to, subject, body, smtp_user=None, smtp_pass=None):
    """Send an email via Gmail SMTP."""
    
    # Use environment variables or defaults
    user = smtp_user or os.environ.get('POPEBOT_EMAIL_USER')
    password = smtp_pass or os.environ.get('POPEBOT_EMAIL_PASS')
    
    if not user or not password:
        print("ERROR: SMTP credentials not configured.")
        print("Set POPEBOT_EMAIL_USER and POPEBOT_EMAIL_PASS environment variables.")
        print("For Gmail, use an App Password (16 characters).")
        return False
    
    msg = EmailMessage()
    msg.set_content(body)
    msg['Subject'] = subject
    msg['From'] = f"PopeBot Agent <{user}>"
    msg['To'] = to
    
    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(user, password)
        server.send_message(msg)
        server.quit()
        print(f"✓ Email sent successfully to {to}")
        return True
    except Exception as e:
        print(f"ERROR: Failed to send email: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: send-email.py <to> <subject> <body>")
        sys.exit(1)
    
    send_email(sys.argv[1], sys.argv[2], sys.argv[3])
