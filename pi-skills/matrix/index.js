#!/usr/bin/env node

/**
 * Matrix Protocol Integration
 * Send and receive messages via Matrix using matrix-commander
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const MATRIX_COMMANDER = process.env.MATRIX_CLI_PATH || 'matrix-commander';

class MatrixClient {
  constructor(config = {}) {
    this.credentials = config.credentials || 'matrix-creds.json';
    this.rooms = config.rooms || 'rooms.json';
  }

  /**
   * Execute matrix-commander command
   */
  async exec(args, options = {}) {
    return new Promise((resolve, reject) => {
      const defaultArgs = [
        '--credentials', this.credentials,
        '--rooms', this.rooms,
        '--store', 'matrix-store'
      ];
      
      const proc = spawn(MATRIX_COMMANDER, [...defaultArgs, ...args], {
        stdio: options.json ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'],
        cwd: options.cwd || process.cwd()
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code === 0 || options.allowNonZero) {
          resolve(stdout.trim());
        } else {
          reject(new Error(stderr || `Exit code: ${code}`));
        }
      });

      proc.on('error', reject);
    });
  }

  /**
   * Send a message to a room
   */
  async sendMessage(message, room) {
    return this.exec(['-m', message, '-r', room]);
  }

  /**
   * Send a direct message to a user
   */
  async sendDM(message, user) {
    return this.exec(['-m', message, '-u', user]);
  }

  /**
   * List joined rooms
   */
  async listRooms() {
    const output = await this.exec(['--list-rooms']);
    return this.parseRooms(output);
  }

  /**
   * Parse rooms list
   */
  parseRooms(output) {
    const rooms = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/#?[\w:-]+/);
      if (match) {
        rooms.push(match[0]);
      }
    }
    
    return rooms;
  }

  /**
   * Join a room
   */
  async joinRoom(roomAlias) {
    return this.exec(['--join-room', roomAlias]);
  }

  /**
   * Leave a room
   */
  async leaveRoom(roomAlias) {
    return this.exec(['--leave-room', roomAlias]);
  }

  /**
   * Get room members
   */
  async getMembers(roomAlias) {
    return this.exec(['--room-members', roomAlias], { allowNonZero: true });
  }

  /**
   * Initialize credentials interactively
   */
  async init(homeserver, username, password) {
    const creds = {
      homeserver,
      username,
      password,
      device_id: 'thepopebot',
      store_path: 'matrix-store'
    };
    
    fs.writeFileSync(this.credentials, JSON.stringify(creds, null, 2));
    return 'Credentials saved. Run --list-rooms to verify.';
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const client = new MatrixClient();

  (async () => {
    try {
      switch (command) {
        case 'send':
          const room = args[1];
          const message = args[2];
          if (!room || !message) {
            console.error('Usage: matrix send <room> <message>');
            process.exit(1);
          }
          await client.sendMessage(message, room);
          console.log('Message sent successfully');
          break;
          
        case 'rooms':
          const rooms = await client.listRooms();
          console.log('Joined rooms:');
          rooms.forEach(r => console.log('  -', r));
          break;
          
        case 'join':
          if (!args[1]) {
            console.error('Usage: matrix join <room-alias>');
            process.exit(1);
          }
          await client.joinRoom(args[1]);
          console.log('Joined room successfully');
          break;
          
        case 'init':
          const hs = args[1];
          const user = args[2];
          const pass = args[3];
          if (!hs || !user || !pass) {
            console.error('Usage: matrix init <homeserver> <username> <password>');
            process.exit(1);
          }
          console.log(await client.init(hs, user, pass));
          break;
          
        default:
          console.log('Matrix CLI Commands:');
          console.log('  send <room> <message>   - Send message to room');
          console.log('  rooms                    - List joined rooms');
          console.log('  join <room-alias>        - Join a room');
          console.log('  init <hs> <user> <pass>  - Initialize credentials');
      }
    } catch (e) {
      console.error('Error:', e.message);
      process.exit(1);
    }
  })();
}

module.exports = { MatrixClient };
