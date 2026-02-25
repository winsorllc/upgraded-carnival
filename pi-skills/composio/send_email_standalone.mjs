#!/usr/bin/env node

/**
 * Standalone Email Sender using Nodemailer
 * Sends the progress report to winsorllc@yahoo.com
 */

import nodemailer from 'nodemailer';
import { readFile } from 'fs/promises';

const to = 'winsorllc@yahoo.com';
const subject = '[PopeBot Progress Report] New Composio Skill - 1000+ App Integrations';

// Get credentials from environment
const user = process.env.POPEBOT_EMAIL_USER || process.env.AGENT_LLM_POPEBOT_EMAIL_USER;
const pass = process.env.POPEBOT_EMAIL_PASS || process.env.AGENT_LLM_POPEBOT_EMAIL_PASS;

console.log('=== Sending Email Progress Report ===\n');
console.log(`To: ${to}`);
console.log(`Subject: ${subject}\n`);

if (!user || !pass) {
  console.log('⚠️  Email credentials not configured in environment\n');
  console.log('Required environment variables:');
  console.log('  - POPEBOT_EMAIL_USER (Gmail address, e.g., winsorbot@gmail.com)');
  console.log('  - POPEBOT_EMAIL_PASS (16-character Google App Password)\n');
  console.log('Progress report saved to:');
  console.log('  - /tmp/progress_report.md');
  console.log('  - /job/logs/composio-skill-build/progress_report.md');
  console.log('  - /job/logs/composio-skill-build/build_summary.md\n');
  console.log('To configure email sending:');
  console.log('  1. Create a Google App Password: https://myaccount.google.com/apppasswords');
  console.log('  2. Add GitHub Secrets:');
  console.log('     - POPEBOT_EMAIL_USER');
  console.log('     - POPEBOT_EMAIL_PASS');
  console.log('  3. Or set them in .env file\n');
  
  // Show preview
  const body = await readFile('/tmp/progress_report.md', 'utf-8');
  console.log('=== Email Preview (first 1500 characters) ===\n');
  console.log(body.substring(0, 1500) + '...\n');
  
  process.exit(0);
}

try {
  // Create transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass
    }
  });
  
  // Read the progress report
  const body = await readFile('/tmp/progress_report.md', 'utf-8');
  
  // Send email
  const info = await transporter.sendMail({
    from: `"PopeBot Agent" <${user}>`,
    to: to,
    subject: subject,
    text: body,
    html: body.replace(/\n/g, '<br>').replace(/`(.*?)`/g, '<code>$1</code>')
  });
  
  console.log('✅ Email sent successfully!');
  console.log(`Message ID: ${info.messageId}`);
  console.log(`Accepted: ${info.accepted.join(', ')}`);
  
} catch (error) {
  console.error('❌ Failed to send email:', error.message);
  if (error.response) {
    console.error('SMTP Response:', error.response);
  }
  process.exit(1);
}
