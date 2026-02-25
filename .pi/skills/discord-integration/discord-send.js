#!/usr/bin/env node

/**
 * Discord Integration - Send messages to Discord via webhooks or bot API
 * 
 * Usage:
 *   discord-send.js --webhook <url> --content <message>
 *   discord-send.js --channel <id> --content <message> --token <bot-token>
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  webhook: null,
  channel: null,
  content: null,
  embed: null,
  username: null,
  avatarUrl: null,
  token: null,
  file: null
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
    case '--content':
      options.content = nextArg;
      i++;
      break;
    case '--embed':
      try {
        options.embed = JSON.parse(nextArg);
      } catch (e) {
        options.embed = nextArg;
      }
      i++;
      break;
    case '--username':
      options.username = nextArg;
      i++;
      break;
    case '--avatar-url':
      options.avatarUrl = nextArg;
      i++;
      break;
    case '--token':
      options.token = nextArg;
      i++;
      break;
    case '--file':
      options.file = nextArg;
      i++;
      break;
    case '--help':
    case '-h':
      console.log(`
Discord Integration - Send messages to Discord

Usage:
  discord-send.js --webhook <url> --content <message>
  discord-send.js --channel <id> --content <message> --token <bot-token>

Options:
  --webhook <url>    Discord webhook URL
  --channel <id>     Discord channel ID (for bot)
  --content <msg>    Message content (required)
  --embed <json>     JSON string for embed
  --username <name>  Override webhook username
  --avatar-url <url> Override webhook avatar
  --token <token>    Discord bot token
  --file <path>      Path to file to attach
      `.trim());
      process.exit(0);
  }
}

// Validate required options
if (!options.content) {
  console.error('Error: --content is required');
  process.exit(1);
}

if (!options.webhook && !options.channel) {
  console.error('Error: Either --webhook or --channel must be specified');
  process.exit(1);
}

// Build request payload
function buildPayload() {
  const payload = {
    content: options.content
  };
  
  if (options.embed) {
    payload.embeds = Array.isArray(options.embed) ? options.embed : [options.embed];
  }
  
  if (options.username) {
    payload.username = options.username;
  }
  
  if (options.avatarUrl) {
    payload.avatar_url = options.avatarUrl;
  }
  
  return payload;
}

// Send via webhook
async function sendWebhook(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    // Add wait=1 to get response
    const queryString = url.searchParams.get('wait') ? '' : '?wait=1';
    const endpoint = `${url.pathname}${queryString}`;
    
    const data = JSON.stringify(payload);
    
    const options = {
      hostname: url.hostname,
      port: isHttps ? 443 : 80,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const response = body ? JSON.parse(body) : {};
            resolve({ success: true, id: response.id, message: 'Message sent successfully' });
          } catch (e) {
            resolve({ success: true, message: 'Message sent successfully' });
          }
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
    const url = new URL(`https://discord.com/api/v10/channels/${channelId}/messages`);
    
    const data = JSON.stringify(payload);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bot ${options.token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const response = JSON.parse(body);
            resolve({ success: true, id: response.id, message: 'Message sent successfully' });
          } catch (e) {
            resolve({ success: true, message: 'Message sent successfully' });
          }
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

// Main execution
async function main() {
  try {
    const payload = buildPayload();
    
    let result;
    if (options.webhook) {
      // Check for file attachment
      if (options.file && fs.existsSync(options.file)) {
        // For files, we need to use multipart form data - simplified version
        // For now, just send the message without file
        console.log('Note: File attachment requires Discord bot API with FormData');
      }
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
