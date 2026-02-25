#!/usr/bin/env node
/**
 * File Encryptor - AES-256-GCM file encryption/decryption
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
}

function encrypt(inputPath, outputPath, password) {
  const data = fs.readFileSync(inputPath);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Write: salt + iv + authTag + encrypted
  const output = Buffer.concat([salt, iv, authTag, encrypted]);
  fs.writeFileSync(outputPath, output);
  
  return {
    input: inputPath,
    output: outputPath,
    size_before: data.length,
    size_after: output.length
  };
}

function decrypt(inputPath, outputPath, password) {
  const data = fs.readFileSync(inputPath);
  
  // Extract components
  if (data.length < SALT_LENGTH + IV_LENGTH + 16) {
    throw new Error('File too small or corrupted');
  }
  
  let offset = 0;
  const salt = data.slice(offset, offset + SALT_LENGTH);
  offset += SALT_LENGTH;
  const iv = data.slice(offset, offset + IV_LENGTH);
  offset += IV_LENGTH;
  const authTag = data.slice(offset, offset + 16);
  offset += 16;
  const encrypted = data.slice(offset);
  
  const key = deriveKey(password, salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  try {
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    fs.writeFileSync(outputPath, decrypted);
    
    return {
      input: inputPath,
      output: outputPath,
      size_before: data.length,
      size_after: decrypted.length
    };
  } catch (e) {
    throw new Error('Decryption failed: incorrect password or corrupted file');
  }
}

function parseArgs(args) {
  const result = {
    decrypt: false,
    input: null,
    output: null,
    password: null,
    deleteOriginal: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '-d':
      case '--decrypt':
        result.decrypt = true;
        break;
      case '-i':
      case '--input':
        result.input = args[++i];
        break;
      case '-o':
      case '--output':
        result.output = args[++i];
        break;
      case '-p':
      case '--password':
        result.password = args[++i];
        break;
      case '--delete-original':
        result.deleteOriginal = true;
        break;
    }
  }
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.input) {
    console.log('File Encryptor - AES-256-GCM encryption/decryption');
    console.log('');
    console.log('Usage: encrypt.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  -i, --input <file>      Input file to encrypt/decrypt');
    console.log('  -o, --output <file>     Output file (default: input + .enc or without .enc)');
    console.log('  -p, --password <pass>    Password for encryption/decryption');
    console.log('  -d, --decrypt           Decrypt mode');
    console.log('  --delete-original       Delete original file after successful operation');
    console.log('');
    console.log('Examples:');
    console.log('  encrypt.js -i secret.txt -p "mypassword"');
    console.log('  encrypt.js -d -i secret.txt.enc -p "mypassword"');
    process.exit(1);
  }
  
  if (!args.password) {
    console.log(JSON.stringify({
      success: false,
      error: 'Password required (--password)'
    }, null, 2));
    process.exit(1);
  }
  
  if (!fs.existsSync(args.input)) {
    console.log(JSON.stringify({
      success: false,
      error: `Input file not found: ${args.input}`
    }, null, 2));
    process.exit(1);
  }
  
  try {
    let result;
    const outputPath = args.output || (args.decrypt 
      ? args.input.replace(/\.enc$/, '') || args.input + '.decrypted'
      : args.input + '.enc');
    
    if (args.decrypt) {
      result = decrypt(args.input, outputPath, args.password);
      result.operation = 'decrypt';
    } else {
      result = encrypt(args.input, outputPath, args.password);
      result.operation = 'encrypt';
    }
    
    result.success = true;
    console.log(JSON.stringify(result, null, 2));
    
    if (args.deleteOriginal) {
      fs.unlinkSync(args.input);
    }
    
    process.exit(0);
    
  } catch (e) {
    console.log(JSON.stringify({
      success: false,
      error: e.message
    }, null, 2));
    process.exit(1);
  }
}

main();