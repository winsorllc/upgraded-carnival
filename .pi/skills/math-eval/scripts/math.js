#!/usr/bin/env node
/**
 * Math Evaluator - Advanced mathematical expression evaluation
 */

const CONSTANTS = {
  'pi': Math.PI,
  'PI': Math.PI,
  'e': Math.E,
  'E': Math.E,
  'tau': Math.PI * 2,
  'TAU': Math.PI * 2,
  'phi': 1.618033988749895,
  'PHI': 1.618033988749895
};

function factorialize(n) {
  if (n < 0) return null;
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

const FUNCTIONS = {
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  log: Math.log,
  ln: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  exp: Math.exp,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  trunc: Math.trunc,
  sign: Math.sign,
  min: Math.min,
  max: Math.max,
  random: Math.random,
  fact: factorialize,
  factorial: factorialize,
  gcd: gcd,
  lcm: lcm
};

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  const chars = expr.split('');
  
  while (i < chars.length) {
    const c = chars[i];
    
    // Skip whitespace
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    
    // Number or scientific notation
    if (/\d/.test(c) || (c === '.' && /\d/.test(chars[i + 1]))) {
      let num = '';
      while (i < chars.length && (/[\d.]/.test(chars[i]) || chars[i].toLowerCase() === 'e')) {
        if (chars[i].toLowerCase() === 'e' && (chars[i + 1] === '+' || chars[i + 1] === '-' || /\d/.test(chars[i + 1]))) {
          num += chars[i++];
          if (chars[i] === '+' || chars[i] === '-') num += chars[i++];
        }
        num += chars[i++];
      }
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }
    
    // Identifier (function names, constants, variables)
    if (/[a-zA-Z_]/.test(c)) {
      let id = '';
      while (i < chars.length && /[a-zA-Z0-9_]/.test(chars[i])) {
        id += chars[i++];
      }
      
      // Check for 'deg' unit
      if (id.toLowerCase() === 'deg') {
        tokens.push({ type: 'unit', value: 'deg' });
      } else {
        tokens.push({ type: 'identifier', value: id });
      }
      continue;
    }
    
    // Operators
    if (c === '+' || c === '-' || c === '*' || c === '/' || c === '^' || c === '%' || c === '(' || c === ')') {
      tokens.push({ type: 'operator', value: c });
      i++;
      continue;
    }
    
    // Comparison
    if (c === '=' || c === '!' || c === '<' || c === '>') {
      if (chars[i + 1] === '=') {
        tokens.push({ type: 'operator', value: c + chars[i + 1] });
        i += 2;
      } else {
        tokens.push({ type: 'operator', value: c });
        i++;
      }
      continue;
    }
    
    i++;
  }
  
  return tokens;
}

function toRPN(tokens, variables = {}) {
  const output = [];
  const ops = [];
  
  const precedence = {
    '+': 1, '-': 1,
    '*': 2, '/': 2, '%': 2, '//': 2,
    '^': 3, '**': 3
  };
  
  const rightAssociative = new Set(['^', '**']);
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === 'number') {
      output.push(token);
    } else if (token.type === 'identifier') {
      const id = token.value;
      if (FUNCTIONS[id]) {
        // Function - check for opening paren
        if (tokens[i + 1]?.value === '(') {
          ops.push({ ...token, type: 'function' });
        } else if (CONSTANTS[id]) {
          output.push({ type: 'number', value: CONSTANTS[id] });
        } else if (variables[id] !== undefined) {
          output.push({ type: 'number', value: parseFloat(variables[id]) });
        } else {
          throw new Error(`Unknown identifier: ${id}`);
        }
      } else if (CONSTANTS[id]) {
        output.push({ type: 'number', value: CONSTANTS[id] });
      } else if (variables[id] !== undefined) {
        output.push({ type: 'number', value: parseFloat(variables[id]) });
      } else {
        throw new Error(`Unknown variable: ${id}`);
      }
    } else if (token.type === 'unit' && token.value === 'deg') {
      // Convert previous result from degrees to radians
      output.push({ type: 'operator', value: '*' });
      output.push({ type: 'number', value: Math.PI / 180 });
    } else if (token.type === 'operator') {
      if (token.value === '(') {
        ops.push(token);
      } else if (token.value === ')') {
        while (ops.length > 0 && ops[ops.length - 1].value !== '(') {
          output.push(ops.pop());
        }
        if (ops.length === 0) throw new Error('Mismatched parentheses');
        ops.pop(); // Remove '('
        
        // Check if function call
        if (ops.length > 0 && ops[ops.length - 1].type === 'function') {
          output.push(ops.pop());
        }
      } else {
        const op2 = token.value;
        while (ops.length > 0 && ops[ops.length - 1].type === 'operator' &&
               ops[ops.length - 1].value !== '(' &&
               (precedence[ops[ops.length - 1].value] > precedence[op2] ||
                (precedence[ops[ops.length - 1].value] === precedence[op2] && !rightAssociative.has(op2)))) {
          output.push(ops.pop());
        }
        ops.push(token);
      }
    }
  }
  
  while (ops.length > 0) {
    const op = ops.pop();
    if (op.value === '(') throw new Error('Mismatched parentheses');
    output.push(op);
  }
  
  return output;
}

function evaluateRPN(rpn) {
  const stack = [];
  
  for (const token of rpn) {
    if (token.type === 'number') {
      stack.push(token.value);
    } else if (token.type === 'operator') {
      if (token.value === '**') token.value = '^';
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new Error('Invalid expression');
      
      switch (token.value) {
        case '+': stack.push(a + b); break;
        case '-': stack.push(a - b); break;
        case '*': stack.push(a * b); break;
        case '/': 
          if (b === 0) throw new Error('Division by zero');
          stack.push(a / b); 
          break;
        case '^':
        case '**': stack.push(Math.pow(a, b)); break;
        case '%': stack.push(a % b); break;
        case '//': stack.push(Math.floor(a / b)); break;
        default: throw new Error(`Unknown operator: ${token.value}`);
      }
    } else if (token.type === 'function') {
      const fn = FUNCTIONS[token.value];
      // Count function arguments based on what's on stack
      // Simplification: assume functions take 1 or 2 args
      if (fn.length === 1) {
        const a = stack.pop();
        if (a === undefined) throw new Error(`Function ${token.value} requires argument`);
        stack.push(fn(a));
      } else if (fn.length === 2) {
        const b = stack.pop();
        const a = stack.pop();
        if (a === undefined || b === undefined) throw new Error(`Function ${token.value} requires 2 arguments`);
        stack.push(fn(a, b));
      } else {
        // Variable args (like min/max) - take last item as array count
        const args = stack.pop();
        if (Array.isArray(args)) {
          stack.push(fn(...args));
        } else {
          stack.push(fn(args));
        }
      }
    }
  }
  
  if (stack.length !== 1) throw new Error('Invalid expression');
  return stack[0];
}

function evaluateExpression(expr, variables = {}) {
  const tokens = tokenize(expr);
  const rpn = toRPN(tokens, variables);
  return evaluateRPN(rpn);
}

function calculateStatistics(data) {
  if (data.length === 0) return null;
  
  const n = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  
  const sorted = [...data].sort((a, b) => a - b);
  const median = n % 2 === 0 
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;
  
  return {
    count: n,
    sum: sum,
    mean: mean,
    median: median,
    min: min,
    max: max,
    range: range,
    variance: variance,
    stdDev: stdDev
  };
}

function convertUnit(value, from, to) {
  from = from.toLowerCase();
  to = to.toLowerCase();
  
  // Map common names to abbreviations
  const tempMap = {
    'c': 'c', 'celsius': 'c',
    'f': 'f', 'fahrenheit': 'f',
    'k': 'k', 'kelvin': 'k',
    'mm': 'mm', 'millimeter': 'mm', 'millimeters': 'mm',
    'cm': 'cm', 'centimeter': 'cm', 'centimeters': 'cm',
    'm': 'm', 'meter': 'm', 'meters': 'm',
    'km': 'km', 'kilometer': 'km', 'kilometers': 'km',
    'in': 'in', 'inch': 'in', 'inches': 'in',
    'ft': 'ft', 'foot': 'ft', 'feet': 'ft',
    'mi': 'mi', 'mile': 'mi', 'miles': 'mi',
    'g': 'g', 'gram': 'g', 'grams': 'g',
    'kg': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
    'mg': 'mg', 'milligram': 'mg', 'milligrams': 'mg',
    'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
    'lb': 'lb', 'pound': 'lb', 'pounds': 'lb'
  };
  
  from = tempMap[from] || from;
  to = tempMap[to] || to;
  
  // Temperature conversions
  const tempConversions = {
    'c': { 'f': v => v * 9/5 + 32, 'k': v => v + 273.15 },
    'f': { 'c': v => (v - 32) * 5/9, 'k': v => (v - 32) * 5/9 + 273.15 },
    'k': { 'c': v => v - 273.15, 'f': v => (v - 273.15) * 9/5 + 32 }
  };
  
  if (tempConversions[from] && tempConversions[from][to]) {
    return tempConversions[from][to](value);
  }
  
  // Length conversions (to meters)
  const lengthToMeters = {
    'mm': 0.001, 'cm': 0.01, 'm': 1, 'km': 1000,
    'in': 0.0254, 'ft': 0.3048, 'yd': 0.9144, 'mi': 1609.344
  };
  
  if (lengthToMeters[from] && lengthToMeters[to]) {
    return value * lengthToMeters[from] / lengthToMeters[to];
  }
  
  // Weight conversions (to grams)
  const weightToGrams = {
    'mg': 0.001, 'g': 1, 'kg': 1000,
    'oz': 28.3495, 'lb': 453.592
  };
  
  if (weightToGrams[from] && weightToGrams[to]) {
    return value * weightToGrams[from] / weightToGrams[to];
  }
  
  throw new Error(`Conversion from ${from} to ${to} not supported`);
}

function baseConvert(value, fromBase, toBase) {
  // Convert to decimal first
  const decimal = parseInt(String(value), fromBase);
  if (isNaN(decimal)) throw new Error(`Invalid number in base ${fromBase}`);
  
  // Convert from decimal to target base
  if (toBase === 10) return decimal;
  return decimal.toString(toBase).toUpperCase();
}

function parseArgs(args) {
  const result = {
    command: 'calc',
    expression: null,
    variables: {}
  };
  
  if (args.length === 0) return result;
  
  const commands = ['calc', 'stats', 'mean', 'median', 'convert', 'base'];
  
  if (commands.includes(args[0])) {
    result.command = args[0];
    result.expression = args.slice(1).join(' ');
  } else {
    result.expression = args.join(' ');
  }
  
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.expression && args.command === 'calc') {
    console.log('Math Evaluator - Advanced mathematical expression evaluation');
    console.log('');
    console.log('Usage: math.js [command] <expression> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  <expression>           Evaluate expression (default)');
    console.log('  stats <data>          Calculate statistics (comma-separated)');
    console.log('  mean <data>           Calculate mean');
    console.log('  median <data>          Calculate median');
    console.log('  convert <val> <from> <to>  Unit conversion');
    console.log('  base <from> to <to> <value> Base conversion');
    console.log('');
    console.log('Examples:');
    console.log('  math.js "2 + 2"');
    console.log('  math.js "sqrt(16)"');
    console.log('  math.js "sin(pi/2)"');
    console.log('  math.js stats "1,2,3,4,5"');
    console.log('  math.js convert 100 celsius fahrenheit');
    process.exit(1);
  }
  
  try {
    let result;
    
    switch (args.command) {
      case 'calc':
        result = evaluateExpression(args.expression, args.variables);
        break;
        
      case 'stats':
        const data = args.expression.split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x));
        result = calculateStatistics(data);
        break;
        
      case 'mean':
        const meanData = args.expression.split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x));
        result = { mean: meanData.reduce((a, b) => a + b, 0) / meanData.length };
        break;
        
      case 'median':
        const medianData = args.expression.split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x));
        const sorted = medianData.sort((a, b) => a - b);
        result = { median: sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)] };
        break;
        
      case 'convert':
        const parts = args.expression.split(' ');
        if (parts.length !== 3) throw new Error('Usage: convert <value> <from> <to>');
        result = { value: convertUnit(parseFloat(parts[0]), parts[1], parts[2]) };
        break;
        
      case 'base':
        const baseMatch = args.expression.match(/(\d+)\s+to\s+(\d+)\s+(.+)/);
        if (!baseMatch) throw new Error('Usage: base <from> to <to> <value>');
        result = { value: baseConvert(baseMatch[3], parseInt(baseMatch[1]), parseInt(baseMatch[2])) };
        break;
        
      default:
        throw new Error(`Unknown command: ${args.command}`);
    }
    
    console.log(JSON.stringify({ success: true, result }, null, 2));
    
  } catch (e) {
    console.log(JSON.stringify({ success: false, error: e.message }, null, 2));
    process.exit(1);
  }
}

main();