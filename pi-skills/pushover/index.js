#!/usr/bin/env node

/**
 * Pushover Notification Tool
 * Sends push notifications via Pushover API
 * 
 * Required env vars: PUSHOVER_TOKEN, PUSHOVER_USER_KEY
 */

const PUSHOVER_API_URL = 'https://api.pushover.net/1/messages.json';

const SOUNDS = [
  'pushover', 'bike', 'bugle', 'cashregister', 'classical', 'cosmic',
  'falling', 'gamelan', 'incoming', 'intermission', 'magic', 'mechanical',
  'pianobar', 'siren', 'spacealarm', 'tugboat', 'alien', 'climb',
  'persistent', 'echo', 'updown', 'none'
];

async function sendPushoverNotification(options) {
  const { 
    message, 
    title = '', 
    priority = 0, 
    sound = 'pushover',
    retry = null,
    expire = null
  } = options;
  
  const token = process.env.PUSHOVER_TOKEN;
  const userKey = process.env.PUSHOVER_USER_KEY;
  
  if (!token || !userKey) {
    throw new Error('PUSHOVER_TOKEN and PUSHOVER_USER_KEY must be set');
  }
  
  if (!message) {
    throw new Error('message is required');
  }
  
  if (priority === 2 && (retry === null || expire === null)) {
    throw new Error('retry and expire are required for priority 2 (emergency)');
  }
  
  if (sound && !SOUNDS.includes(sound)) {
    throw new Error(`Invalid sound. Choose from: ${SOUNDS.join(', ')}`);
  }
  
  const formData = new URLSearchParams();
  formData.append('token', token);
  formData.append('user', userKey);
  formData.append('message', message);
  
  if (title) formData.append('title', title);
  if (priority !== 0) formData.append('priority', priority);
  if (sound && sound !== 'pushover') formData.append('sound', sound);
  if (priority === 2) {
    formData.append('retry', retry);
    formData.append('expire', expire);
  }
  
  const response = await fetch(PUSHOVER_API_URL, {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  
  if (result.status !== 1) {
    throw new Error(`Pushover API error: ${result.errors?.join(', ') || result.message}`);
  }
  
  return {
    success: true,
    requestId: result.request,
    message: 'Notification sent successfully'
  };
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Pushover Notification Tool

Usage: node pushover.js [options]

Options:
  --message <text>    Message to send (required)
  --title <text>      Notification title (optional)
  --priority <num>    Priority: -2 to 2 (default: 0)
  --sound <name>     Notification sound (default: pushover)
  --retry <num>      Retry count for priority 2 (optional)
  --expire <num>     Expire seconds for priority 2 (optional)
  --help, -h         Show this help

Environment Variables:
  PUSHOVER_TOKEN      Your Pushover app token
  PUSHOVER_USER_KEY  Your Pushover user key

Example:
  PUSHOVER_TOKEN=abc PUSHOVER_USER_KEY=xyz node pushover.js --message "Hello!" --title "Test"
`);
    process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
  }
  
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--message' && args[i + 1]) options.message = args[++i];
    else if (args[i] === '--title' && args[i + 1]) options.title = args[++i];
    else if (args[i] === '--priority' && args[i + 1]) options.priority = parseInt(args[++i]);
    else if (args[i] === '--sound' && args[i + 1]) options.sound = args[++i];
    else if (args[i] === '--retry' && args[i + 1]) options.retry = parseInt(args[++i]);
    else if (args[i] === '--expire' && args[i + 1]) options.expire = parseInt(args[++i]);
  }
  
  try {
    const result = await sendPushoverNotification(options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ success: false, error: error.message }));
    process.exit(1);
  }
}

// Export for use as a module
module.exports = { sendPushoverNotification };

// Run if executed directly
if (require.main === module) {
  main();
}
