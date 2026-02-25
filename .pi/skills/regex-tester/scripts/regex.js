#!/usr/bin/env node
/**
 * Regex Tester - Test and validate regular expressions
 */

function parseArgs(args) {
  const result = {
    pattern: null,
    text: null,
    flags: '',
    groups: false,
    replace: null,
    validate: false,
    explain: false,
    global: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--pattern': result.pattern = args[++i]; break;
      case '--text': result.text = args[++i]; break;
      case '--flags': result.flags = args[++i]; break;
      case '--groups': result.groups = true; break;
      case '--replace': result.replace = args[++i]; break;
      case '--validate': result.validate = true; break;
      case '--explain': result.explain = true; break;
      case '--global': result.global = true; break;
    }
  }
  
  // Add 'g' flag if --global specified
  if (result.global && !result.flags.includes('g')) {
    result.flags += 'g';
  }
  
  return result;
}

function explainPattern(pattern) {
  const parts = [];
  const explanations = {
    '\\d': 'any digit (0-9)',
    '\\w': 'any word character (alphanumeric + underscore)',
    '\\s': 'any whitespace character',
    '\\D': 'any non-digit',
    '\\W': 'any non-word character',
    '\\S': 'any non-whitespace',
    '.': 'any character (except newline)',
    '^': 'start of string/line',
    '$': 'end of string/line',
    '+': 'one or more of preceding',
    '*': 'zero or more of preceding',
    '?': 'zero or one of preceding',
    '{': 'quantifier range opening',
    '}': 'quantifier range closing',
    '[': 'character class opening',
    ']': 'character class closing',
    '(': 'group opening',
    ')': 'group closing',
    '|': 'alternation (OR)',
    '\\b': 'word boundary',
    '\\n': 'newline character',
    '\\t': 'tab character',
    '\\.': 'literal period',
    '\\[': 'literal bracket',
    '\\(': 'literal parenthesis',
    '\\)': 'literal parenthesis',
    '\\*': 'literal asterisk',
    '\\+': 'literal plus',
    '\\?': 'literal question mark',
    '\\^': 'literal caret',
    '\\$': 'literal dollar sign',
    '\\|': 'literal pipe'
  };
  
  let i = 0;
  while (i < pattern.length) {
    if (pattern[i] === '\\' && i + 1 < pattern.length) {
      const escapeSeq = pattern.substring(i, i + 2);
      if (explanations[escapeSeq]) {
        parts.push(`"${escapeSeq}" → ${explanations[escapeSeq]}`);
      } else {
        parts.push(`"${escapeSeq}" → escaped "${pattern[i + 1]}"`);
      }
      i += 2;
    } else if (explanations[pattern[i]]) {
      parts.push(`"${pattern[i]}" → ${explanations[pattern[i]]}`);
      i++;
    } else {
      i++;
    }
  }
  
  return parts;
}

function validateRegex(pattern) {
  try {
    new RegExp(pattern);
    return { valid: true };
  } catch (e) {
    return { 
      valid: false, 
      error: e.message,
      position: e.message.match(/position (\d+)/)?.[1] || 'unknown'
    };
  }
}

function testRegex(pattern, text, flags, extractGroups) {
  const validation = validateRegex(pattern);
  if (!validation.valid) {
    return validation;
  }
  
  try {
    const regex = new RegExp(pattern, flags);
    const results = [];
    let match;
    
    // Handle global flag
    if (flags.includes('g')) {
      while ((match = regex.exec(text)) !== null) {
        const result = {
          match: match[0],
          index: match.index
        };
        if (extractGroups && match.length > 1) {
          result.groups = match.slice(1).map((g, i) => ({
            index: i + 1,
            value: g
          }));
        }
        results.push(result);
        
        // Prevent infinite loop on zero-length match
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
    } else {
      match = regex.exec(text);
      if (match) {
        const result = {
          match: match[0],
          index: match.index
        };
        if (extractGroups && match.length > 1) {
          result.groups = match.slice(1).map((g, i) => ({
            index: i + 1,
            value: g
          }));
        }
        results.push(result);
      }
    }
    
    return {
      valid: true,
      matches: results.length,
      results
    };
  } catch (e) {
    return {
      valid: false,
      error: e.message
    };
  }
}

function replaceWithRegex(pattern, text, replacement, flags) {
  const validation = validateRegex(pattern);
  if (!validation.valid) {
    return validation;
  }
  
  try {
    const regex = new RegExp(pattern, flags);
    const result = text.replace(regex, replacement);
    const count = (text.match(new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')) || []).length;
    
    return {
      valid: true,
      original: text,
      result,
      replacements: count
    };
  } catch (e) {
    return {
      valid: false,
      error: e.message
    };
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.pattern) {
    console.log('Regex Tester - Test and validate regular expressions');
    console.log('');
    console.log('Usage: regex.js --pattern "<regex>" [options]');
    console.log('');
    console.log('Required:');
    console.log('  --pattern "regex"    The regular expression pattern');
    console.log('');
    console.log('Options:');
    console.log('  --text "string"      Text to test against (not required for --validate)');
    console.log('  --flags "gi"         Regex flags (g=global, i=case-insensitive, m=multiline, s=dotall)');
    console.log('  --groups             Extract capture groups');
    console.log('  --replace "text"     Replacement text (with $1, $2 for groups)');
    console.log('  --validate           Validate regex syntax only');
    console.log('  --explain            Explain pattern components');
    console.log('  --global             Enable global matching');
    console.log('');
    console.log('Examples:');
    console.log('  regex.js --pattern "hello" --text "hello world"');
    console.log('  regex.js --pattern "[a-z+" --validate');
    console.log('  regex.js --pattern "(\\d+)-(\\d+)" --text "2024-03" --groups');
    console.log('  regex.js --pattern "world" --text "hello world" --replace "universe"');
    console.log('  regex.js --pattern "\\d+" --explain');
    process.exit(1);
  }
  
  // Validate only
  if (args.validate) {
    const result = validateRegex(args.pattern);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.valid ? 0 : 1);
  }
  
  // Explain mode
  if (args.explain) {
    const explanation = explainPattern(args.pattern);
    console.log(JSON.stringify({
      pattern: args.pattern,
      explanation: explanation
    }, null, 2));
    process.exit(0);
  }
  
  // Replace mode
  if (args.replace !== null) {
    if (!args.text) {
      console.log(JSON.stringify({
        valid: false,
        error: '--text required for replacement'
      }, null, 2));
      process.exit(1);
    }
    const result = replaceWithRegex(args.pattern, args.text, args.replace, args.flags);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.valid ? 0 : 1);
  }
  
  // Test mode
  if (!args.text) {
    console.log(JSON.stringify({
      valid: false,
      error: '--text required for testing (use --validate for syntax checking)'
    }, null, 2));
    process.exit(1);
  }
  
  const result = testRegex(args.pattern, args.text, args.flags, args.groups);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid ? 0 : 1);
}

main();