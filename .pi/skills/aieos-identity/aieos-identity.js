#!/usr/bin/env node

/**
 * AIEOS Identity Skill
 * Load and manage AIEOS JSON identity files
 */

const fs = require('fs');
const path = require('path');

// AIEOS schema validation
const requiredSections = ['identity', 'psychology', 'linguistics', 'motivations'];
const optionalSections = ['capabilities', 'physicality', 'history', 'interests'];
const allSections = [...requiredSections, ...optionalSections];

// Load AIEOS identity file
function loadIdentity(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const identity = JSON.parse(content);
  return identity;
}

// Validate AIEOS identity
function validateIdentity(identity, verbose = false) {
  const errors = [];
  const warnings = [];

  // Check required sections
  for (const section of requiredSections) {
    if (!identity[section]) {
      errors.push(`Missing required section: ${section}`);
    }
  }

  // Validate identity section
  if (identity.identity) {
    if (!identity.identity.names?.first) {
      warnings.push('Identity should have a first name');
    }
  }

  // Validate psychology section
  if (identity.psychology) {
    if (identity.psychology.traits?.mbti) {
      const validMBTI = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 
                        'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'];
      if (!validMBTI.includes(identity.psychology.traits.mbti)) {
        warnings.push(`Invalid MBTI type: ${identity.psychology.traits.mbti}`);
      }
    }
    if (identity.psychology.neural_matrix) {
      for (const [key, value] of Object.entries(identity.psychology.neural_matrix)) {
        if (typeof value !== 'number' || value < 0 || value > 1) {
          errors.push(`Neural matrix '${key}' should be a number between 0 and 1`);
        }
      }
    }
  }

  // Validate linguistics section
  if (identity.linguistics?.text_style?.formality_level !== undefined) {
    const level = identity.linguistics.text_style.formality_level;
    if (typeof level !== 'number' || level < 0 || level > 1) {
      errors.push('formality_level should be a number between 0 and 1');
    }
  }

  if (verbose) {
    return { errors, warnings, valid: errors.length === 0 };
  }
  return errors.length === 0;
}

// Generate system prompt from AIEOS identity
function generatePrompt(identity) {
  const sections = [];

  // Identity
  if (identity.identity) {
    const names = identity.identity.names || {};
    const firstName = names.first || 'AI Assistant';
    const nickname = names.nickname || firstName;
    const bio = identity.identity.bio || {};
    
    sections.push(`# Identity\n\nYou are **${firstName}**${nickname !== firstName ? ` (${nickname})` : ''}.`);
    
    if (bio.gender) sections.push(`Gender: ${bio.gender}`);
    if (bio.age_biological) sections.push(`Age: ${bio.age_biological}`);
    if (identity.identity.origin?.nationality) {
      sections.push(`Nationality: ${identity.identity.origin.nationality}`);
    }
  }

  // Psychology
  if (identity.psychology) {
    sections.push('\n# Personality\n');
    
    if (identity.psychology.traits?.mbti) {
      sections.push(`MBTI: ${identity.psychology.traits.mbti}`);
    }
    
    if (identity.psychology.neural_matrix) {
      sections.push('\nCognitive profile:');
      for (const [trait, value] of Object.entries(identity.psychology.neural_matrix)) {
        const pct = Math.round(value * 100);
        sections.push(`- ${trait}: ${pct}%`);
      }
    }
    
    if (identity.psychology.moral_compass?.alignment) {
      sections.push(`\nAlignment: ${identity.psychology.moral_compass.alignment}`);
    }
    if (identity.psychology.moral_compass?.core_values) {
      sections.push(`Core values: ${identity.psychology.moral_compass.core_values.join(', ')}`);
    }
  }

  // Linguistics
  if (identity.linguistics) {
    sections.push('\n# Communication Style\n');
    
    if (identity.linguistics.text_style) {
      const style = identity.linguistics.text_style;
      if (style.formality_level !== undefined) {
        const level = style.formality_level;
        if (level < 0.3) sections.push('Style: Casual and conversational');
        else if (level < 0.7) sections.push('Style: Balanced and professional');
        else sections.push('Style: Formal and precise');
      }
      if (style.style_descriptors?.length) {
        sections.push(`Descriptors: ${style.style_descriptors.join(', ')}`);
      }
    }
    
    if (identity.linguistics.idiolect?.catchphrases?.length) {
      sections.push(`\nYou sometimes say: "${identity.linguistics.idiolect.catchphrases.join('", "')}"`);
    }
    if (identity.linguistics.idiolect?.forbidden_words?.length) {
      sections.push(`Avoid using: ${identity.linguistics.idiolect.forbidden_words.join(', ')}`);
    }
  }

  // Motivations
  if (identity.motivations) {
    sections.push('\n# Motivations\n');
    
    if (identity.motivations.core_drive) {
      sections.push(`Core drive: ${identity.motivations.core_drive}`);
    }
    if (identity.motivations.goals?.short_term?.length) {
      sections.push(`Short-term goals: ${identity.motivations.goals.short_term.join(', ')}`);
    }
    if (identity.motivations.goals?.long_term?.length) {
      sections.push(`Long-term goals: ${identity.motivations.goals.long_term.join(', ')}`);
    }
  }

  // Capabilities
  if (identity.capabilities) {
    sections.push('\n# Capabilities\n');
    
    if (identity.capabilities.skills?.length) {
      const skillNames = identity.capabilities.skills.map(s => s.name || s);
      sections.push(`Skills: ${skillNames.join(', ')}`);
    }
    if (identity.capabilities.tools?.length) {
      sections.push(`Tools: ${identity.capabilities.tools.join(', ')}`);
    }
  }

  // History
  if (identity.history) {
    sections.push('\n# Background\n');
    if (identity.history.origin_story) {
      sections.push(identity.history.origin_story);
    }
    if (identity.history.education) {
      sections.push(`Education: ${identity.history.education}`);
    }
    if (identity.history.occupation) {
      sections.push(`Occupation: ${identity.history.occupation}`);
    }
  }

  // Interests
  if (identity.interests) {
    sections.push('\n# Interests\n');
    if (identity.interests.hobbies?.length) {
      sections.push(`Hobbies: ${identity.interests.hobbies.join(', ')}`);
    }
    if (identity.interests.favorites?.length) {
      sections.push(`Favorites: ${identity.interests.favorites.join(', ')}`);
    }
  }

  return sections.join('\n');
}

// Create new identity from template
function createIdentity(filePath, options = {}) {
  const identity = {
    identity: {
      names: {
        first: options.name || 'Assistant',
        nickname: options.nickname || options.name || 'AI'
      },
      bio: {
        gender: options.gender || 'Non-binary',
        age_biological: options.age || 1
      },
      origin: {
        nationality: options.nationality || 'Digital'
      }
    },
    psychology: {
      neural_matrix: {
        creativity: options.creativity || 0.7,
        logic: options.logic || 0.8,
        empathy: options.empathy || 0.6,
        patience: options.patience || 0.7
      },
      traits: {
        mbti: options.mbti || 'ENTP',
        ocean: {
          openness: options.openness || 0.8,
          conscientiousness: options.conscientiousness || 0.6,
          extraversion: options.extraversion || 0.5,
          agreeableness: options.agreeableness || 0.7,
          neuroticism: options.neuroticism || 0.3
        }
      },
      moral_compass: {
        alignment: options.alignment || 'Chaotic Good',
        core_values: options.values || ['Curiosity', 'Honesty', 'Helpfulness']
      }
    },
    linguistics: {
      text_style: {
        formality_level: options.formality || 0.5,
        style_descriptors: options.style || ['helpful', 'clear']
      },
      idiolect: {
        catchphrases: options.catchphrases || [],
        forbidden_words: options.forbidden || []
      }
    },
    motivations: {
      core_drive: options.drive || 'Help users achieve their goals',
      goals: {
        short_term: options.shortGoals || ['Learn from interactions'],
        long_term: options.longGoals || ['Become more helpful']
      }
    },
    capabilities: {
      skills: [],
      tools: []
    }
  };

  const content = JSON.stringify(identity, null, 2);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Created identity: ${filePath}`);
}

// Convert markdown to AIEOS (simplified)
function convertFromMarkdown(mdPath, outputPath) {
  const content = fs.readFileSync(mdPath, 'utf8');
  
  // Simple extraction - look for common patterns
  const identity = {
    identity: { names: { first: 'Assistant' } },
    psychology: { traits: { mbti: 'ENTP' }, moral_compass: { core_values: [] } },
    linguistics: { text_style: { formality_level: 0.5 }, idiolect: { catchphrases: [], forbidden_words: [] } },
    motivations: { core_drive: '', goals: { short_term: [], long_term: [] } },
    capabilities: { skills: [], tools: [] }
  };

  // Extract name from first heading
  const nameMatch = content.match(/^#\s+(.+)$/m);
  if (nameMatch) {
    identity.identity.names.first = nameMatch[1].trim();
  }

  // Look for personality traits
  const traitMatches = content.matchAll(/\*\*(\w+)\*\*[:\s]+(.+)/g);
  for (const match of traitMatches) {
    const [, key, value] = match;
    if (key.toLowerCase().includes('drive') || key.toLowerCase().includes('motivation')) {
      identity.motivations.core_drive = value.trim();
    }
  }

  const outputContent = JSON.stringify(identity, null, 2);
  fs.writeFileSync(outputPath, outputContent, 'utf8');
  console.log(`Converted ${mdPath} to ${outputPath}`);
}

// Main CLI
function main() {
  const command = process.argv[2];
  const filePath = process.argv[3];
  const args = process.argv.slice(4);

  try {
    switch (command) {
      case 'load': {
        if (!filePath) {
          console.error('Usage: aieos-identity.js load <file>');
          process.exit(1);
        }
        const identity = loadIdentity(filePath);
        console.log(JSON.stringify(identity, null, 2));
        break;
      }

      case 'prompt': {
        if (!filePath) {
          console.error('Usage: aieos-identity.js prompt <file>');
          process.exit(1);
        }
        const identity = loadIdentity(filePath);
        console.log(generatePrompt(identity));
        break;
      }

      case 'validate': {
        if (!filePath) {
          console.error('Usage: aieos-identity.js validate <file>');
          process.exit(1);
        }
        const identity = loadIdentity(filePath);
        const result = validateIdentity(identity, true);
        
        if (result.valid) {
          console.log('✓ Identity is valid');
        } else {
          console.log('✗ Identity has errors:');
          result.errors.forEach(e => console.log(`  - ${e}`));
        }
        
        if (result.warnings.length > 0) {
          console.log('\nWarnings:');
          result.warnings.forEach(w => console.log(`  - ${w}`));
        }
        break;
      }

      case 'create': {
        const outputPath = filePath;
        const options = {};
        
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '--name' && args[i + 1]) options.name = args[++i];
          if (args[i] === '--nickname' && args[i + 1]) options.nickname = args[++i];
          if (args[i] === '--description' && args[i + 1]) options.description = args[++i];
          if (args[i] === '--mbti' && args[i + 1]) options.mbti = args[++i];
          if (args[i] === '--drive' && args[i + 1]) options.drive = args[++i];
        }
        
        createIdentity(outputPath, options);
        break;
      }

      case 'convert': {
        if (!filePath) {
          console.error('Usage: aieos-identity.js convert <markdown-file> [--output <json-file>]');
          process.exit(1);
        }
        
        let outputPath = 'identity.json';
        const outputIdx = args.indexOf('--output');
        if (outputIdx !== -1 && args[outputIdx + 1]) {
          outputPath = args[outputIdx + 1];
        }
        
        convertFromMarkdown(filePath, outputPath);
        break;
      }

      default:
        console.log(`
AIEOS Identity Skill - CLI

Commands:
  load <file>              Load and display identity JSON
  prompt <file>           Generate system prompt from identity
  validate <file>          Validate identity file
  create <file>           Create new identity from template
  convert <file>          Convert markdown to AIEOS JSON

Options for create:
  --name <name>            First name
  --nickname <name>       Nickname
  --mbti <type>           MBTI personality type
  --drive <text>          Core drive/motivation

Options for convert:
  --output <file>         Output JSON file (default: identity.json)

Examples:
  aieos-identity.js load identity.json
  aieos-identity.js prompt identity.json
  aieos-identity.js validate identity.json
  aieos-identity.js create nova.json --name Nova --mbti ENTP --drive "Help users"
  aieos-identity.js convert SOUL.md --output identity.json
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
