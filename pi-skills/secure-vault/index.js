#!/usr/bin/env node

/**
 * Secure Vault
 * Encrypted secrets storage with local key file protection
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const DEFAULT_KEY_FILE = path.join(os.homedir(), '.vault.key');
const DEFAULT_VAULT_FILE = '.vault.enc';
const MAX_FAILED_ATTEMPTS = 3;

class SecureVault {
  constructor(options = {}) {
    this.keyFile = options.keyFile || DEFAULT_KEY_FILE;
    this.vaultFile = options.vaultFile || DEFAULT_VAULT_FILE;
    this.lockFile = options.lockFile || '.vault.lock';
    this.key = null;
    this.failedAttempts = 0;
  }

  /**
   * Initialize vault with new key
   */
  async init(keyPath = null) {
    const keyFile = keyPath || this.keyFile;
    
    // Generate random key
    const key = crypto.randomBytes(32).toString('hex');
    
    // Ensure directory exists
    const dir = path.dirname(keyFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write key file (with restrictive permissions)
    fs.writeFileSync(keyFile, key, { mode: 0o600 });
    
    // Create empty vault
    this.key = key;
    await this.save();
    
    console.log(`Vault initialized. Key saved to: ${keyFile}`);
    return true;
  }

  /**
   * Load key from file
   */
  loadKey() {
    if (!fs.existsSync(this.keyFile)) {
      throw new Error(`Key file not found: ${this.keyFile}. Run 'vault init' first.`);
    }
    
    this.key = fs.readFileSync(this.keyFile, 'utf8').trim();
    return this.key;
  }

  /**
   * XOR encryption with key
   */
  encrypt(plaintext) {
    if (!this.key) this.loadKey();
    
    const keyBuffer = Buffer.from(this.key, 'utf8');
    const textBuffer = Buffer.from(plaintext, 'utf8');
    const result = Buffer.alloc(textBuffer.length);
    
    for (let i = 0; i < textBuffer.length; i++) {
      result[i] = textBuffer[i] ^ keyBuffer[i % keyBuffer.length];
    }
    
    return result.toString('base64');
  }

  /**
   * XOR decryption with key
   */
  decrypt(ciphertext) {
    if (!this.key) this.loadKey();
    
    const keyBuffer = Buffer.from(this.key, 'utf8');
    const cipherBuffer = Buffer.from(ciphertext, 'base64');
    const result = Buffer.alloc(cipherBuffer.length);
    
    for (let i = 0; i < cipherBuffer.length; i++) {
      result[i] = cipherBuffer[i] ^ keyBuffer[i % keyBuffer.length];
    }
    
    return result.toString('utf8');
  }

  /**
   * Load vault data
   */
  async load() {
    if (!fs.existsSync(this.vaultFile)) {
      return {};
    }
    
    try {
      const encrypted = fs.readFileSync(this.vaultFile, 'utf8');
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (e) {
      this.failedAttempts++;
      if (this.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        throw new Error('Vault locked: too many failed attempts');
      }
      throw new Error('Failed to decrypt vault. Check your key file.');
    }
  }

  /**
   * Save vault data
   */
  async save(data = null) {
    if (!this.key) this.loadKey();
    
    const toSave = data || {};
    const encrypted = this.encrypt(JSON.stringify(toSave));
    fs.writeFileSync(this.vaultFile, encrypted);
    
    return true;
  }

  /**
   * Unlock vault (load key and verify)
   */
  async unlock() {
    this.loadKey();
    await this.load(); // Verify key works
    this.failedAttempts = 0;
    return true;
  }

  /**
   * Set a secret
   */
  async set(key, value, options = {}) {
    await this.unlock();
    
    const data = await this.load();
    data[key] = {
      value,
      vault: options.vault || 'default',
      createdAt: data[key]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await this.save(data);
    return true;
  }

  /**
   * Get a secret
   */
  async get(key, options = {}) {
    await this.unlock();
    
    const data = await this.load();
    const secret = data[key];
    
    if (!secret) {
      throw new Error(`Secret not found: ${key}`);
    }
    
    if (options.vault && secret.vault !== options.vault) {
      throw new Error(`Secret ${key} not found in vault: ${options.vault}`);
    }
    
    return secret.value;
  }

  /**
   * List secrets (names only, not values)
   */
  async list(options = {}) {
    await this.unlock();
    
    const data = await this.load();
    const secrets = Object.entries(data)
      .filter(([_, v]) => !options.vault || v.vault === options.vault)
      .map(([k, v]) => ({
        name: k,
        vault: v.vault,
        updatedAt: v.updatedAt
      }));
    
    return secrets;
  }

  /**
   * Delete a secret
   */
  async delete(key) {
    await this.unlock();
    
    const data = await this.load();
    if (!data[key]) {
      throw new Error(`Secret not found: ${key}`);
    }
    
    delete data[key];
    await this.save(data);
    
    return true;
  }

  /**
   * Export secrets as environment variables
   */
  async export(options = {}) {
    await this.unlock();
    
    const data = await this.load();
    const lines = Object.entries(data)
      .filter(([_, v]) => !options.vault || v.vault === options.vault)
      .map(([k, v]) => `export ${k}="${v.value.replace(/"/g, '\\"')}"`);
    
    return lines.join('\n');
  }

  /**
   * Lock vault (clear key from memory)
   */
  lock() {
    this.key = null;
    return true;
  }

  /**
   * Rotate master key (re-encrypt all secrets)
   */
  async rotate(newKeyPath = null) {
    // Load all secrets with old key
    await this.unlock();
    const data = await this.load();
    
    // Generate new key
    const newKey = crypto.randomBytes(32).toString('hex');
    
    // Save with new key
    if (newKeyPath) {
      this.keyFile = newKeyPath;
    }
    this.key = newKey;
    await this.save(data);
    
    // Update key file
    fs.writeFileSync(this.keyFile, newKey, { mode: 0o600 });
    
    return true;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const vault = new SecureVault();

  (async () => {
    try {
      switch (command) {
        case 'init':
          const keyPath = args.includes('--key') 
            ? args[args.indexOf('--key') + 1] 
            : null;
          await vault.init(keyPath);
          console.log('✓ Vault initialized');
          break;

        case 'set':
          let setKey, setValue, setVault = 'default';
          
          if (args[0] === '--vault') {
            setVault = args[1];
            setKey = args[2];
            setValue = args[3];
          } else {
            setKey = args[0];
            setValue = args[1];
          }
          
          if (!setKey || !setValue) {
            console.error('Usage: vault set [--vault <name>] <key> <value>');
            process.exit(1);
          }
          
          await vault.set(setKey, setValue, { vault: setVault });
          console.log(`✓ Secret saved: ${setKey}`);
          break;

        case 'get':
          let getKey = args[0];
          let getVault = null;
          
          if (args[0] === '--vault') {
            getVault = args[1];
            getKey = args[2];
          }
          
          if (!getKey) {
            console.error('Usage: vault get [--vault <name>] <key>');
            process.exit(1);
          }
          
          const value = await vault.get(getKey, { vault: getVault });
          console.log(value);
          break;

        case 'list':
          let listVault = null;
          
          if (args[0] === '--vault') {
            listVault = args[1];
          }
          
          const secrets = await vault.list({ vault: listVault });
          if (secrets.length === 0) {
            console.log('No secrets stored');
          } else {
            secrets.forEach(s => {
              console.log(`  ${s.name} [${s.vault}] (updated: ${s.updatedAt})`);
            });
          }
          break;

        case 'delete':
        case 'remove':
          if (!args[0]) {
            console.error('Usage: vault delete <key>');
            process.exit(1);
          }
          await vault.delete(args[0]);
          console.log(`✓ Secret deleted: ${args[0]}`);
          break;

        case 'export':
          const exportStr = await vault.export();
          console.log(exportStr);
          break;

        case 'lock':
          vault.lock();
          console.log('✓ Vault locked');
          break;

        case 'rotate':
          await vault.rotate();
          console.log('✓ Vault key rotated');
          break;

        default:
          console.log('Secure Vault Commands:');
          console.log('  init [--key <path>]       - Initialize vault with new key');
          console.log('  set [--vault <name>] <key> <value> - Store secret');
          console.log('  get [--vault <name>] <key>         - Get secret');
          console.log('  list [--vault <name>]   - List secrets');
          console.log('  delete <key>            - Delete secret');
          console.log('  export                  - Export as shell variables');
          console.log('  lock                    - Lock vault');
          console.log('  rotate                  - Rotate master key');
      }
    } catch (e) {
      console.error('Error:', e.message);
      process.exit(1);
    }
  })();
}

module.exports = { SecureVault };
