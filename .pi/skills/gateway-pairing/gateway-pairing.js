#!/usr/bin/env node

/**
 * Gateway Pairing - Device pairing with OTP and bearer tokens
 * Inspired by ZeroClaw's gateway pairing with constant-time comparison
 */

import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.PAIRING_DB_PATH || path.join(__dirname, 'pairing.db');

let db;

function initDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_paired_at TEXT,
        revoked INTEGER DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        otp TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        FOREIGN KEY (device_id) REFERENCES devices(id)
      );
      
      CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (device_id) REFERENCES devices(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_otp_device ON otps(device_id);
      CREATE INDEX IF NOT EXISTS idx_token ON tokens(token);
    `);
  }
  return db;
}

// Constant-time string comparison (timing attack resistant)
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  
  if (bufA.length !== bufB.length) {
    // Still do comparison to maintain constant time
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  
  return crypto.timingSafeEqual(bufA, bufB);
}

function generateOTP() {
  // Generate 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken() {
  return 'bearer_' + crypto.randomBytes(32).toString('hex');
}

function getExpiry(seconds) {
  const date = new Date();
  date.setSeconds(date.getSeconds() + seconds);
  return date.toISOString();
}

async function cmdInitiate(options) {
  const { deviceId, name } = options;
  
  if (!deviceId) {
    throw new Error('--device-id is required');
  }
  
  initDB();
  
  // Create or update device
  const upsertDevice = db.prepare(`
    INSERT INTO devices (id, name, last_paired_at)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET last_paired_at = ?
  `);
  upsertDevice.run(deviceId, name || deviceId, new Date().toISOString(), new Date().toISOString());
  
  // Generate OTP
  const otp = generateOTP();
  const expiresAt = getExpiry(300); // 5 minutes
  
  const insertOTP = db.prepare(`
    INSERT INTO otps (device_id, otp, expires_at)
    VALUES (?, ?, ?)
  `);
  insertOTP.run(deviceId, otp, expiresAt);
  
  return {
    success: true,
    deviceId,
    name: name || deviceId,
    otp,
    expiresAt,
    message: 'OTP valid for 5 minutes'
  };
}

async function cmdVerify(options) {
  const { deviceId, otp } = options;
  
  if (!deviceId) {
    throw new Error('--device-id is required');
  }
  if (!otp) {
    throw new Error('--otp is required');
  }
  
  initDB();
  
  // Check device exists and not revoked
  const deviceStmt = db.prepare('SELECT * FROM devices WHERE id = ? AND revoked = 0');
  const device = deviceStmt.get(deviceId);
  
  if (!device) {
    return { success: false, message: 'Device not found or revoked' };
  }
  
  // Find valid OTP
  const now = new Date().toISOString();
  const otpStmt = db.prepare(`
    SELECT * FROM otps 
    WHERE device_id = ? AND otp = ? AND used = 0 AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1
  `);
  const otpRecord = otpStmt.get(deviceId, otp, now);
  
  if (!otpRecord) {
    return { success: false, message: 'Invalid or expired OTP' };
  }
  
  // Use constant-time comparison
  if (!secureCompare(otpRecord.otp, otp)) {
    return { success: false, message: 'Invalid OTP' };
  }
  
  // Mark OTP as used
  const updateOTP = db.prepare('UPDATE otps SET used = 1 WHERE id = ?');
  updateOTP.run(otpRecord.id);
  
  // Update device last paired
  const updateDevice = db.prepare('UPDATE devices SET last_paired_at = ? WHERE id = ?');
  updateDevice.run(new Date().toISOString(), deviceId);
  
  return {
    success: true,
    deviceId,
    message: 'Device paired successfully'
  };
}

async function cmdToken(options) {
  const { deviceId, expiresIn = 86400 } = options;
  
  if (!deviceId) {
    throw new Error('--device-id is required');
  }
  
  initDB();
  
  // Check device exists and not revoked
  const deviceStmt = db.prepare('SELECT * FROM devices WHERE id = ? AND revoked = 0');
  const device = deviceStmt.get(deviceId);
  
  if (!device) {
    return { success: false, message: 'Device not found or revoked' };
  }
  
  // Generate bearer token
  const token = generateToken();
  const expiresAt = getExpiry(expiresIn);
  
  const insertToken = db.prepare(`
    INSERT INTO tokens (device_id, token, expires_at)
    VALUES (?, ?, ?)
  `);
  insertToken.run(deviceId, token, expiresAt);
  
  return {
    success: true,
    deviceId,
    token,
    expiresAt,
    expiresIn
  };
}

async function cmdValidate(options) {
  const { token } = options;
  
  if (!token) {
    throw new Error('--token is required');
  }
  
  initDB();
  
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    SELECT t.*, d.name as device_name 
    FROM tokens t
    JOIN devices d ON t.device_id = d.id
    WHERE t.token = ? AND t.expires_at > ? AND d.revoked = 0
  `);
  const tokenRecord = stmt.get(token, now);
  
  if (!tokenRecord) {
    return { valid: false, message: 'Invalid or expired token' };
  }
  
  return {
    valid: true,
    deviceId: tokenRecord.device_id,
    deviceName: tokenRecord.device_name,
    expiresAt: tokenRecord.expires_at
  };
}

async function cmdList(options) {
  initDB();
  
  const stmt = db.prepare(`
    SELECT d.*, 
           (SELECT COUNT(*) FROM tokens t WHERE t.device_id = d.id AND t.expires_at > ?) as active_tokens
    FROM devices d
    WHERE d.revoked = 0
    ORDER BY d.last_paired_at DESC
  `);
  
  const devices = stmt.all(new Date().toISOString());
  
  return { devices };
}

async function cmdRevoke(options) {
  const { deviceId } = options;
  
  if (!deviceId) {
    throw new Error('--device-id is required');
  }
  
  initDB();
  
  // Revoke device
  const updateDevice = db.prepare('UPDATE devices SET revoked = 1 WHERE id = ?');
  const result = updateDevice.run(deviceId);
  
  if (result.changes === 0) {
    return { success: false, message: 'Device not found' };
  }
  
  // Invalidate all tokens
  const updateTokens = db.prepare('DELETE FROM tokens WHERE device_id = ?');
  updateTokens.run(deviceId);
  
  return { success: true, deviceId, message: 'Device revoked and tokens invalidated' };
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    if (command === 'initiate') {
      const options = {
        deviceId: getArgValue(args, '--device-id'),
        name: getArgValue(args, '--name')
      };
      
      if (!options.deviceId) {
        console.error('Error: --device-id is required');
        process.exit(1);
      }
      
      const result = await cmdInitiate(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'verify') {
      const options = {
        deviceId: getArgValue(args, '--device-id'),
        otp: getArgValue(args, '--otp')
      };
      
      if (!options.deviceId || !options.otp) {
        console.error('Error: --device-id and --otp are required');
        process.exit(1);
      }
      
      const result = await cmdVerify(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'token') {
      const options = {
        deviceId: getArgValue(args, '--device-id'),
        expiresIn: parseInt(getArgValue(args, '--expires-in') || '86400')
      };
      
      if (!options.deviceId) {
        console.error('Error: --device-id is required');
        process.exit(1);
      }
      
      const result = await cmdToken(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'validate') {
      const options = {
        token: getArgValue(args, '--token')
      };
      
      if (!options.token) {
        console.error('Error: --token is required');
        process.exit(1);
      }
      
      const result = await cmdValidate(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'list') {
      const result = await cmdList({});
      console.log(JSON.stringify(result, null, 2));
      
    } else if (command === 'revoke') {
      const options = {
        deviceId: getArgValue(args, '--device-id')
      };
      
      if (!options.deviceId) {
        console.error('Error: --device-id is required');
        process.exit(1);
      }
      
      const result = await cmdRevoke(options);
      console.log(JSON.stringify(result, null, 2));
      
    } else {
      console.log(`
Gateway Pairing - Device pairing with OTP and bearer tokens

Usage:
  gateway-pairing.js initiate --device-id <id> [--name <name>]
  gateway-pairing.js verify --device-id <id> --otp <otp>
  gateway-pairing.js token --device-id <id> [--expires-in <seconds>]
  gateway-pairing.js validate --token <token>
  gateway-pairing.js list
  gateway-pairing.js revoke --device-id <id>

Commands:
  initiate  Generate OTP for device pairing
  verify    Verify OTP and complete pairing
  token     Generate bearer token for device
  validate  Validate bearer token
  list      List paired devices
  revoke    Revoke device and invalidate tokens

Examples:
  gateway-pairing.js initiate --device-id "phone-123" --name "My Phone"
  gateway-pairing.js verify --device-id "phone-123" --otp "123456"
  gateway-pairing.js token --device-id "phone-123" --expires-in 86400
  gateway-pairing.js validate --token "bearer_xxx"
  gateway-pairing.js list
  gateway-pairing.js revoke --device-id "phone-123"
`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function getArgValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return null;
  return args[index + 1];
}

main();
