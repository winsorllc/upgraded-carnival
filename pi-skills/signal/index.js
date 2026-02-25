#!/usr/bin/env node

/**
 * Signal CLI Integration
 * Send and receive Signal messages via signal-cli
 */

const { spawn } = require('child_process');
const path = require('path');

const SIGNAL_CLI = process.env.SIGNAL_CLI_PATH || 'signal-cli';

class SignalClient {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Execute signal-cli command
   */
  async exec(args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(SIGNAL_CLI, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...this.config.env }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(stderr || `Exit code: ${code}`));
        }
      });

      proc.on('error', reject);
    });
  }

  /**
   * Send a message to a phone number
   */
  async sendMessage(recipient, message, options = {}) {
    const args = ['send', '-m', message];
    
    if (options.attachment) {
      args.push('-a', options.attachment);
    }
    
    if (options.groupName) {
      args.push('-g', options.groupName);
    } else {
      args.push(recipient);
    }

    return this.exec(args);
  }

  /**
   * Send message to a group
   */
  async sendToGroup(groupId, message) {
    return this.exec(['send', '-g', groupId, '-m', message]);
  }

  /**
   * List all Signal groups
   */
  async listGroups() {
    const output = await this.exec(['listGroups']);
    return this.parseGroups(output);
  }

  /**
   * Parse group list output
   */
  parseGroups(output) {
    const groups = [];
    const lines = output.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      const match = line.match(/Group.*?:\s*(.+?)(?:\s+Members:|$)/i);
      if (match) {
        groups.push({ name: match[1].trim(), raw: line });
      }
    }
    
    return groups;
  }

  /**
   * Receive pending messages (non-blocking)
   */
  async receive() {
    try {
      const output = await this.exec(['receive', '--json']);
      if (!output) return [];
      return JSON.parse(output);
    } catch (e) {
      if (e.message.includes('No new messages')) return [];
      throw e;
    }
  }

  /**
   * Register a new number
   */
  async register(phoneNumber) {
    return this.exec(['register', '--phone', phoneNumber]);
  }

  /**
   * Verify registration code
   */
  async verify(phoneNumber, code) {
    return this.exec(['verify', '--phone', phoneNumber, code]);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const client = new SignalClient();

  (async () => {
    try {
      switch (command) {
        case 'send':
          const recipient = args[1];
          const message = args[2];
          if (!recipient || !message) {
            console.error('Usage: signal send <recipient> <message>');
            process.exit(1);
          }
          await client.sendMessage(recipient, message);
          console.log('Message sent successfully');
          break;
          
        case 'groups':
          const groups = await client.listGroups();
          console.log(JSON.stringify(groups, null, 2));
          break;
          
        case 'receive':
          const messages = await client.receive();
          console.log(JSON.stringify(messages, null, 2));
          break;
          
        default:
          console.log('Signal CLI Commands:');
          console.log('  send <recipient> <message>  - Send a message');
          console.log('  groups                       - List groups');
          console.log('  receive                      - Receive messages');
      }
    } catch (e) {
      console.error('Error:', e.message);
      process.exit(1);
    }
  })();
}

module.exports = { SignalClient };
