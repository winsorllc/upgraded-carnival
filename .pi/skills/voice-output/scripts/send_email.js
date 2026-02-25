#!/usr/bin/env node
/**
 * Send email via Gmail SMTP
 * Usage: node send_email.js <to> <subject> <body>
 * Requires: POPEBOT_EMAIL_USER and POPEBOT_EMAIL_PASS env vars
 */

const { spawn } = require('child_process');

const to = process.argv[2];
const subject = process.argv[3];
const body = process.argv[4];

const user = process.env.AGENT_LLM_POPEBOT_EMAIL_USER || process.env.POPEBOT_EMAIL_USER;
const pass = process.env.AGENT_LLM_POPEBOT_EMAIL_PASS || process.env.POPEBOT_EMAIL_PASS;

if (!to || !subject || !body) {
    console.error('Usage: send_email.js <to> <subject> <body>');
    process.exit(1);
}

if (!user || !pass) {
    console.error('ERROR: Email credentials not configured.');
    console.error('Set POPEBOT_EMAIL_USER and POPEBOT_EMAIL_PASS environment variables.');
    console.error('For Gmail, use an App Password (16 characters).');
    process.exit(1);
}

// Use Python for SMTP (already available in container)
const pythonScript = `
import smtplib
from email.message import EmailMessage
import sys
import os

msg = EmailMessage()
msg.set_content(sys.argv[4])
msg['Subject'] = sys.argv[3]
msg['From'] = f"PopeBot <{sys.argv[1]}>"
msg['To'] = sys.argv[2]

try:
    server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
    server.login(sys.argv[1], os.environ.get('SMTP_PASS', ''))
    server.send_message(msg)
    server.quit()
    print('SUCCESS')
except Exception as e:
    print(f'ERROR: {e}')
    sys.exit(1)
`;

const proc = spawn('python3', ['-c', pythonScript, user, subject, to, body], {
    env: { ...process.env, SMTP_PASS: pass }
});

let output = '';
proc.stdout.on('data', (data) => { output += data; });
proc.stderr.on('data', (data) => { output += data; });

proc.on('close', (code) => {
    if (code === 0 && output.includes('SUCCESS')) {
        console.log(`✓ Email sent to ${to}`);
    } else {
        console.error('Failed to send email:', output);
        process.exit(1);
    }
});
