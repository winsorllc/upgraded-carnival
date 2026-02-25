#!/usr/bin/env node
/**
 * Email Sender for PopeBot Progress Reports
 * Uses Gmail SMTP via Python (same approach as email-agent skill)
 * 
 * Requires environment variables:
 *   POPEBOT_EMAIL_USER - Gmail address
 *   POPEBOT_EMAIL_PASS - Google App Password (16-char)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function sendEmail(to, subject, body) {
    const user = process.env.POPEBOT_EMAIL_USER;
    const pass = process.env.POPEBOT_EMAIL_PASS;
    
    if (!user || !pass) {
        throw new Error("Missing credentials. Set POPEBOT_EMAIL_USER and POPEBOT_EMAIL_PASS");
    }
    
    // Python script for SMTP (same as email-agent skill)
    const pythonScript = `
import smtplib
from email.message import EmailMessage
import sys
import os

msg = EmailMessage()
msg.set_content(sys.argv[3])
msg['Subject'] = sys.argv[2]
msg['From'] = f"PopeBot Agent <{sys.argv[1]}>"
msg['To'] = sys.argv[4]

try:
    server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
    server.login(sys.argv[1], os.environ['SMTP_PASS'])
    server.send_message(msg)
    server.quit()
    print('SUCCESS')
except Exception as e:
    print(f'ERROR: {e}')
    sys.exit(1)
`;
    
    const encoded = Buffer.from(pythonScript).toString('base64');
    const cmd = `echo "${encoded}" | base64 -d | python3 - "${user}" "${subject}" "${body}" "${to}"`;
    
    try {
        const result = execSync(cmd, {
            encoding: 'utf8',
            env: { ...process.env, SMTP_PASS: pass },
            timeout: 30000
        });
        
        if (result.includes('SUCCESS')) {
            return { success: true, message: `Email sent to ${to}` };
        } else {
            throw new Error(result);
        }
    } catch (error) {
        throw new Error(`SMTP Error: ${error.message}`);
    }
}

// Get report from stdin or file
let body = '';
const args = process.argv.slice(2);

if (args[0] === '--file' && args[1]) {
    body = fs.readFileSync(args[1], 'utf8');
} else if (args[0] === '--stdin') {
    body = fs.readFileSync(0, 'utf8');
} else {
    console.log("Usage: node send-progress-email.js [--file <file>] [--stdin] <to> <subject>");
    console.log("");
    console.log("Options:");
    console.log("  --file <file>  Read email body from file");
    console.log("  --stdin        Read email body from stdin");
    console.log("");
    console.log("Environment variables required:");
    console.log("  POPEBOT_EMAIL_USER - Gmail address");
    console.log("  POPEBOT_EMAIL_PASS - Google App Password");
    process.exit(1);
}

const to = args[args.length - 2];
const subject = args[args.length - 1];

if (!to || !subject) {
    console.error("Error: Missing to or subject");
    process.exit(1);
}

try {
    const result = sendEmail(to, subject, body);
    console.log(JSON.stringify(result, null, 2));
} catch (error) {
    console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
    process.exit(1);
}
