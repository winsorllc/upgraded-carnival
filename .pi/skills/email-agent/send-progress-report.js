#!/usr/bin/env node

/**
 * Email Sender - Node.js version using nodemailer
 * Sends progress report to winsorllc@yahoo.com
 * 
 * Usage: node send-progress-report.js
 * 
 * Requires: POPEBOT_EMAIL_USER and POPEBOT_EMAIL_PASS environment variables
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendProgressReport() {
  // Get credentials
  const user = process.env.POPEBOT_EMAIL_USER || process.env.AGENT_LLM_POPEBOT_EMAIL_USER;
  const pass = process.env.POPEBOT_EMAIL_PASS || process.env.AGENT_LLM_POPEBOT_EMAIL_PASS;
  
  if (!user || !pass) {
    console.error('ERROR: Email credentials not configured');
    console.error('');
    console.error('To enable email notifications, set these environment variables:');
    console.error('  POPEBOT_EMAIL_USER - Gmail address (e.g., winsorbot@gmail.com)');
    console.error('  POPEBOT_EMAIL_PASS - Google App Password (16 characters)');
    console.error('');
    console.error('In GitHub Secrets, set:');
    console.error('  AGENT_POPEBOT_EMAIL_USER');
    console.error('  AGENT_POPEBOT_EMAIL_PASS');
    process.exit(1);
  }
  
  // Read the progress report
  const reportPath = path.join(__dirname, 'progress-report.txt');
  let body;
  
  try {
    body = fs.readFileSync(reportPath, 'utf8');
  } catch (e) {
    body = `PopeBot CLI Discovery Skill - Progress Report
Date: February 25, 2026

This is a test email to verify the email system is working.
`;
  }
  
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: user,
      pass: pass
    }
  });
  
  // Email options
  const mailOptions = {
    from: `"PopeBot Agent" <${user}>`,
    to: 'winsorllc@yahoo.com',
    subject: 'PopeBot Skill Development - CLI Discovery Progress Report',
    text: body
  };
  
  try {
    console.log('Sending email to winsorllc@yahoo.com...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✓ Email sent successfully!');
    console.log(`  Message ID: ${info.messageId}`);
    console.log(`  To: ${mailOptions.to}`);
    return true;
  } catch (error) {
    console.error('✗ Failed to send email:');
    console.error(`  ${error.message}`);
    return false;
  }
}

// Run if executed directly
if (require.main === module) {
  sendProgressReport()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = { sendProgressReport };
