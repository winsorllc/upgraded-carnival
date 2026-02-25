#!/usr/bin/env node

/**
 * WhatsApp Integration - Send messages via WhatsApp
 * 
 * Usage:
 *   whatsapp-send.js --to "+1234567890" --message "Hello!"
 *   whatsapp-send.js --to "+1234567890" --message "Check this!" --media "url"
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  apiUrl: process.env.WHATSAPP_API_URL,
  apiToken: process.env.WHATSAPP_API_TOKEN
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  to: null,
  message: null,
  media: null,
  caption: null,
  group: false
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const nextArg = args[i + 1];
  
  switch (arg) {
    case '--to':
      options.to = nextArg;
      i++;
      break;
    case '--message':
      options.message = nextArg;
      i++;
      break;
    case '--media':
      options.media = nextArg;
      i++;
      break;
    case '--caption':
      options.caption = nextArg;
      i++;
      break;
    case '--group':
      options.group = true;
      break;
    case '--help':
    case '-h':
      console.log(`
WhatsApp Integration - Send messages via WhatsApp

Usage:
  whatsapp-send.js --to "+1234567890" --message "Hello!"
  whatsapp-send.js --to "+1234567890" --message "Check this!" --media "url"

Options:
  --to <number>      Recipient phone number or group ID (required)
  --message <msg>   Message content (required)
  --media <url>     Media URL to send
  --caption <text> Caption for media
  --group           Target is a group

Environment Variables:
  WHATSAPP_API_URL      WhatsApp Business API URL
  WHATSAPP_API_TOKEN    WhatsApp Business API token

Examples:
  whatsapp-send.js --to "+1234567890" --message "Job completed!"
  whatsapp-send.js --to "group-id" --message "Update" --group
      `.trim());
      process.exit(0);
  }
}

// Validate required options
if (!options.to) {
  console.error('Error: --to is required');
  process.exit(1);
}

if (!options.message && !options.media) {
  console.error('Error: --message or --media is required');
  process.exit(1);
}

// Format phone number
function formatPhoneNumber(phone) {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Add country code if not present (assuming US)
  if (digits.length === 10) {
    return '1' + digits;
  }
  
  return digits;
}

// Send message via WhatsApp Business API
function sendMessage(to, message, mediaUrl = null, caption = null) {
  return new Promise((resolve, reject) => {
    if (!config.apiUrl || !config.apiToken) {
      // Fallback: Show instructions for WhatsApp Web
      resolve({
        success: false,
        error: 'WhatsApp Business API not configured. Set WHATSAPP_API_URL and WHATSAPP_API_TOKEN.',
        note: 'For personal WhatsApp, consider using a library like @whatsapp-bot-ai/baileys'
      });
      return;
    }
    
    const payload = {
      messaging_product: 'whatsapp',
      to: formatPhoneNumber(to),
      type: mediaUrl ? 'image' : 'text'
    };
    
    if (mediaUrl) {
      payload.image = {
        link: mediaUrl,
        caption: caption || message
      };
    } else {
      payload.text = { body: message };
    }
    
    const data = JSON.stringify(payload);
    
    const url = new URL(config.apiUrl);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const lib = url.protocol === 'https:' ? https : http;
    
    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.messages && response.messages[0]) {
            resolve({
              success: true,
              messageId: response.messages[0].id,
              to: to
            });
          } else if (response.error) {
            resolve({
              success: false,
              error: response.error.message,
              code: response.error.code
            });
          } else {
            resolve({ success: true, response });
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
    const result = await sendMessage(
      options.to,
      options.message,
      options.media,
      options.caption
    );
    
    console.log(JSON.stringify(result, null, 2));
    
    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
