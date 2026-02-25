#!/usr/bin/env node

/**
 * Slack Integration - Send messages to Slack via webhooks or bot API
 * 
 * Usage:
 *   slack-send.js --webhook <url> --text <message>
 *   slack-send.js --channel <id> --text <message> --token <bot-token>
 */

const https = require('https');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  webhook: null,
  channel: null,
  text: null,
  blocks: null,
  username: null,
  iconEmoji: null,
  token: null
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const nextArg = args[i + 1];
  
  switch (arg) {
    case '--webhook':
      options.webhook = nextArg;
      i++;
      break;
    case '--channel':
      options.channel = nextArg;
      i++;
      break;
    case '--text':
      options.text = nextArg;
      i++;
      break;
    case '--blocks':
      try {
        options.blocks = JSON.parse(nextArg);
      } catch (e) {
        options.blocks = nextArg;
      }
      i++;
      break;
    case '--username':
      options.username = nextArg;
      i++;
      break;
    case '--icon-emoji':
      options.iconEmoji = nextArg;
      i++;
      break;
    case '--token':
      options.token = nextArg;
      i++;
      break;
    case '--help':
    case '-h':
      console.log(`
Slack Integration - Send messages to Slack

Usage:
  slack-send.js --webhook <url> --text <message>
  slack-send.js --channel <id> --text <message> --token <bot-token>

Options:
  --webhook <url>    Slack webhook URL
  --channel <id>     Slack channel ID (for bot)
  --text <msg>       Message text (required)
  --blocks <json>    JSON string for Slack blocks
  --username <name>  Override webhook username
  --icon-emoji <e>  Override webhook icon (e.g., :robot:)
  --token <token>   Slack bot token
      `.trim());
      process.exit(0);
  }
}

// Validate required options
if (!options.text) {
  console.error('Error: --text is required');
  process.exit(1);
}

if (!options.webhook && !options.channel) {
  console.error('Error: Either --webhook or --channel must be specified');
  process.exit(1);
}

// Build request payload
function buildPayload() {
  const payload = {
    text: options.text
  };
  
  if (options.blocks) {
    payload.blocks = Array.isArray(options.blocks) ? options.blocks : [options.blocks];
  }
  
  if (options.username) {
    payload.username = options.username;
  }
  
  if (options.iconEmoji) {
    payload.icon_emoji = options.iconEmoji;
  }
  
  return payload;
}

// Send via webhook
async function sendWebhook(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    
    const data = JSON.stringify(payload);
    
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
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, message: 'Message sent successfully' });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Send via bot API
async function sendBotMessage(channelId, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://slack.com/api/chat.postMessage`);
    
    payload.channel = channelId;
    
    const data = JSON.stringify(payload);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${options.token}`,
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
            resolve({ success: true, ts: response.ts, message: 'Message sent successfully' });
          } else {
            reject(new Error(`Slack API error: ${response.error}`));
          }
        } catch (e) {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Main execution
async function main() {
  try {
    const payload = buildPayload();
    
    let result;
    if (options.webhook) {
      result = await sendWebhook(options.webhook, payload);
    } else if (options.channel) {
      if (!options.token) {
        console.error('Error: --token is required when using --channel');
        process.exit(1);
      }
      result = await sendBotMessage(options.channel, payload);
    }
    
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
