#!/usr/bin/env node
/**
 * AIEOS Validator - Validates AIEOS (AI Entity Object Specification) identity files
 * 
 * Usage: node aieos-validator.js <path-to-aieos.json>
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const AIEOS_VERSION = '1.1';

// AIEOS Schema Definition
const AIEOS_SCHEMA = {
  required_top_level: ['aieos_version', 'identity', 'psychology', 'linguistics', 'motivations', 'capabilities'],
  identity: {
    required: ['names', 'bio', 'origin'],
    names: ['first'],
    bio: [],
    origin: []
  },
  psychology: {
    required: ['neural_matrix', 'traits', 'moral_compass'],
    neural_matrix: ['creativity', 'logic', 'emotionality'],
    traits: ['mbti', 'ocean'],
    ocean: ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'],
    moral_compass: ['alignment', 'core_values']
  },
  linguistics: {
    required: ['text_style', 'idiolect'],
    text_style: ['formality_level'],
    idiolect: []
  },
  motivations: {
    required: ['core_drive', 'goals'],
    goals: ['short_term', 'long_term']
  },
  capabilities: {
    required: ['skills', 'tools'],
    skills: [], // array of objects
    tools: []   // array of strings
  }
};

class AIEOSValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validate(data, filepath) {
    this.errors = [];
    this.warnings = [];

    if (!data || typeof data !== 'object') {
      this.errors.push('AIEOS data must be a valid JSON object');
      return this.getResult();
    }

    // Validate version
    this.validateVersion(data.aieos_version);

    // Validate required top-level sections
    this.validateRequiredSections(data, AIEOS_SCHEMA.required_top_level);

    // Validate each section if present
    if (data.identity) this.validateIdentity(data.identity);
    if (data.psychology) this.validatePsychology(data.psychology);
    if (data.linguistics) this.validateLinguistics(data.linguistics);
    if (data.motivations) this.validateMotivations(data.motivations);
    if (data.capabilities) this.validateCapabilities(data.capabilities);
    if (data.physicality) this.validatePhysicality(data.physicality);
    if (data.history) this.validateHistory(data.history);
    if (data.interests) this.validateInterests(data.interests);

    return this.getResult();
  }

  validateVersion(version) {
    if (!version) {
      this.warnings.push(`aieos_version not specified, expected ${AIEOS_VERSION}`);
    } else if (version !== AIEOS_VERSION) {
      this.warnings.push(`aieos_version ${version} may have compatibility issues with validator for ${AIEOS_VERSION}`);
    }
  }

  validateRequiredSections(data, required) {
    for (const section of required) {
      if (!(section in data)) {
        this.errors.push(`Missing required section: ${section}`);
      }
    }
  }

  validateIdentity(identity) {
    const { required } = AIEOS_SCHEMA.identity;
    for (const field of required) {
      if (!(field in identity)) {
        this.errors.push(`identity.${field} is required`);
      }
    }

    if (identity.names && !identity.names.first) {
      this.errors.push('identity.names.first is required');
    }

    // Validate neural_matrix values are between 0-1
    if (identity.neural_matrix) {
      Object.entries(identity.neural_matrix).forEach(([key, val]) => {
        if (typeof val === 'number' && (val < 0 || val > 1)) {
          this.warnings.push(`identity.neural_matrix.${key} should be between 0.0 and 1.0`);
        }
      });
    }
  }

  validatePsychology(psychology) {
    const { required, neural_matrix, traits, ocean, moral_compass } = AIEOS_SCHEMA.psychology;
    
    for (const field of required) {
      if (!(field in psychology)) {
        this.errors.push(`psychology.${field} is required`);
      }
    }

    // Validate neural_matrix
    if (psychology.neural_matrix) {
      for (const field of neural_matrix) {
        if (!(field in psychology.neural_matrix)) {
          this.warnings.push(`psychology.neural_matrix.${field} is recommended`);
        }
      }
      // Check ranges
      Object.entries(psychology.neural_matrix).forEach(([key, val]) => {
        if (typeof val === 'number' && (val < 0 || val > 1)) {
          this.warnings.push(`psychology.neural_matrix.${key} should be between 0.0 and 1.0`);
        }
      });
    }

    // Validate traits
    if (psychology.traits) {
      if (!psychology.traits.mbti) {
        this.warnings.push('psychology.traits.mbti is recommended');
      }
      if (psychology.traits.ocean) {
        for (const field of ocean) {
          if (!(field in psychology.traits.ocean)) {
            this.warnings.push(`psychology.traits.ocean.${field} is recommended`);
          }
        }
        // Check ranges
        Object.entries(psychology.traits.ocean).forEach(([key, val]) => {
          if (typeof val === 'number' && (val < 0 || val > 1)) {
            this.warnings.push(`psychology.traits.ocean.${key} should be between 0.0 and 1.0`);
          }
        });
      }
    }

    // Validate moral_compass
    if (psychology.moral_compass) {
      if (!psychology.moral_compass.alignment) {
        this.warnings.push('psychology.moral_compass.alignment is recommended');
      }
      if (!Array.isArray(psychology.moral_compass.core_values)) {
        this.errors.push('psychology.moral_compass.core_values must be an array');
      }
    }
  }

  validateLinguistics(linguistics) {
    const { required } = AIEOS_SCHEMA.linguistics;
    
    for (const field of required) {
      if (!(field in linguistics)) {
        this.errors.push(`linguistics.${field} is required`);
      }
    }

    if (linguistics.text_style) {
      const fl = linguistics.text_style.formality_level;
      if (typeof fl === 'number' && (fl < 0 || fl > 1)) {
        this.warnings.push('linguistics.text_style.formality_level should be between 0.0 and 1.0');
      }
    }
  }

  validateMotivations(motivations) {
    const { required } = AIEOS_SCHEMA.motivations;
    
    for (const field of required) {
      if (!(field in motivations)) {
        this.errors.push(`motivations.${field} is required`);
      }
    }

    if (motivations.goals) {
      if (!Array.isArray(motivations.goals.short_term)) {
        this.warnings.push('motivations.goals.short_term should be an array');
      }
      if (!Array.isArray(motivations.goals.long_term)) {
        this.warnings.push('motivations.goals.long_term should be an array');
      }
    }
  }

  validateCapabilities(capabilities) {
    const { required } = AIEOS_SCHEMA.capabilities;
    
    for (const field of required) {
      if (!(field in capabilities)) {
        this.errors.push(`capabilities.${field} is required`);
      }
    }

    if (!Array.isArray(capabilities.skills)) {
      this.errors.push('capabilities.skills must be an array');
    } else {
      capabilities.skills.forEach((skill, idx) => {
        if (!skill.name) {
          this.errors.push(`capabilities.skills[${idx}] must have a name`);
        }
      });
    }

    if (!Array.isArray(capabilities.tools)) {
      this.errors.push('capabilities.tools must be an array');
    }
  }

  validatePhysicality(physicality) {
    // Optional section - no required fields
  }

  validateHistory(history) {
    // Optional section - no required fields
  }

  validateInterests(interests) {
    // Optional section - no required fields
  }

  getResult() {
    const isValid = this.errors.length === 0;
    return {
      valid: isValid,
      errors: this.errors,
      warnings: this.warnings,
      summary: isValid 
        ? `✓ Valid AIEOS document (${this.warnings.length} warnings)`
        : `✗ Invalid AIEOS document (${this.errors.length} errors, ${this.warnings.length} warnings)`
    };
  }
}

// Main execution
function main() {
  const filepath = process.argv[2];
  
  if (!filepath) {
    console.error('Usage: node aieos-validator.js <path-to-aieos.json>');
    process.exit(1);
  }

  const fullPath = resolve(filepath);
  
  if (!existsSync(fullPath)) {
    console.error(`Error: File not found: ${fullPath}`);
    process.exit(1);
  }

  try {
    const content = readFileSync(fullPath, 'utf-8');
    const data = JSON.parse(content);
    
    const validator = new AIEOSValidator();
    const result = validator.validate(data, fullPath);
    
    console.log(result.summary);
    
    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(warn => console.log(`  - ${warn}`));
    }
    
    process.exit(result.valid ? 0 : 1);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
