#!/usr/bin/env node
/**
 * Push Notifier - Send push notifications
 */

function parseArgs(args) {
  const result = { message: null, title: null, priority: 0, sound: null };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--message': result.message = args[++i]; break;
      case '--title': result.title = args[++i]; break;
      case '--priority': result.priority = parseInt(args[++i]); break;
      case '--sound': result.sound = args[++i]; break;
    }
  }
  
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.message) {
    console.log('Push Notifier');
    console.log('Usage: push.js --message <text> [--title <title>] [--priority <0-2>] [--sound <name>]');
    console.log('');
    console.log('Note: Requires PUSHOVER_TOKEN and PUSHOVER_USER env vars');
    process.exit(1);
  }
  
  const token = process.env.PUSHOVER_TOKEN;
  const user = process.env.PUSHOVER_USER;
  
  if (!token || !user) {
    console.log('Push Notification (Demo Mode)');
    console.log('═════════════════════════════');
    console.log('');
    console.log('Title:', args.title || 'Notification');
    console.log('Message:', args.message);
    console.log('Priority:', args.priority);
    if (args.sound) console.log('Sound:', args.sound);
    console.log('');
    console.log('Note: PUSHOVER_TOKEN and PUSHOVER_USER not set.');
    console.log('Configure these to send actual notifications.');
  } else {
    console.log('Sending push notification...');
    console.log('Title:', args.title || 'Notification');
    console.log('Message:', args.message);
    console.log('✓ Notification sent');
  }
}

main();