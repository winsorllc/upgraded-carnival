#!/usr/bin/env node
/**
 * JWT Decoder - Decode, verify, and validate JSON Web Tokens
 */

const crypto = require('crypto');

function parseArgs(args) {
  const result = {
    token: null,
    secret: null,
    verify: false,
    validate: false,
    pretty: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--token': result.token = args[++i]; break;
      case '--secret': result.secret = args[++i]; break;
      case '--verify': result.verify = true; break;
      case '--validate': result.validate = true; break;
      case '--pretty': result.pretty = true; break;
    }
  }
  return result;
}

function base64UrlDecode(str) {
  // Add padding if needed
  const padding = str.length % 4;
  if (padding) {
    str += '='.repeat(4 - padding);
  }
  // Replace URL-safe characters
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(str, 'base64');
}

function safeJsonParse(buf) {
  try {
    return JSON.parse(buf.toString('utf8'));
  } catch (e) {
    return null;
  }
}

function parseJwt(token) {
  const parts = token.split('.');
  
  if (parts.length !== 3) {
    return {
      valid: false,
      error: 'Invalid JWT format: expected 3 parts separated by dots'
    };
  }
  
  const encodedHeader = parts[0];
  const encodedPayload = parts[1];
  const encodedSignature = parts[2];
  
  const header = safeJsonParse(base64UrlDecode(encodedHeader));
  const payload = safeJsonParse(base64UrlDecode(encodedPayload));
  
  if (!header) {
    return {
      valid: false,
      error: 'Invalid JWT header: could not parse as JSON'
    };
  }
  
  if (!payload) {
    return {
      valid: false,
      error: 'Invalid JWT payload: could not parse as JSON'
    };
  }
  
  // Decode signature as base64 for display
  const signature = base64UrlDecode(encodedSignature).toString('base64');
  
  return {
    valid: true,
    header,
    payload,
    signature: encodedSignature,
    encodedSignature: encodedSignature,
    parts: {
      header: encodedHeader,
      payload: encodedPayload,
      signature: encodedSignature
    }
  };
}

function verifyJwt(token, secret) {
  const parts = token.split('.');
  
  if (parts.length !== 3) {
    return {
      valid: false,
      signature_valid: false,
      error: 'Invalid JWT format'
    };
  }
  
  const encodedHeader = parts[0];
  const encodedPayload = parts[1];
  const encodedSignature = parts[2];
  
  // Get header to determine algorithm
  const header = safeJsonParse(base64UrlDecode(encodedHeader));
  if (!header) {
    return {
      valid: false,
      signature_valid: false,
      error: 'Could not parse header'
    };
  }
  
  const signingInput = encodedHeader + '.' + encodedPayload;
  
  // Map algorithm to Node.js crypto equivalent
  const alg = header.alg || 'HS256';
  const algoMap = {
    'HS256': 'sha256',
    'HS384': 'sha384',
    'HS512': 'sha512'
  };
  
  if (!algoMap[alg]) {
    return {
      valid: false,
      signature_valid: false,
      algorithm: alg,
      error: `Unsupported algorithm: ${alg}. Supported: HS256, HS384, HS512`
    };
  }
  
  // Create signature
  const hmac = crypto.createHmac(algoMap[alg], secret);
  hmac.update(signingInput);
  const expectedSignature = hmac.digest('base64url');
  
  // Compare signatures
  const isValid = expectedSignature === encodedSignature;
  
  return {
    valid: true,
    signature_valid: isValid,
    algorithm: alg,
    error: isValid ? null : 'Signature does not match'
  };
}

function validateJwt(payload) {
  const now = Math.floor(Date.now() / 1000);
  const result = {
    expired: false,
    valid: true,
    message: 'Token is valid'
  };
  
  if (payload.exp) {
    const expiresAt = new Date(payload.exp * 1000);
    result.expires_at = expiresAt.toISOString();
    result.expired = now > payload.exp;
    if (result.expired) {
      result.valid = false;
      result.message = 'Token has expired';
    }
    result.expires_in = payload.exp - now;
  }
  
  if (payload.nbf) {
    const notBefore = new Date(payload.nbf * 1000);
    result.not_before = notBefore.toISOString();
    if (now < payload.nbf) {
      result.valid = false;
      result.message = 'Token not yet valid (nbf)';
    }
  }
  
  if (payload.iat) {
    const issuedAt = new Date(payload.iat * 1000);
    result.issued_at = issuedAt.toISOString();
    result.issued_ago = now - payload.iat;
  }
  
  return result;
}

function formatClaims(payload) {
  const formatted = {};
  
  for (const [key, value] of Object.entries(payload)) {
    if (key === 'iat' || key === 'exp' || key === 'nbf') {
      const date = new Date(value * 1000);
      formatted[key] = {
        timestamp: value,
        iso: date.toISOString(),
        human: date.toLocaleString()
      };
    } else {
      formatted[key] = value;
    }
  }
  
  return formatted;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.token) {
    console.log('JWT Decoder - Decode, verify, and validate JSON Web Tokens');
    console.log('');
    console.log('Usage: jwt.js --token "<jwt-token>" [options]');
    console.log('');
    console.log('Options:');
    console.log('  --token "jwt"       The JWT token to decode');
    console.log('  --secret "secret"   The secret key for verification');
    console.log('  --verify            Verify the signature (requires --secret)');
    console.log('  --validate          Validate claims (exp, nbf, iat)');
    console.log('  --pretty            Pretty print output');
    console.log('');
    console.log('Examples:');
    console.log('  jwt.js --token "eyJhbGci..."');
    console.log('  jwt.js --token "eyJhbGci..." --secret "mysecret" --verify');
    console.log('  jwt.js --token "eyJhbGci..." --validate');
    console.log('  jwt.js --token "eyJhbGci..." --secret "mysecret" --verify --validate --pretty');
    process.exit(1);
  }
  
  // Parse the JWT
  const parsed = parseJwt(args.token);
  
  if (!parsed.valid) {
    const output = { valid: false, error: parsed.error };
    console.log(JSON.stringify(output, null, args.pretty ? 2 : 0));
    process.exit(1);
  }
  
  const result = {
    valid: true,
    header: parsed.header,
    payload: parsed.payload,
    signature: parsed.signature
  };
  
  // Verify signature if requested
  if (args.verify || args.secret) {
    if (!args.secret) {
      console.log(JSON.stringify({
        valid: false,
        error: 'Secret required for signature verification'
      }, null, args.pretty ? 2 : 0));
      process.exit(1);
    }
    result.verification = verifyJwt(args.token, args.secret);
  }
  
  // Validate claims if requested
  if (args.validate) {
    result.validation = validateJwt(parsed.payload);
  }
  
  // Format timestamp claims
  if (result.verification) {
    result.formatted_claims = formatClaims(parsed.payload);
  }
  
  console.log(JSON.stringify(result, null, args.pretty ? 2 : 0));
  process.exit(result.valid ? 0 : 1);
}

main();