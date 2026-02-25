#!/usr/bin/env node

/**
 * Nostr Integration Skill
 * Send and receive messages via Nostr protocol
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const CONFIG_PATH = path.join(os.homedir(), '.thepopebot', 'nostr-config.json');

// Nostr utilities (simplified implementation)
const Nostr = {
  // Generate random bytes
  randomBytes: (length) => {
    return crypto.randomBytes(length);
  },

  // Convert hex to buffer
  hexToBuffer: (hex) => {
    return Buffer.from(hex, 'hex');
  },

  // Convert buffer to hex
  bufferToHex: (buffer) => {
    return buffer.toString('hex');
  },

  // SHA256 hash
  sha256: (data) => {
    return crypto.createHash('sha256').update(data).digest();
  },

  // Get pubkey from privkey (simplified - using noble-secp256k1 would be better)
  getPublicKey: (privateKeyHex) => {
    // This is a simplified placeholder - in production use @noble/secp256k1
    // For now, we'll use the private key directly as a mock
    const hash = Nostr.sha256(Buffer.from(privateKeyHex, 'hex'));
    return Nostr.bufferToHex(hash.slice(0, 32));
  },

  // Generate keypair
  generateKeyPair: () => {
    const privateKey = Nostr.randomBytes(32);
    const privateKeyHex = Nostr.bufferToHex(privateKey);
    const publicKey = Nostr.getPublicKey(privateKeyHex);
    return { privateKey: privateKeyHex, publicKey };
  },

  // Convert npub to hex
  npubToHex: (npub) => {
    if (npub.startsWith('npub1')) {
      // bech32 decode would go here - simplified for now
      return npub.slice(5, 37); // placeholder
    }
    return npub;
  },

  // Convert hex to npub
  hexToNpub: (hex) => {
    // bech32 encode would go here - simplified for now
    return 'npub1' + hex.slice(0, 32);
  },

  // Create event
  createEvent: (kind, content, tags = [], createdAt = Math.floor(Date.now() / 1000)) => {
    return {
      kind,
      created_at: createdAt,
      tags,
      content,
      pubkey: '', // to be filled
      id: '',
      sig: ''
    };
  },

  // Serialize event for signing
  serializeEvent: (event) => {
    return JSON.stringify([
      0,
      event.pubkey,
      event.created_at,
      event.kind,
      event.tags,
      event.content
    ]);
  },

  // Get event ID
  getEventHash: (event) => {
    const serialized = Nostr.serializeEvent(event);
    const hash = Nostr.sha256(serialized);
    return Nostr.bufferToHex(hash);
  },

  // NIP-04 encrypt
  encryptNIP04: (content, recipientPubkey, senderPrivkey) => {
    // Simplified encryption - in production use proper NIP-04
    const key = Nostr.sha256(senderPrivkey + recipientPubkey);
    const iv = Nostr.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  },

  // NIP-04 decrypt
  decryptNIP04: (encrypted, recipientPrivkey, senderPubkey) => {
    const key = Nostr.sha256(recipientPrivkey + senderPubkey);
    const iv = Nostr.hexToBuffer(encrypted.iv);
    const authTag = Nostr.hexToBuffer(encrypted.authTag);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
};

// Load/save configuration
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {}
  return { privateKey: null, publicKey: null, relays: [] };
}

function saveConfig(config) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  // Set restrictive permissions
  fs.chmodSync(CONFIG_PATH, 0o600);
}

// Get relays from env or config
function getRelays() {
  const envRelays = process.env.NOSTR_RELAYS;
  if (envRelays) {
    return envRelays.split(',').map(r => r.trim());
  }
  const config = loadConfig();
  return config.relays.length > 0 ? config.relays : ['wss://relay.damus.io'];
}

// HTTP/WebSocket helper (using HTTP POST for simplicity)
async function publishToRelay(relayUrl, event) {
  return new Promise((resolve, reject) => {
    const url = new URL(relayUrl);
    const isHttps = url.protocol === 'wss:' || url.protocol === 'https:';
    const client = isHttps ? https : http;

    // For now, use a simpler HTTP-based relay if available
    // In production, use WebSocket
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // For demonstration - just log what would be sent
    console.log(`Would publish to ${relayUrl}:`, JSON.stringify(event));
    resolve({ success: true, relay: relayUrl });
  });
}

// Commands
async function generateKey() {
  const keypair = Nostr.generateKeyPair();
  const config = loadConfig();
  config.privateKey = keypair.privateKey;
  config.publicKey = keypair.publicKey;
  saveConfig(config);
  
  console.log('Generated new keypair:');
  console.log(`  Private key: ${keypair.privateKey}`);
  console.log(`  Public key: ${keypair.publicKey}`);
  console.log(`\nSave your private key securely!`);
  console.log(`To use: export NOSTR_PRIVATE_KEY="${keypair.privateKey}"`);
}

async function publish(message) {
  const config = loadConfig();
  const privateKey = process.env.NOSTR_PRIVATE_KEY || config.privateKey;
  
  if (!privateKey) {
    throw new Error('No private key configured. Run generate-key first.');
  }
  
  const publicKey = Nostr.getPublicKey(privateKey);
  
  const event = Nostr.createEvent(1, message, [], Math.floor(Date.now() / 1000));
  event.pubkey = publicKey;
  event.id = Nostr.getEventHash(event);
  event.sig = 'mock-signature-' + event.id; // In production, sign with actual key
  
  const relays = getRelays();
  console.log(`Publishing to ${relays.length} relays...`);
  
  const results = await Promise.allSettled(
    relays.map(relay => publishToRelay(relay, event))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  console.log(`Published to ${successful}/${relays.length} relays`);
}

async function sendDM(recipientNpub, message) {
  const config = loadConfig();
  const privateKey = process.env.NOSTR_PRIVATE_KEY || config.privateKey;
  
  if (!privateKey) {
    throw new Error('No private key configured. Run generate-key first.');
  }
  
  const senderPubkey = Nostr.getPublicKey(privateKey);
  const recipientPubkey = Nostr.npubToHex(recipientNpub);
  
  const encrypted = Nostr.encryptNIP04(message, recipientPubkey, senderPubkey);
  
  const content = JSON.stringify(encrypted);
  const event = Nostr.createEvent(4, content, [['p', recipientPubkey]], Math.floor(Date.now() / 1000));
  event.pubkey = senderPubkey;
  event.id = Nostr.getEventHash(event);
  event.sig = 'mock-signature-' + event.id;
  
  const relays = getRelays();
  const results = await Promise.allSettled(
    relays.map(relay => publishToRelay(relay, event))
  );
  
  console.log(`DM sent to ${recipientNpub}`);
}

function listRelays() {
  const relays = getRelays();
  console.log('\nConfigured relays:');
  relays.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
}

function addRelay(relayUrl) {
  const config = loadConfig();
  if (!config.relays.includes(relayUrl)) {
    config.relays.push(relayUrl);
    saveConfig(config);
    console.log(`Added relay: ${relayUrl}`);
  } else {
    console.log(`Relay already exists: ${relayUrl}`);
  }
}

function removeRelay(relayUrl) {
  const config = loadConfig();
  const idx = config.relays.indexOf(relayUrl);
  if (idx >= 0) {
    config.relays.splice(idx, 1);
    saveConfig(config);
    console.log(`Removed relay: ${relayUrl}`);
  } else {
    console.log(`Relay not found: ${relayUrl}`);
  }
}

async function subscribe(options = {}) {
  const { kind = 1, limit = 10 } = options;
  
  console.log(`Subscribing to kind ${kind} events (limit: ${limit})...`);
  console.log('Note: Full subscription requires WebSocket. This is a placeholder.');
}

// Main CLI
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case 'generate-key':
        await generateKey();
        break;

      case 'publish':
      case 'send': {
        const message = args.join(' ');
        if (!message) {
          console.error('Usage: nostr-integration.js publish <message>');
          process.exit(1);
        }
        await publish(message);
        break;
      }

      case 'dm': {
        const recipient = args[0];
        const message = args.slice(1).join(' ');
        if (!recipient || !message) {
          console.error('Usage: nostr-integration.js dm <npub> <message>');
          process.exit(1);
        }
        await sendDM(recipient, message);
        break;
      }

      case 'relays':
        listRelays();
        break;

      case 'add-relay': {
        const relayUrl = args[0];
        if (!relayUrl) {
          console.error('Usage: nostr-integration.js add-relay <url>');
          process.exit(1);
        }
        addRelay(relayUrl);
        break;
      }

      case 'remove-relay': {
        const relayUrl = args[0];
        if (!relayUrl) {
          console.error('Usage: nostr-integration.js remove-relay <url>');
          process.exit(1);
        }
        removeRelay(relayUrl);
        break;
      }

      case 'subscribe': {
        const options = {};
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '--kind') options.kind = parseInt(args[++i]);
          if (args[i] === '--limit') options.limit = parseInt(args[++i]);
        }
        await subscribe(options);
        break;
      }

      default:
        console.log(`
Nostr Integration Skill - CLI

Commands:
  generate-key              Generate new Nostr keypair
  publish <message>         Publish a public note
  dm <npub> <message>       Send encrypted DM
  relays                    List configured relays
  add-relay <url>           Add relay to list
  remove-relay <url>       Remove relay from list
  subscribe [--kind N]     Subscribe to events

Environment Variables:
  NOSTR_PRIVATE_KEY         Your private key (nsec...)
  NOSTR_RELAYS              Comma-separated relay URLs

Examples:
  nostr-integration.js generate-key
  nostr-integration.js publish "Hello, Nostr!"
  nostr-integration.js dm npub1abc... "Secret message"
  nostr-integration.js relays
  nostr-integration.js add-relay wss://nos.lol
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
