#!/usr/bin/env node
/**
 * Hash Generator - Generate cryptographic hashes
 */
const crypto = require('crypto');
const fs = require('fs');

function parseArgs(args) {
  const result = {
    text: null,
    file: null,
    algo: 'sha256',
    format: 'hex',
    verify: null
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--text': result.text = args[++i]; break;
      case '--file': result.file = args[++i]; break;
      case '--algo': result.algo = args[++i]; break;
      case '--format': result.format = args[++i]; break;
      case '--verify': result.verify = args[++i]; break;
    }
  }
  return result;
}

function hashString(text, algo) {
  const hash = crypto.createHash(algo);
  hash.update(text, 'utf8');
  return hash.digest('hex');
}

function hashFile(filepath, algo) {
  const data = fs.readFileSync(filepath);
  const hash = crypto.createHash(algo);
  hash.update(data);
  return hash.digest('hex');
}

function toBase64(hexStr) {
  return Buffer.from(hexStr, 'hex').toString('base64');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.text && !args.file) {
    console.log('Usage: hash.js --text "string" | --file ./path --algo md5|sha1|sha256|sha512|all [--format hex|base64]');
    process.exit(1);
  }
  
  const algos = args.algo === 'all' ? ['md5', 'sha1', 'sha256', 'sha512'] : [args.algo];
  const results = {};
  
  algos.forEach(algo => {
    try {
      let hash;
      if (args.file) {
        hash = hashFile(args.file, algo);
      } else {
        hash = hashString(args.text, algo);
      }
      results[algo] = args.format === 'base64' ? toBase64(hash) : hash;
    } catch (e) {
      console.error(`Error hashing with ${algo}:`, e.message);
    }
  });
  
  // Verification mode
  if (args.verify && args.file) {
    const computed = results[args.algo];
    const verified = computed.toLowerCase() === args.verify.toLowerCase();
    console.log(JSON.stringify({
      file: args.file,
      algorithm: args.algo,
      computed: computed,
      expected: args.verify,
      verified: verified,
      message: verified ? '✓ Hash matches' : '✗ Hash does NOT match'
    }, null, 2));
    process.exit(verified ? 0 : 1);
  }
  
  // Normal output
  if (args.algo === 'all') {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(results[args.algo]);
  }
}

main();