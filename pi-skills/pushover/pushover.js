#!/usr/bin/env node

/**
 * Pushover Notification CLI
 * Based on zeroclaw's pushover tool
 */

const https = require('https');
const querystring = require('querystring');

// Get credentials from environment
const API_TOKEN = process.env.PUSHOVER_APP_TOKEN || process.env.PUSHOVER_TOKEN;
const USER_KEY = process.env.PUSHOVER_USER_KEY;

// Send a push notification
function sendNotification(args) {
  const { 
    message, 
    title, 
    priority = 0,
    sound,
    url,
    url_title,
    device
  } = args;
  
  if (!message) {
    return { success: false, output: 'Message is required', error: 'Missing message' };
  }
  
  if (!API_TOKEN || !USER_KEY) {
    return {
      success: false,
      output: 'Pushover credentials not configured. Set PUSHOVER_APP_TOKEN and PUSHOVER_USER_KEY.',
      error: 'Missing credentials',
      setup: 'Set PUSHOVER_APP_TOKEN and PUSHOVER_USER_KEY environment variables'
    };
  }
  
  const postData = querystring.stringify({
    token: API_TOKEN,
    user: USER_KEY,
    message,
    title: title || '',
    priority: priority,
    sound: sound || '',
    url: url || '',
    url_title: url_title || '',
    device: device || ''
  });
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.pushover.net',
      port: 443,
      path: '/1/messages.json',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.status === 1) {
            resolve({
              success: true,
              output: `Notification sent successfully!\nTitle: ${title || 'No title'}\nMessage: ${message.slice(0, 50)}...`,
              error: null,
              request_id: result.request
            });
          } else {
            resolve({
              success: false,
              output: `Failed: ${result.errors?.join(', ') || 'Unknown error'}`,
              error: result.errors?.join(', ') || 'API error'
            });
          }
        } catch (e) {
          resolve({
            success: false,
            output: 'Failed to parse response',
            error: e.message
          });
        }
      });
    });
    
    req.on('error', (e) => {
      resolve({
        success: false,
        output: 'Request failed: ' + e.message,
        error: e.message
      });
    });
    
    req.write(postData);
    req.end();
  });
}

// Validate credentials
function validateCredentials(args) {
  if (!API_TOKEN || !USER_KEY) {
    return {
      success: false,
      output: 'Pushover credentials not configured',
      error: 'Missing credentials',
      configured: false
    };
  }
  
  const postData = querystring.stringify({
    token: API_TOKEN,
    user: USER_KEY
  });
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.pushover.net',
      port: 443,
      path: '/1/users/validate.json',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.status === 1) {
            resolve({
              success: true,
              output: 'Credentials validated successfully!',
              error: null,
              configured: true,
              devices: result.devices
            });
          } else {
            resolve({
              success: false,
              output: 'Invalid credentials',
              error: result.errors?.join(', ') || 'Validation failed',
              configured: false
            });
          }
        } catch (e) {
          resolve({
            success: false,
            output: 'Failed to parse response',
            error: e.message,
            configured: false
          });
        }
      });
    });
    
    req.on('error', (e) => {
      resolve({
        success: false,
        output: 'Request failed: ' + e.message,
        error: e.message,
        configured: false
      });
    });
    
    req.write(postData);
    req.end();
  });
}

// CLI routing
const command = process.argv[2];
let args = {};

if (process.argv[3]) {
  try {
    args = JSON.parse(process.argv[3]);
  } catch {
    args = {};
  }
}

async function main() {
  let result;

  switch (command) {
    case 'send':
      result = await sendNotification(args);
      break;
    case 'validate':
      result = await validateCredentials(args);
      break;
    default:
      result = {
        success: false,
        output: `Unknown command: ${command}. Available: send, validate`,
        error: 'Unknown command'
      };
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
