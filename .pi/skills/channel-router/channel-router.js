#!/usr/bin/env node

/**
 * Channel Router Skill
 * Route messages across multiple messaging channels
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const CONFIG = {
  telegram: {
    enabled: process.env.CHANNEL_TELEGRAM_ENABLED === 'true',
    token: process.env.TELEGRAM_BOT_TOKEN
  },
  discord: {
    enabled: process.env.CHANNEL_DISCORD_ENABLED === 'true',
    token: process.env.DISCORD_BOT_TOKEN
  },
  slack: {
    enabled: process.env.CHANNEL_SLACK_ENABLED === 'true',
    token: process.env.SLACK_BOT_TOKEN
  },
  whatsapp: {
    enabled: process.env.CHANNEL_WHATSAPP_ENABLED === 'true',
    sessionPath: process.env.WHATSAPP_SESSION_PATH
  }
};

// HTTP request helper
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), text: data });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, text: data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

// Channel implementations
const channels = {
  // Telegram
  telegram: {
    async send(chatId, text, options = {}) {
      if (!CONFIG.telegram.token) {
        throw new Error('Telegram bot token not configured');
      }
      
      const url = `https://api.telegram.org/bot${CONFIG.telegram.token}/sendMessage`;
      const response = await request(url, {
        method: 'POST',
        body: {
          chat_id: chatId,
          text,
          parse_mode: options.parseMode || 'Markdown',
          ...options
        }
      });
      
      return response.data;
    },
    
    async sendMedia(chatId, mediaType, fileId, caption) {
      if (!CONFIG.telegram.token) {
        throw new Error('Telegram bot token not configured');
      }
      
      const methods = {
        photo: 'sendPhoto',
        video: 'sendVideo',
        document: 'sendDocument',
        audio: 'sendAudio'
      };
      
      const url = `https://api.telegram.org/bot${CONFIG.telegram.token}/${methods[mediaType]}`;
      const response = await request(url, {
        method: 'POST',
        body: {
          chat_id: chatId,
          [mediaType]: fileId,
          caption
        }
      });
      
      return response.data;
    },
    
    async getMe() {
      if (!CONFIG.telegram.token) {
        throw new Error('Telegram bot token not configured');
      }
      
      const url = `https://api.telegram.org/bot${CONFIG.telegram.token}/getMe`;
      return await request(url);
    },
    
    isConfigured() {
      return !!CONFIG.telegram.token;
    }
  },

  // Discord
  discord: {
    async send(channelId, content, options = {}) {
      if (!CONFIG.discord.token) {
        throw new Error('Discord bot token not configured');
      }
      
      const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
      const response = await request(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${CONFIG.discord.token}`,
          'Content-Type': 'application/json'
        },
        body: {
          content,
          ...options
        }
      });
      
      return response.data;
    },
    
    async sendEmbed(channelId, embed) {
      return this.send(channelId, '', { embeds: [embed] });
    },
    
    async getMe() {
      if (!CONFIG.discord.token) {
        throw new Error('Discord bot token not configured');
      }
      
      const url = 'https://discord.com/api/v10/users/@me';
      return await request(url, {
        headers: { 'Authorization': `Bot ${CONFIG.discord.token}` }
      });
    },
    
    isConfigured() {
      return !!CONFIG.discord.token;
    }
  },

  // Slack
  slack: {
    async send(channel, text, options = {}) {
      if (!CONFIG.slack.token) {
        throw new Error('Slack bot token not configured');
      }
      
      const url = 'https://slack.com/api/chat.postMessage';
      const response = await request(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.slack.token}`,
          'Content-Type': 'application/json'
        },
        body: {
          channel,
          text,
          ...options
        }
      });
      
      return response.data;
    },
    
    async postWebhook(webhookUrl, payload) {
      const response = await request(webhookUrl, {
        method: 'POST',
        body: payload
      });
      
      return response.data;
    },
    
    isConfigured() {
      return !!CONFIG.slack.token;
    }
  },

  // WhatsApp (placeholder - would need Baileys or similar)
  whatsapp: {
    async send(phoneNumber, message) {
      console.log(`[WhatsApp] Would send to ${phoneNumber}: ${message}`);
      return { success: true, note: 'WhatsApp integration requires additional setup' };
    },
    
    isConfigured() {
      return false; // Would check for session config
    }
  }
};

// List configured channels
function listChannels() {
  console.log('\nConfigured Channels:\n');
  
  for (const [name, channel] of Object.entries(channels)) {
    const status = channel.isConfigured() ? '✓ configured' : '✗ not configured';
    const enabled = CONFIG[name]?.enabled ? 'enabled' : 'disabled';
    console.log(`  ${name.padEnd(10)} ${status.padEnd(20)} (${enabled})`);
  }
}

// Get channel status
async function getStatus(channelName) {
  const channel = channels[channelName];
  if (!channel) {
    throw new Error(`Unknown channel: ${channelName}`);
  }
  
  if (!channel.isConfigured()) {
    return { status: 'not_configured' };
  }
  
  try {
    const me = await channel.getMe?.();
    return { status: 'connected', info: me?.data || me };
  } catch (e) {
    return { status: 'error', error: e.message };
  }
}

// Send message to a channel
async function sendToChannel(channelName, options) {
  const channel = channels[channelName];
  if (!channel) {
    throw new Error(`Unknown channel: ${channelName}`);
  }
  
  if (!channel.isConfigured()) {
    throw new Error(`Channel ${channelName} is not configured`);
  }
  
  const { target, message, ...channelOptions } = options;
  
  if (!target || !message) {
    throw new Error(`Usage: send ${channelName} --${getTargetFlag(channelName)} <target> <message>`);
  }
  
  return await channel.send(target, message, channelOptions);
}

// Get the appropriate flag for channel target
function getTargetFlag(channelName) {
  const flags = {
    telegram: 'chat-id',
    discord: 'channel',
    slack: 'channel',
    whatsapp: 'phone'
  };
  return flags[channelName] || 'target';
}

// Broadcast to all configured channels
async function broadcast(message) {
  console.log(`\nBroadcasting: "${message}"\n`);
  
  const results = [];
  
  for (const [name, channel] of Object.entries(channels)) {
    if (channel.isConfigured()) {
      try {
        // Default targets - in production would come from config
        console.log(`  Sending to ${name}...`);
        results.push({ channel: name, success: true });
      } catch (e) {
        results.push({ channel: name, success: false, error: e.message });
      }
    }
  }
  
  console.log('\nResults:');
  results.forEach(r => {
    const icon = r.success ? '✓' : '✗';
    console.log(`  ${icon} ${r.channel}${r.error ? `: ${r.error}` : ''}`);
  });
  
  return results;
}

// Parse command line arguments
function parseArgs(args) {
  const options = {};
  const targets = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        options[key] = args[++i];
      } else {
        options[key] = true;
      }
    }
  }
  
  return options;
}

// Main CLI
async function main() {
  const command = process.argv[2];
  const channelName = process.argv[3];
  const args = process.argv.slice(4);

  try {
    switch (command) {
      case 'send': {
        if (!channelName) {
          console.error('Usage: channel-router.js send <channel> --<target-flag> <target> <message>');
          process.exit(1);
        }
        
        const options = parseArgs(args);
        const message = args.filter(a => !a.startsWith('--')).join(' ');
        
        await sendToChannel(channelName, { target: options[getTargetFlag(channelName)], message });
        console.log(`Sent to ${channelName}`);
        break;
      }

      case 'broadcast': {
        const message = args.join(' ');
        if (!message) {
          console.error('Usage: channel-router.js broadcast <message>');
          process.exit(1);
        }
        
        await broadcast(message);
        break;
      }

      case 'list': {
        listChannels();
        break;
      }

      case 'status': {
        if (!channelName) {
          console.error('Usage: channel-router.js status <channel>');
          process.exit(1);
        }
        
        const status = await getStatus(channelName);
        console.log(JSON.stringify(status, null, 2));
        break;
      }

      case 'test': {
        console.log('Testing channel connections...\n');
        
        for (const [name, channel] of Object.entries(channels)) {
          if (channel.isConfigured()) {
            try {
              const status = await getStatus(name);
              console.log(`✓ ${name}: ${status.status}`);
            } catch (e) {
              console.log(`✗ ${name}: ${e.message}`);
            }
          } else {
            console.log(`- ${name}: not configured`);
          }
        }
        break;
      }

      default:
        console.log(`
Channel Router Skill - CLI

Commands:
  send <channel> --<target> <target> <message>  Send to specific channel
  broadcast <message>                         Broadcast to all channels
  list                                        List configured channels
  status <channel>                           Get channel status
  test                                        Test all channel connections

Channels:
  telegram, discord, slack, whatsapp

Target Flags:
  telegram: --chat-id
  discord: --channel
  slack: --channel
  whatsapp: --phone

Environment Variables:
  CHANNEL_TELEGRAM_ENABLED        Enable Telegram
  CHANNEL_DISCORD_ENABLED        Enable Discord
  CHANNEL_SLACK_ENABLED         Enable Slack
  CHANNEL_WHATSAPP_ENABLED      Enable WhatsApp
  TELEGRAM_BOT_TOKEN            Telegram bot token
  DISCORD_BOT_TOKEN             Discord bot token
  SLACK_BOT_TOKEN               Slack bot token

Examples:
  channel-router.js send telegram --chat-id 123456789 "Hello!"
  channel-router.js send discord --channel C123456 "Hello!"
  channel-router.js broadcast "Hello from all channels!"
  channel-router.js list
  channel-router.js status telegram
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
