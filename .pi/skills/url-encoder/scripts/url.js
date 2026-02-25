#!/usr/bin/env node
/**
 * URL Encoder - Encode/decode URL components
 */

function showHelp() {
  console.log(`Usage: url.js <command> [options]
Commands:
  encode <string>       Encode a string for URL
  decode <string>       Decode a URL-encoded string
  parse <url>          Parse URL into components
  query ...           Build query string from key=value pairs
Options:
  --pretty            Pretty print JSON output
  --component         Use encodeURIComponent (default) or encodeURI`);
}

function parseArgs(args) {
  const cmd = args[0];
  const result = {
    command: cmd,
    value: null,
    params: {},
    pretty: args.includes('--pretty'),
    component: args.includes('--component') || !args.includes('--uri')
  };
  
  if (!cmd) return result;
  
  if (cmd === 'query') {
    for (let i = 1; i < args.length; i++) {
      if (args[i].startsWith('--') && !args[i].startsWith('---')) {
        const key = args[i].slice(2);
        const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
        result.params[key] = val;
      }
    }
  } else if (['encode', 'decode', 'parse'].includes(cmd)) {
    result.value = args[1];
  }
  
  return result;
}

function encodeUrl(str, componentMode) {
  if (componentMode) {
    return encodeURIComponent(str);
  }
  return encodeURI(str);
}

function decodeUrl(str, componentMode) {
  try {
    if (componentMode) {
      return decodeURIComponent(str);
    }
    return decodeURI(str);
  } catch (e) {
    return `Error: Invalid encoding - ${e.message}`;
  }
}

function parseUrl(url) {
  try {
    const parsed = new URL(url);
    const query = {};
    parsed.searchParams.forEach((v, k) => {
      query[k] = v;
    });
    
    return {
      href: parsed.href,
      protocol: parsed.protocol,
      host: parsed.host,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      username: parsed.username,
      password: parsed.password,
      query: query
    };
  } catch (e) {
    return { error: e.message };
  }
}

function buildQuery(params) {
  const pairs = Object.entries(params).map(([k, v]) => {
    return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
  });
  return pairs.length > 0 ? '?' + pairs.join('&') : '';
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.command || args.command === 'help') {
    showHelp();
    return;
  }
  
  switch (args.command) {
    case 'encode': {
      if (!args.value) {
        console.error('Error: No string provided for encoding');
        process.exit(1);
      }
      console.log(encodeUrl(args.value, args.component));
      break;
    }
    
    case 'decode': {
      if (!args.value) {
        console.error('Error: No string provided for decoding');
        process.exit(1);
      }
      console.log(decodeUrl(args.value, args.component));
      break;
    }
    
    case 'parse': {
      if (!args.value) {
        console.error('Error: No URL provided to parse');
        process.exit(1);
      }
      const result = parseUrl(args.value);
      if (args.pretty) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(JSON.stringify(result));
      }
      break;
    }
    
    case 'query': {
      const qs = buildQuery(args.params);
      console.log(qs);
      break;
    }
    
    default: {
      console.error(`Unknown command: ${args.command}`);
      showHelp();
      process.exit(1);
    }
  }
}

main();