#!/usr/bin/env node

// Simple email sender using direct SMTP connection
const net = require('net');

const reportPath = process.argv[2] || './PROGRESS_REPORT_FINAL.txt';
const fs = require('fs');

let body;
try {
  body = fs.readFileSync(reportPath, 'utf-8');
} catch (e) {
  body = 'Progress report file not found';
}

const to = 'winsorllc@yahoo.com';
const subject = 'PopeBot Skills Implementation Progress Report';

// Try using nodemailer if available
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

async function sendWithNodemailer() {
  if (!nodemailer) {
    return { success: false, error: 'nodemailer not available' };
  }
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER || process.env.POPEBOT_EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.POPEBOT_EMAIL_PASS
    }
  });
  
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'popeBot@example.com',
      to: to,
      subject: subject,
      text: body
    });
    return { success: true, messageId: info.messageId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function sendWithHTTPWebhook() {
  // Try using a webhook if configured
  const webhookUrl = process.env.EMAIL_WEBHOOK_URL;
  if (!webhookUrl) {
    return null;
  }
  
  return new Promise((resolve) => {
    const url = new URL(webhookUrl);
    const data = JSON.stringify({
      to: to,
      subject: subject,
      body: body
    });
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = require('https').request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ success: res.statusCode < 400, response: data });
      });
    });
    
    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Attempting to send progress report...');
  
  // Try webhook first
  const webhookResult = await sendWithHTTPWebhook();
  if (webhookResult) {
    console.log('Webhook result:', webhookResult);
    if (webhookResult.success) {
      console.log('✅ Email sent via webhook!');
      process.exit(0);
    }
  }
  
  // Try nodemailer
  const result = await sendWithNodemailer();
  console.log('Nodemailer result:', result);
  
  if (result.success) {
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', result.messageId);
    process.exit(0);
  } else {
    console.log('❌ Failed to send email:', result.error);
    console.log('\n--- Report Content ---');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('\nReport saved to:', reportPath);
    console.log('\nTo send via email, configure SMTP credentials:');
    console.log('  export SMTP_USER="your@email.com"');
    console.log('  export SMTP_PASS="your-password"');
    console.log('  node send-email-with-report.js');
    process.exit(1);
  }
}

main();
