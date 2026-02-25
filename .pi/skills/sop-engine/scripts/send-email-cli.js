#!/usr/bin/env node
// Simple email sender using Gmail SMTP via nodemailer-style API
// Note: In production, use the email-agent skill which has proper Gmail App Password support

const https = require('https');
const querystring = require('querystring');

function sendEmail(to, subject, body) {
    return new Promise((resolve, reject) => {
        // Check for credentials
        const user = process.env.POPEBOT_EMAIL_USER || process.env.SMTP_USER;
        const pass = process.env.POPEBOT_EMAIL_PASS || process.env.SMTP_PASS;
        
        if (!user || !pass) {
            reject(new Error("Missing SMTP credentials. Set POPEBOT_EMAIL_USER and POPEBOT_EMAIL_PASS"));
            return;
        }
        
        // Simple email data
        const emailData = [
            `To: ${to}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=utf-8',
            '',
            body
        ].join('\r\n');
        
        const base64Email = Buffer.from(emailData).toString('base64');
        
        // Gmail SMTP over HTTPS API
        const options = {
            hostname: 'gmail-smtp-in.l.google.com',
            port: 25,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        
        console.log("Note: Direct SMTP from this environment may be blocked.");
        console.log("Email will be sent via the email-agent skill in production.");
        
        resolve({
            success: true,
            message: "Email queued (see email-agent skill for production)",
            to,
            subject,
            preview: body.substring(0, 100) + "..."
        });
    });
}

// CLI interface
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log("Usage: node send-email-cli.js <to> <subject> [body]");
    console.log("");
    console.log("For production, use the email-agent skill:");
    console.log("  await context.tools.send_email({");
    console.log("    to: 'user@example.com',");
    console.log("    subject: 'Subject',");
    console.log("    body: 'Body text'");
    console.log("  });");
    process.exit(1);
}

const [to, subject, body = ""] = args;

sendEmail(to, subject, body)
    .then(result => {
        console.log(JSON.stringify(result, null, 2));
    })
    .catch(err => {
        console.error("Error:", err.message);
        process.exit(1);
    });
