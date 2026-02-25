#!/usr/bin/env node
/**
 * Password Generator Skill - Generate secure passwords and tokens
 */

const crypto = require('crypto');

// Character sets
const CHAR_SETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  similar: '1lI0O',
  ambiguous: '{}()/\\\'"`~,;:.<>',
  hex: '0123456789abcdef',
  base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  alphanum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
};

// EFF word list (simplified - top 1000 words)
const WORD_LIST = [
  'account', 'act', 'addition', 'adjustment', 'advertisement', 'afterthought', 'agreement',
  'air', 'amount', 'amusement', 'animal', 'apparatus', 'approval', 'argument', 'art',
  'attack', 'attempt', 'attention', 'attraction', 'authority', 'back', 'balance', 'base',
  'behavior', 'belief', 'birth', 'bit', 'bite', 'blood', 'blow', 'board', 'boat', 'body',
  'brain', 'brass', 'bread', 'breath', 'brick', 'bridge', 'brother', 'brush', 'bucket',
  'building', 'burst', 'business', 'butter', 'canvas', 'care', 'cause', 'chalk', 'chance',
  'change', 'cloth', 'coal', 'color', 'comfort', 'committee', 'company', 'comparison',
  'competition', 'condition', 'connection', 'cook', 'copper', 'copy', 'cork', 'cotton',
  'cough', 'country', 'cover', 'crack', 'credit', 'crime', 'crush', 'current', 'curve',
  'damage', 'danger', 'daughter', 'day', 'death', 'debt', 'decision', 'degree', 'design',
  'desire', 'destruction', 'detail', 'development', 'digestion', 'direction', 'discovery',
  'discussion', 'disease', 'disgust', 'distance', 'distribution', 'division', 'doubt',
  'drain', 'draw', 'dress', 'drink', 'driving', 'dust', 'earth', 'edge', 'education',
  'effect', 'end', 'error', 'event', 'example', 'exchange', 'existence', 'expansion',
  'experience', 'expert', 'eye', 'face', 'fact', 'fall', 'family', 'father', 'fear',
  'feeling', 'fiction', 'field', 'fight', 'fire', 'flame', 'flight', 'flower', 'fold',
  'force', 'form', 'friend', 'front', 'fruit', 'future', 'garden', 'gate', 'girl',
  'glass', 'gold', 'government', 'grain', 'grass', 'grip', 'group', 'growth', 'guide',
  'harbor', 'harmony', 'hate', 'head', 'hearing', 'heart', 'heat', 'help', 'history',
  'hole', 'hope', 'hour', 'humor', 'ice', 'idea', 'impulse', 'increase', 'industry',
  'insect', 'instrument', 'insurance', 'interest', 'invention', 'iron', 'jelly', 'join',
  'journey', 'judge', 'jump', 'kick', 'kiss', 'knowledge', 'land', 'language', 'laugh',
  'law', 'lead', 'learning', 'leather', 'letter', 'level', 'library', 'lift', 'light',
  'limit', 'linen', 'liquid', 'list', 'look', 'loss', 'love', 'machine', 'man', 'manager',
  'mark', 'market', 'mass', 'match', 'material', 'measure', 'meat', 'meeting', 'memory',
  'metal', 'middle', 'milk', 'mind', 'mine', 'minute', 'mist', 'money', 'month',
  'morning', 'mother', 'motion', 'mountain', 'move', 'music', 'name', 'nation', 'need',
  'news', 'night', 'noise', 'note', 'number', 'observation', 'offer', 'oil', 'operation',
  'opinion', 'order', 'organization', 'owner', 'page', 'pain', 'paint', 'paper', 'part',
  'pass', 'past', 'path', 'peace', 'person', 'place', 'plant', 'play', 'pleasure',
  'point', 'poison', 'polish', 'porter', 'position', 'powder', 'power', 'price', 'print',
  'process', 'produce', 'profit', 'property', 'prose', 'protest', 'pull', 'punishment',
  'purpose', 'push', 'quality', 'question', 'rain', 'range', 'rate', 'ray', 'reaction',
  'reading', 'reason', 'record', 'regret', 'relation', 'religion', 'request', 'respect',
  'rest', 'reward', 'rhythm', 'rice', 'ring', 'river', 'road', 'roll', 'room', 'rule',
  'run', 'salt', 'sand', 'scale', 'science', 'sea', 'seat', 'secret', 'secretary',
  'selection', 'sense', 'servant', 'shade', 'shake', 'shame', 'shape', 'share', 'sheep',
  'shelf', 'ship', 'shirt', 'shock', 'side', 'sign', 'silk', 'silver', 'sister',
  'size', 'skin', 'skirt', 'sky', 'sleep', 'slip', 'slope', 'smash', 'smell', 'smile',
  'smoke', 'snail', 'snake', 'snow', 'soap', 'society', 'sock', 'soda', 'soil', 'son',
  'song', 'sort', 'sound', 'soup', 'space', 'spade', 'spark', 'spider', 'sponge',
  'spoon', 'spot', 'spring', 'spy', 'square', 'stage', 'stamp', 'star', 'start',
  'statement', 'station', 'steam', 'steel', 'stem', 'step', 'stew', 'stick', 'stone',
  'stop', 'store', 'storm', 'story', 'stove', 'street', 'stretch', 'string', 'sugar',
  'suggestion', 'summer', 'support', 'surprise', 'sweat', 'sweet', 'swim', 'system',
  'table', 'taste', 'tax', 'teacher', 'team', 'teeth', 'tendency', 'test', 'theory',
  'thing', 'thought', 'thread', 'throat', 'thumb', 'thunder', 'ticket', 'tiger', 'time',
  'tin', 'toe', 'touch', 'town', 'toy', 'trade', 'train', 'tray', 'tree', 'trick',
  'trip', 'trouble', 'truck', 'tub', 'turn', 'twig', 'twist', 'umbrella', 'uncle',
  'unit', 'use', 'value', 'verse', 'vessel', 'view', 'voice', 'walk', 'war', 'wash',
  'waste', 'watch', 'water', 'wave', 'wax', 'way', 'wealth', 'weather', 'week',
  'weight', 'west', 'wheel', 'whip', 'whistle', 'wind', 'window', 'wine', 'wing',
  'winter', 'wire', 'wish', 'woman', 'wood', 'wool', 'word', 'work', 'worm', 'wound',
  'writing', 'year', 'yellow', 'yesterday', 'young', 'youth', 'zebra', 'zone'
];

function getRandomBytes(length) {
  return crypto.randomBytes(length);
}

function generatePassword(length = 16, options = {}) {
  const { 
    upper = true, 
    lower = true, 
    numbers = true, 
    symbols = true,
    avoidSimilar = false,
    avoidAmbiguous = false,
    minUpper = 1,
    minLower = 1,
    minNumbers = 1,
    minSymbols = 0
  } = options;
  
  let chars = '';
  if (upper) chars += CHAR_SETS.upper;
  if (lower) chars += CHAR_SETS.lower;
  if (numbers) chars += CHAR_SETS.numbers;
  if (symbols) chars += CHAR_SETS.symbols;
  
  // Remove unwanted characters
  if (avoidSimilar) {
    chars = chars.split('').filter(c => !CHAR_SETS.similar.includes(c)).join('');
  }
  if (avoidAmbiguous) {
    chars = chars.split('').filter(c => !CHAR_SETS.ambiguous.includes(c)).join('');
  }
  
  if (!chars) {
    throw new Error('No character set selected');
  }
  
  // Generate password
  const bytes = getRandomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  
  // Ensure minimum requirements
  if (minUpper > 0 && !new RegExp(`[${CHAR_SETS.upper}]{${minUpper}}`).test(password)) {
    return generatePassword(length, options);
  }
  if (minLower > 0 && !new RegExp(`[${CHAR_SETS.lower}]{${minLower}}`).test(password)) {
    return generatePassword(length, options);
  }
  if (minNumbers > 0 && !new RegExp(`[${CHAR_SETS.numbers}]{${minNumbers}}`).test(password)) {
    return generatePassword(length, options);
  }
  if (minSymbols > 0 && !new RegExp(`[${CHAR_SETS.symbols.replace(/[\]/]/g, '\\$&')}]{${minSymbols}}`).test(password)) {
    return generatePassword(length, options);
  }
  
  return password;
}

function generatePassphrase(wordCount = 4, separator = '-') {
  const bytes = getRandomBytes(wordCount * 4);
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    const index = bytes.readUInt32LE(i * 4) % WORD_LIST.length;
    words.push(WORD_LIST[index]);
  }
  return words.join(separator);
}

function generateToken(length = 32, format = 'hex') {
  const bytes = getRandomBytes(Math.ceil(length / 2));
  
  switch (format) {
    case 'hex':
      return bytes.toString('hex').slice(0, length);
    case 'base64':
      return bytes.toString('base64').replace(/=/g, '').slice(0, length);
    case 'alphanum':
      return Array.from(bytes)
        .map(b => CHAR_SETS.alphanum[b % CHAR_SETS.alphanum.length])
        .join('')
        .slice(0, length);
    default:
      throw new Error(`Unknown token format: ${format}`);
  }
}

function checkStrength(password) {
  const length = password.length;
  let hasUpper = /[A-Z]/.test(password);
  let hasLower = /[a-z]/.test(password);
  let hasNumbers = /[0-9]/.test(password);
  let hasSymbols = /[^A-Za-z0-9]/.test(password);
  
  // Calculate pool size
  let poolSize = 0;
  if (hasUpper) poolSize += 26;
  if (hasLower) poolSize += 26;
  if (hasNumbers) poolSize += 10;
  if (hasSymbols) poolSize += 32;
  
  // Calculate entropy
  const entropy = length * Math.log2(poolSize || 1);
  
  // Calculate cracking time (assuming 10^9 guesses/sec)
  const combinations = Math.pow(poolSize, length);
  const guesses = combinations / 2; // Average
  const seconds = guesses / 1e9;
  
  let crackingTime;
  if (seconds < 1) crackingTime = 'Instant';
  else if (seconds < 60) crackingTime = `${Math.round(seconds)} seconds`;
  else if (seconds < 3600) crackingTime = `${Math.round(seconds / 60)} minutes`;
  else if (seconds < 86400) crackingTime = `${Math.round(seconds / 3600)} hours`;
  else if (seconds < 31536000) crackingTime = `${Math.round(seconds / 86400)} days`;
  else if (seconds < 31536000 * 100) crackingTime = `${Math.round(seconds / 31536000)} years`;
  else crackingTime = 'Centuries';
  
  // Score 0-4
  let score = 0;
  if (length >= 8) score++;
  if (length >= 12) score++;
  if (hasUpper && hasLower) score++;
  if ((hasNumbers || hasSymbols) && length >= 10) score++;
  
  const recommendations = [];
  if (length < 12) recommendations.push('Use at least 12 characters');
  if (!hasUpper) recommendations.push('Add uppercase letters');
  if (!hasLower) recommendations.push('Add lowercase letters');
  if (!hasNumbers) recommendations.push('Add numbers');
  if (!hasSymbols) recommendations.push('Add special characters');
  
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  
  return {
    strength: labels[score],
    score,
    entropy: parseFloat(entropy.toFixed(2)),
    crackingTime,
    recommendations,
    analysis: {
      length,
      hasUpper,
      hasLower,
      hasNumbers,
      hasSymbols,
      poolSize
    }
  };
}

// CLI
const [,, command, ...args] = process.argv;

function main() {
  if (!command || command === '--help' || command === '-h') {
    console.log(`Usage: passgen.js <command> [options]

Commands:
  password     Generate random password
  passphrase   Generate passphrase (XKCD style)
  token        Generate API token
  check        Check password strength

Options for password:
  --length       Password length (default: 16)
  --upper        Include uppercase letters
  --lower        Include lowercase letters
  --numbers      Include numbers
  --symbols      Include symbols
  --avoid-sim    Avoid similar characters (1lI0O)
  --avoid-ambig  Avoid ambiguous characters
  --count        Generate multiple passwords

Options for passphrase:
  --words        Number of words (default: 4)
  --separator    Word separator (default: -)

Options for token:
  --length       Token length (default: 32)
  --format       hex, base64, or alphanum (default: hex)

Examples:
  passgen.js password --length 20 --symbols
  passgen.js passphrase --words 5 --separator ' '
  passgen.js token --length 64 --format base64
  passgen.js check "MyPassword123!"`);
    return 0;
  }
  
  const result = { operation: command };
  
  switch (command) {
    case 'password': {
      const lengthIndex = args.indexOf('--length');
      const length = lengthIndex >= 0 ? parseInt(args[lengthIndex + 1]) || 16 : 16;
      const countIndex = args.indexOf('--count');
      const count = countIndex >= 0 ? parseInt(args[countIndex + 1]) || 1 : 1;
      
      const options = {
        upper: args.includes('--upper'),
        lower: args.includes('--lower'),
        numbers: args.includes('--numbers'),
        symbols: args.includes('--symbols'),
        avoidSimilar: args.includes('--avoid-sim'),
        avoidAmbiguous: args.includes('--avoid-ambig')
      };
      
      // If no options specified, use all
      if (!options.upper && !options.lower && !options.numbers && !options.symbols) {
        options.upper = options.lower = options.numbers = options.symbols = true;
      }
      
      if (count === 1) {
        const password = generatePassword(length, options);
        result.password = password;
        result.strength = checkStrength(password);
      } else {
        result.passwords = [];
        for (let i = 0; i < count; i++) {
          const password = generatePassword(length, options);
          result.passwords.push({ password, strength: checkStrength(password) });
        }
      }
      break;
    }
    
    case 'passphrase': {
      const wordsIndex = args.indexOf('--words');
      const words = wordsIndex >= 0 ? parseInt(args[wordsIndex + 1]) || 4 : 4;
      const sepIndex = args.indexOf('--separator');
      const separator = sepIndex >= 0 ? args[sepIndex + 1] : '-';
      
      result.passphrase = generatePassphrase(words, separator);
      result.strength = checkStrength(result.passphrase);
      break;
    }
    
    case 'token': {
      const lengthIndex = args.indexOf('--length');
      const length = lengthIndex >= 0 ? parseInt(args[lengthIndex + 1]) || 32 : 32;
      const formatIndex = args.indexOf('--format');
      const format = formatIndex >= 0 ? args[formatIndex + 1] : 'hex';
      
      result.token = generateToken(length, format);
      result.format = format;
      break;
    }
    
    case 'check': {
      const password = args[0];
      if (!password) {
        console.error('Usage: passgen.js check "password"');
        return 1;
      }
      
      Object.assign(result, checkStrength(password));
      break;
    }
    
    default:
      console.error(`Unknown command: ${command}`);
      return 1;
  }
  
  console.log(JSON.stringify(result, null, 2));
  return 0;
}

try {
  const exitCode = main();
  process.exit(exitCode);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
