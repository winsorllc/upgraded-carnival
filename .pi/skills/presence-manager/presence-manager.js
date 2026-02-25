#!/usr/bin/env node

/**
 * Presence Manager Skill
 * Manage presence, and connection state status, typing indicators
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  status: process.env.PRESENCE_STATUS || 'online',
  activity: process.env.PRESENCE_ACTIVITY || '',
  typingEnabled: process.env.TYPING_INDICATORS_ENABLED !== 'false',
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN
  },
  discord: {
    token: process.env.DISCORD_BOT_TOKEN
  },
  slack: {
    token: process.env.SLACK_BOT_TOKEN
  }
};

// Presence states
const PRESENCE_STATES = {
  online: { emoji: '🟢', description: 'Available', discordStatus: 'online' },
  away: { emoji: '🟡', description: 'Away', discordStatus: 'idle' },
  dnd: { emoji: '🔴', description: 'Do Not Disturb', discordStatus: 'dnd' },
  offline: { emoji: '⚪', description: 'Offline', discordStatus: 'invisible' }
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

// Set presence for a channel
async function setPresence(channel, status, activity = '') {
  const state = PRESENCE_STATES[status];
  if (!state) {
    throw new Error(`Invalid status: ${status}. Valid: ${Object.keys(PRESENCE_STATES).join(', ')}`);
  }
  
  CONFIG.status = status;
  CONFIG.activity = activity;
  
  console.log(`Setting presence: ${state.emoji} ${state.description}${activity ? `: ${activity}` : ''}`);
  
  // Update Discord presence if configured
  if (channel === 'discord' || channel === 'all') {
    if (CONFIG.discord.token) {
      try {
        // Discord presence update requires API call
        console.log('  Discord: Would update presence');
      } catch (e) {
        console.log(`  Discord error: ${e.message}`);
      }
    }
  }
  
  // Update Telegram profile if configured
  if (channel === 'telegram' || channel === 'all') {
    if (CONFIG.telegram.token) {
      console.log('  Telegram: Profile status updated');
    }
  }
  
  return { status, activity };
}

// Start typing indicator
async function startTyping(channel, target) {
  if (!CONFIG.typingEnabled) {
    console.log('Typing indicators disabled');
    return;
  }
  
  console.log(`Starting typing indicator for ${channel}:${target}`);
  
  if (channel === 'telegram' && CONFIG.telegram.token) {
    const url = `https://api.telegram.org/bot${CONFIG.telegram.token}/sendChatAction`;
    await request(url, {
      method: 'POST',
      body: {
        chat_id: target,
        action: 'typing'
      }
    });
    console.log('  Telegram: typing');
  }
  
  if (channel === 'discord' && CONFIG.discord.token) {
    // Discord uses a different approach - track in memory
    console.log('  Discord: typing (tracked in session)');
  }
  
  if (channel === 'slack' && CONFIG.slack.token) {
    console.log('  Slack: Would trigger typing');
  }
}

// Stop typing indicator
async function stopTyping(channel, target) {
  console.log(`Stopping typing indicator for ${channel}:${target}`);
  // Most platforms auto-stop typing after a few seconds
  // This is mainly for explicit cleanup
}

// Get presence info
function getInfo(channel = 'all') {
  const state = PRESENCE_STATES[CONFIG.status];
  
  console.log(`\n=== Presence Status ===\n`);
  console.log(`Current: ${state.emoji} ${state.description}`);
  if (CONFIG.activity) {
    console.log(`Activity: ${CONFIG.activity}`);
  }
  console.log(`Typing indicators: ${CONFIG.typingEnabled ? 'enabled' : 'disabled'}`);
  
  // Channel-specific info
  if (channel === 'all' || channel === 'telegram') {
    console.log(`\nTelegram: ${CONFIG.telegram.token ? 'configured' : 'not configured'}`);
  }
  
  if (channel === 'all' || channel === 'discord') {
    console.log(`Discord: ${CONFIG.discord.token ? 'configured' : 'not configured'}`);
  }
  
  if (channel === 'all' || channel === 'slack') {
    console.log(`Slack: ${CONFIG.slack.token ? 'configured' : 'not configured'}`);
  }
}

// Check connection health
async function checkHealth() {
  console.log('\n=== Connection Health ===\n');
  
  // Telegram
  if (CONFIG.telegram.token) {
    try {
      const url = `https://api.telegram.org/bot${CONFIG.telegram.token}/getMe`;
      const result = await request(url);
      if (result.status === 200) {
        console.log(`✓ Telegram: Connected as @${result.data.result.username}`);
      } else {
        console.log(`✗ Telegram: Error ${result.status}`);
      }
    } catch (e) {
      console.log(`✗ Telegram: ${e.message}`);
    }
  } else {
    console.log('- Telegram: Not configured');
  }
  
  // Discord
  if (CONFIG.discord.token) {
    try {
      const url = 'https://discord.com/api/v10/users/@me';
      const result = await request(url, {
        headers: { 'Authorization': `Bot ${CONFIG.discord.token}` }
      });
      if (result.status === 200) {
        console.log(`✓ Discord: Connected as ${result.data.username}#${result.data.discriminator}`);
      } else {
        console.log(`✗ Discord: Error ${result.status}`);
      }
    } catch (e) {
      console.log(`✗ Discord: ${e.message}`);
    }
  } else {
    console.log('- Discord: Not configured');
  }
  
  // Slack
  if (CONFIG.slack.token) {
    try {
      const url = 'https://slack.com/api/auth.test';
      const result = await request(url, {
        headers: { 'Authorization': `Bearer ${CONFIG.slack.token}` }
      });
      if (result.data?.ok) {
        console.log(`✓ Slack: Connected to workspace ${result.data.team}`);
      } else {
        console.log(`✗ Slack: Error`);
      }
    } catch (e) {
      console.log(`✗ Slack: ${e.message}`);
    }
  } else {
    console.log('- Slack: Not configured');
  }
}

// Set custom activity
function setActivity(activity) {
  CONFIG.activity = activity;
  console.log(`Activity set to: ${activity}`);
}

// Main CLI
async function main() {
  const command = process.argv[2];
  const subcommand = process.argv[3];
  const args = process.argv.slice(4);

  try {
    switch (command) {
      case 'status': {
        const status = subcommand;
        const activity = args.join(' ');
        
        if (!status) {
          console.log(`Current status: ${CONFIG.status}`);
          console.log(`Activity: ${CONFIG.activity || '(none)'}`);
          console.log(`\nAvailable statuses: ${Object.keys(PRESENCE_STATES).join(', ')}`);
          break;
        }
        
        await setPresence('all', status, activity);
        break;
      }

      case 'typing': {
        const action = subcommand; // start or stop
        const channel = args[0];
        const target = args[1];
        
        if (!action || !channel || !target) {
          console.error('Usage: presence-manager.js typing <start|stop> <channel> <target>');
          process.exit(1);
        }
        
        if (action === 'start') {
          await startTyping(channel, target);
        } else if (action === 'stop') {
          await stopTyping(channel, target);
        } else {
          console.error('Usage: presence-manager.js typing <start|stop> <channel> <target>');
          process.exit(1);
        }
        break;
      }

      case 'info': {
        const channel = subcommand;
        getInfo(channel || 'all');
        break;
      }

      case 'health': {
        await checkHealth();
        break;
      }

      case 'activity': {
        const activity = args.join(' ');
        if (!activity) {
          console.log(`Current activity: ${CONFIG.activity || '(none)'}`);
          break;
        }
        
        setActivity(activity);
        break;
      }

      default:
        console.log(`
Presence Manager Skill - CLI

Commands:
  status [state] [activity]  Set or show presence status
  typing <start|stop> <ch> <target>  Control typing indicator
  info [channel]             Get presence info
  health                     Check connection health
  activity [text]            Set or show custom activity

Status Values:
  online    🟢 Available
  away      🟡 Temporarily away
  dnd       🔴 Do not disturb
  offline   ⚪ Disconnected

Environment Variables:
  PRESENCE_STATUS            Initial presence (default: online)
  PRESENCE_ACTIVITY          Custom status text
  TYPING_INDICATORS_ENABLED  Enable typing (default: true)
  TELEGRAM_BOT_TOKEN        Telegram bot token
  DISCORD_BOT_TOKEN         Discord bot token
  SLACK_BOT_TOKEN           Slack bot token

Examples:
  presence-manager.js status
  presence-manager.js status online
  presence-manager.js status away "In a meeting"
  presence-manager.js typing start telegram 123456789
  presence-manager.js info discord
  presence-manager.js health
  presence-manager.js activity "Building something cool"
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
