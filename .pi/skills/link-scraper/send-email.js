#!/usr/bin/env node

/**
 * Simple Email Sender - Send emails via nodemailer or mail command
 */

const nodemailer = require('nodemailer');
const { execSync } = require('child_process');
const fs = require('fs');

const EMAIL_FROM = process.env.EMAIL_FROM || 'thepopebot@example.com';
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

/**
 * Send email using nodemailer
 */
async function sendWithNodemailer(to, subject, body, isImportant = false) {
  // Create transporter
  let transporter;
  
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
  } else {
    // Try using mail command as fallback
    throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS environment variables.');
  }

  // Send mail
  const info = await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject: isImportant ? `⭐ ${subject}` : subject,
    text: body,
    html: body.replace(/\n/g, '<br>')
  });

  console.log(`Email sent: ${info.messageId}`);
  return info;
}

/**
 * Send email using mail command (fallback)
 */
function sendWithMail(to, subject, body, isImportant = false) {
  const prefix = isImportant ? '⭐ ' : '';
  const fullSubject = prefix + subject;
  
  // Write body to temp file
  const tempFile = '/tmp/email_body.txt';
  fs.writeFileSync(tempFile, body);
  
  try {
    execSync(`mail -s "${fullSubject}" "${to}" < ${tempFile}`, {
      stdio: 'pipe'
    });
    console.log('Email sent via mail command');
    return true;
  } catch (error) {
    console.error('Failed to send email via mail:', error.message);
    return false;
  }
}

/**
 * Main send function
 */
async function sendEmail({ to, subject, body, isImportant = false }) {
  console.log(`Sending email to: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Important: ${isImportant}`);
  
  try {
    // Try nodemailer first
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      return await sendWithNodemailer(to, subject, body, isImportant);
    }
    
    // Try mail command
    if (fs.existsSync('/usr/bin/mail') || fs.existsSync('/usr/sbin/sendmail')) {
      return sendWithMail(to, subject, body, isImportant);
    }
    
    throw new Error('No email sending method available');
  } catch (error) {
    console.error('Email send failed:', error.message);
    throw error;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
Email Sender

Usage:
  node send-email.js <to> <subject> <body>
  node send-email.js --test

Environment variables (for SMTP):
  SMTP_HOST - SMTP server hostname
  SMTP_PORT - SMTP port (default: 587)
  SMTP_USER - SMTP username
  SMTP_PASS - SMTP password
  EMAIL_FROM - From address (default: thepopebot@example.com)
`);
    process.exit(0);
  }
  
  if (args[0] === '--test') {
    console.log('Testing email configuration...');
    console.log('SMTP configured:', !!(SMTP_HOST && SMTP_USER && SMTP_PASS));
    if (SMTP_HOST) {
      console.log(`SMTP Host: ${SMTP_HOST}:${SMTP_PORT}`);
    }
    process.exit(0);
  }
  
  const [to, subject, ...bodyParts] = args;
  const body = bodyParts.join(' ');
  
  try {
    await sendEmail({ to, subject, body });
    console.log('✅ Email sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { sendEmail };
