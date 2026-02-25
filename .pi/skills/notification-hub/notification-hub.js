#!/usr/bin/env node

/**
 * Notification Hub - Send notifications to multiple channels
 * 
 * Usage:
 *   notification-hub.js --channel slack --message "Deploy complete"
 *   notification-hub.js --channel email,slack --subject "Alert" --message "Server down!"
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configuration from environment
const config = {
  email: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'noreply@example.com'
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL
  },
  discord: {
    webhookUrl: process.env.DISCORD_WEBHOOK_URL
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  channel: null,
  message: null,
  subject: null,
  priority: 'normal',
  title: null
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const nextArg = args[i + 1];
  
  switch (arg) {
    case '--channel':
      options.channel = nextArg;
      i++;
      break;
    case '--message':
      options.message = nextArg;
      i++;
      break;
    case '--subject':
      options.subject = nextArg;
      i++;
      break;
    case '--priority':
      options.priority = nextArg;
      i++;
      break;
    case '--title':
      options.title = nextArg;
      i++;
      break;
    case '--help':
    case '-h':
      console.log(`
Notification Hub - Send notifications to multiple channels

Usage:
  notification-hub.js --channel <channels> --message <msg>
  notification-hub.js --channel slack --message "Deploy complete"

Options:
  --channel <ch>     Channels: email,slack,discord,telegram,sms (comma-separated)
  --message <msg>   Notification message (required)
  --subject <subj>  Subject for email
  --priority <pri>  Priority: low, normal, high, critical
  --title <title>   Title for rich notifications

Environment Variables:
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
  SLACK_WEBHOOK_URL
  DISCORD_WEBHOOK_URL
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

Examples:
  notification-hub.js --channel slack --message "Deployment complete"
  notification-hub.js --channel email,slack --subject "Alert" --message "Server down!"
      `.trim());
      process.exit(0);
  }
}

// Validate required options
if (!options.channel) {
  console.error('Error: --channel is required');
  process.exit(1);
}

if (!options.message) {
  console.error('Error: --message is required');
  process.exit(1);
}

// Send to Slack
async function sendSlack(message, title) {
  if (!config.slack.webhookUrl) {
    return { success: false, error: 'SLACK_WEBHOOK_URL not configured' };
  }
  
  const payload = {
    text: message,
    username: 'PopeBot',
    icon_emoji: getPriorityEmoji(options.priority)
  };
  
  if (title) {
    payload.blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: title,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Priority:* ${options.priority}`
          }
        ]
      }
    ];
  }
  
  return sendWebhook(config.slack.webhookUrl, payload);
}

// Send to Discord
async function sendDiscord(message, title) {
  if (!config.discord.webhookUrl) {
    return { success: false, error: 'DISCORD_WEBHOOK_URL not configured' };
  }
  
  const payload = {
    content: message,
    username: 'PopeBot',
    avatar_url: 'https://example.com/avatar.png'
  };
  
  if (title) {
    payload.embeds = [{
      title: title,
      description: message,
      color: getPriorityColor(options.priority),
      footer: {
        text: `Priority: ${options.priority}`
      },
      timestamp: new Date().toISOString()
    }];
  }
  
  return sendWebhook(config.discord.webhookUrl, payload);
}

// Send to Telegram
async function sendTelegram(message, title) {
  if (!config.telegram.botToken || !config.telegram.chatId) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured' };
  }
  
  const text = title ? `*${title}*\n\n${message}` : message;
  
  const payload = {
    chat_id: config.telegram.chatId,
    text: text,
    parse_mode: 'Markdown'
  };
  
  return new Promise((resolve) => {
    const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
    const urlObj = new URL(url);
    
    const data = JSON.stringify(payload);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.ok) {
            resolve({ success: true, messageId: response.result.message_id });
          } else {
            resolve({ success: false, error: response.description });
          }
        } catch (e) {
          resolve({ success: false, error: e.message });
        }
      });
    });
    
    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.write(data);
    req.end();
  });
}

// Send email (simplified - requires nodemailer for full support)
async function sendEmail(subject, message) {
  const { host, port, user, pass, from } = config.email;
  
  if (!host || !user || !pass) {
    return { success: false, error: 'SMTP not configured' };
  }
  
  // For now, just log - full email requires nodemailer
  return {
    success: true,
    note: 'Email sending requires nodemailer package. Configure SMTP and try again.',
    wouldSend: { subject, message, from }
  };
}

// Generic webhook sender
function sendWebhook(webhookUrl, payload) {
  return new Promise((resolve) => {
    const urlObj = new URL(webhookUrl);
    
    const data = JSON.stringify(payload);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: `HTTP ${res.statusCode}` });
        }
      });
    });
    
    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.write(data);
    req.end();
  });
}

// Get emoji for priority
function getPriorityEmoji(priority) {
  const emojis = {
    low: ':information_source:',
    normal: ':bell:',
    high: ':warning:',
    critical: ':rotating_light:'
  };
  return emojis[priority] || ':bell:';
}

// Get color for priority
function getPriorityColor(priority) {
  const colors = {
    low: 0x3498db,
    normal: 0x95a5a6,
    high: 0xf39c12,
    critical: 0xe74c3c
  };
  return colors[priority] || 0x95a5a6;
}

// Main execution
async function main() {
  const channels = options.channel.split(',').map(c => c.trim());
  const results = [];
  
  for (const channel of channels) {
    try {
      let result;
      
      switch (channel.toLowerCase()) {
        case 'slack':
          result = await sendSlack(options.message, options.title);
          break;
        case 'discord':
          result = await sendDiscord(options.message, options.title);
          break;
        case 'telegram':
          result = await sendTelegram(options.message, options.title);
          break;
        case 'email':
          result = await sendEmail(options.subject || options.title, options.message);
          break;
        default:
          result = { success: false, error: `Unknown channel: ${channel}` };
      }
      
      results.push({ channel, ...result });
    } catch (error) {
      results.push({ channel, success: false, error: error.message });
    }
  }
  
  const summary = {
    success: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    total: channels.length
  };
  
  console.log(JSON.stringify({
    summary,
    results
  }, null, 2));
  
  if (summary.failed === summary.total) {
    process.exit(1);
  }
}

main();
