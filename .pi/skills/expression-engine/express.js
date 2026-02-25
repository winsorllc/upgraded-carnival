#!/usr/bin/env node
/**
 * Expression Engine - Visual expression controller
 */

const expressions = {
  happy: {
    emoji: '😊',
    ascii: `
    😊
   /|\\
    | 
   / \\
  HAPPY`,
    color: '\x1b[33m', // yellow
    ledPattern: ' smiles with bright eyes'
  },
  sad: {
    emoji: '😢',
    ascii: `
    😢
   /|\\
    | 
   / \\
   SAD`,
    color: '\x1b[34m', // blue
    ledPattern: 'drooping lights'
  },
  surprised: {
    emoji: '😮',
    ascii: `
    😮
    O
   /|\\
    | 
   / \\
  WOW!`,
    color: '\x1b[35m', // magenta
    ledPattern: 'flashing excitement'
  },
  thinking: {
    emoji: '🤔',
    ascii: `
    🤔
    ?
   /|\\
    | 
   / \\
 HMM...`,
    color: '\x1b[36m', // cyan
    ledPattern: 'slow pulsing'
  },
  excited: {
    emoji: '🎉',
    ascii: `
  \\o/ 🎉 \\o/
    |   |
   / \\ / \\
 YAY!!`,
    color: '\x1b[33m',
    ledPattern: 'rapid rainbow cycle'
  },
  love: {
    emoji: '❤️',
    ascii: `
   ❤️❤️
  ❤️  ❤️
 ❤️    ❤️
  ❤️  ❤️
   ❤️❤️
   LOVE`,
    color: '\x1b[31m', // red
    ledPattern: 'heartbeat pulse'
  },
  angry: {
    emoji: '😠',
    ascii: `
    😠
   >|<
    | 
   / \\
  GRR!`,
    color: '\x1b[31m', // red
    ledPattern: 'warning strobes'
  },
  confused: {
    emoji: '😵‍💫',
    ascii: `
    @.@
    ?
   /|\\
    | 
   / \\
  HUH?`,
    color: '\x1b[37m', // white
    ledPattern: 'spinning confusion'
  },
  working: {
    emoji: '⚙️',
    ascii: `
    ⚙️
   / \\
  |   |
   \\ /
   WORKING`,
    color: '\x1b[32m', // green
    ledPattern: 'spinning gear motion'
  },
  waiting: {
    emoji: '⏳',
    ascii: `
    ⏳
   /|\\
    | 
   / \\
 WAITING`,
    color: '\x1b[33m', // yellow
    ledPattern: 'hourglass fill pattern'
  },
  error: {
    emoji: '❌',
    ascii: `
    ❌
   X X
    X
   / \\
  ERROR!`,
    color: '\x1b[31m', // red
    ledPattern: 'alert flashes'
  },
  success: {
    emoji: '✅',
    ascii: `
    ✅
   /|\\
    ✓
   / \\
 SUCCESS!`,
    color: '\x1b[32m', // green
    ledPattern: 'green checkmark glow'
  }
};

const RESET = '\x1b[0m';

function getExpression(name) {
  return expressions[name.toLowerCase()] || expressions.thinking;
}

function displayExpression(name, options = {}) {
  const expr = getExpression(name);
  const { ascii = false, json = false, color = true, quiet = false } = options;
  
  if (json) {
    return JSON.stringify({
      name: name.toLowerCase(),
      ...expr
    }, null, 2);
  }
  
  if (quiet) {
    return expr.emoji;
  }
  
  const output = ascii ? expr.ascii : expr.emoji;
  
  if (color && options.useColor !== false) {
    return expr.color + output + RESET;
  }
  
  return output;
}

function generateLedPattern(name) {
  const expr = getExpression(name);
  return {
    expression: name,
    description: expr.ledPattern,
    color: expr.color.replace('\x1b[', '').replace('m', ''),
    timestamp: new Date().toISOString()
  };
}

function statusIndicator(state, message) {
  const expr = getExpression(state);
  const timestamp = new Date().toLocaleTimeString();
  return `[${timestamp}] ${expr.color}${expr.emoji}${RESET} ${message || expr.ledPattern}`;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Expression Engine - Visual status and emotion display

Usage:
  express.js <expression> [options]

Expressions:
  ${Object.keys(expressions).join(', ')}

Options:
  --ascii     Show ASCII art version
  --json      Output as JSON
  --no-color  Disable colors
  --quiet     Show emoji only
  --led       Generate LED pattern spec

Examples:
  express.js happy
  express.js working --ascii
  express.js error --json
    `);
    return;
  }
  
  const expression = args[0];
  const options = {
    ascii: args.includes('--ascii'),
    json: args.includes('--json'),
    useColor: !args.includes('--no-color'),
    quiet: args.includes('--quiet'),
    led: args.includes('--led')
  };
  
  if (!expressions[expression.toLowerCase()]) {
    console.error(`Unknown expression: ${expression}`);
    console.error(`Available: ${Object.keys(expressions).join(', ')}`);
    process.exit(1);
  }
  
  if (options.led) {
    console.log(JSON.stringify(generateLedPattern(expression), null, 2));
  } else {
    console.log(displayExpression(expression, options));
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  expressions, 
  displayExpression, 
  generateLedPattern, 
  statusIndicator,
  getExpression 
};
