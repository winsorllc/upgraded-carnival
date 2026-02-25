const https = require('https');
const querystring = require('querystring');

async function sendNotification(message, options = {}) {
  if (!process.env.PUSHOVER_TOKEN) {
    throw new Error('PUSHOVER_TOKEN not set');
  }
  if (!process.env.PUSHOVER_USER_KEY) {
    throw new Error('PUSHOVER_USER_KEY not set');
  }

  const data = {
    token: process.env.PUSHOVER_TOKEN,
    user: process.env.PUSHOVER_USER_KEY,
    message: message,
    ...options
  };

  return new Promise((resolve, reject) => {
    const postData = querystring.stringify(data);
    
    const req = https.request({
      hostname: 'api.pushover.net',
      port: 443,
      path: '/1/messages.json',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.status === 1) {
            resolve(result);
          } else {
            reject(new Error(result.errors?.[0] || 'Notification failed'));
          }
        } catch (e) {
          reject(new Error('Invalid response from Pushover'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.write(postData);
    req.end();
  });
}

async function validateCredentials() {
  try {
    const result = await sendNotification('Test notification from PopeBot', {
      title: 'Connection Test',
      priority: -2
    });
    return { valid: true, result };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('Usage: node index.js <command> [options]');
    console.log('Commands:');
    console.log('  send <message> [--title title] [--priority 0-2] [--sound siren]');
    console.log('  validate');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'send': {
        const message = args.slice(1).find(a => !a.startsWith('--'));
        if (!message) {
          console.error('Message required');
          process.exit(1);
        }

        const options = {};
        for (let i = 1; i < args.length; i++) {
          if (args[i] === '--title' && args[i + 1]) {
            options.title = args[++i];
          } else if (args[i] === '--priority' && args[i + 1]) {
            options.priority = parseInt(args[++i]);
          } else if (args[i] === '--sound' && args[i + 1]) {
            options.sound = args[++i];
          } else if (args[i] === '--url' && args[i + 1]) {
            options.url = args[++i];
          } else if (args[i] === '--url-title' && args[i + 1]) {
            options.url_title = args[++i];
          }
        }

        console.log('Sending notification...');
        const result = await sendNotification(message, options);
        console.log('✅ Sent! Request:', result.request);
        break;
      }

      case 'validate': {
        console.log('Validating credentials...');
        const result = await validateCredentials();
        if (result.valid) {
          console.log('✅ Credentials valid');
        } else {
          console.log('❌ Invalid:', result.error);
          process.exit(1);
        }
        break;
      }

      default:
        console.error('Unknown command:', command);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  sendNotification,
  validateCredentials
};
