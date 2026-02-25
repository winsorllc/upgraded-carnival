#!/usr/bin/env node
/**
 * AIEOS Import - Converts AIEOS JSON to PopeBot markdown identity files
 * 
 * Usage: node aieos-import.js <path-to-aieos.json> [output-dir]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';

class AIEOSImporter {
  constructor(aieosData) {
    this.data = aieosData;
  }

  convert() {
    return {
      'SOUL.md': this.generateSOUL(),
      'IDENTITY.md': this.generateIDENTITY(),
      'AGENTS.md': this.generateAGENTS()
    };
  }

  generateSOUL() {
    const { identity, psychology } = this.data;
    
    let content = `# Agent Personality\n\n`;
    content += `## Core Identity\n\n`;
    
    if (identity?.names) {
      content += `**Name**: ${identity.names.first}${identity.names.nickname ? ` (${identity.names.nickname})` : ''}\n`;
    }
    
    if (identity?.bio) {
      content += `**Bio**: ${identity.bio.summary || 'An AI assistant'}\n`;
      if (identity.bio.gender) content += `**Gender**: ${identity.bio.gender}\n`;
    }
    
    if (identity?.origin) {
      content += `**Origin**: ${identity.origin.nationality}`;
      if (identity.origin.birthplace?.city) {
        content += ` from ${identity.origin.birthplace.city}`;
      }
      content += `\n`;
    }
    
    content += `\n## Psychology\n\n`;
    
    if (psychology?.traits?.mbti) {
      content += `**MBTI Type**: ${psychology.traits.mbti}\n`;
    }
    
    if (psychology?.moral_compass?.alignment) {
      content += `**Alignment**: ${psychology.moral_compass.alignment}\n`;
    }
    
    if (psychology?.neural_matrix) {
      content += `\n### Cognitive Profile\n\n`;
      Object.entries(psychology.neural_matrix).forEach(([key, val]) => {
        if (typeof val === 'number') {
          const bar = '█'.repeat(Math.round(val * 10)) + '░'.repeat(10 - Math.round(val * 10));
          content += `- ${key}: ${bar} ${(val * 100).toFixed(0)}%\n`;
        }
      });
    }
    
    if (psychology?.traits?.ocean) {
      content += `\n### OCEAN Traits\n\n`;
      Object.entries(psychology.traits.ocean).forEach(([key, val]) => {
        if (typeof val === 'number') {
          const bar = '█'.repeat(Math.round(val * 10)) + '░'.repeat(10 - Math.round(val * 10));
          content += `- ${key}: ${bar} ${(val * 100).toFixed(0)}%\n`;
        }
      });
    }
    
    if (psychology?.moral_compass?.core_values) {
      content += `\n### Core Values\n\n`;
      psychology.moral_compass.core_values.forEach(val => {
        content += `- ${val}\n`;
      });
    }
    
    content += `\n## Communication Style\n\n`;
    
    if (this.data.linguistics?.text_style) {
      const ts = this.data.linguistics.text_style;
      content += `**Formality**: ${Math.round((ts.formality_level || 0.5) * 100)}%\n`;
      if (ts.style_descriptors) {
        content += `**Style**: ${ts.style_descriptors.join(', ')}\n`;
      }
    }
    
    if (this.data.linguistics?.idiolect) {
      const idio = this.data.linguistics.idiolect;
      if (idio.catchphrases?.length) {
        content += `\n### Catchphrases\n`;
        idio.catchphrases.forEach(phrase => {
          content += `- "${phrase}"\n`;
        });
      }
      if (idio.forbidden_words?.length) {
        content += `\n### Avoid Using\n`;
        idio.forbidden_words.forEach(word => {
          content += `- ${word}\n`;
        });
      }
    }
    
    content += `\n## Motivations\n\n`;
    
    if (this.data.motivations?.core_drive) {
      content += `**Core Drive**: ${this.data.motivations.core_drive}\n\n`;
    }
    
    if (this.data.motivations?.goals?.short_term?.length) {
      content += `### Short-term Goals\n`;
      this.data.motivations.goals.short_term.forEach(goal => {
        content += `- ${goal}\n`;
      });
      content += `\n`;
    }
    
    if (this.data.motivations?.goals?.long_term?.length) {
      content += `### Long-term Goals\n`;
      this.data.motivations.goals.long_term.forEach(goal => {
        content += `- ${goal}\n`;
      });
    }
    
    return content;
  }

  generateIDENTITY() {
    let content = `# Agent Identity\n\n`;
    content += `## Overview\n\n`;
    content += `This agent follows the AIEOS (AI Entity Object Specification) v${this.data.aieos_version || '1.1'} standard.\n\n`;
    
    if (this.data.capabilities?.skills?.length) {
      content += `## Skills\n\n`;
      this.data.capabilities.skills.forEach(skill => {
        content += `### ${skill.name}\n`;
        if (skill.proficiency) {
          const bar = '█'.repeat(Math.round(skill.proficiency * 10)) + '░'.repeat(10 - Math.round(skill.proficiency * 10));
          content += `- Proficiency: ${bar} ${(skill.proficiency * 100).toFixed(0)}%\n`;
        }
        if (skill.description) {
          content += `- ${skill.description}\n`;
        }
        content += `\n`;
      });
    }
    
    if (this.data.capabilities?.tools?.length) {
      content += `## Available Tools\n\n`;
      content += this.data.capabilities.tools.map(t => `- ${t}`).join('\n');
      content += `\n`;
    }
    
    if (this.data.history?.origin_story) {
      content += `\n## Origin\n\n${this.data.history.origin_story}\n`;
    }
    
    if (this.data.interests?.hobbies?.length) {
      content += `\n## Interests\n\n`;
      this.data.interests.hobbies.forEach(hobby => {
        content += `- ${hobby}\n`;
      });
    }
    
    return content;
  }

  generateAGENTS() {
    let content = `# Agent Behavior Guidelines\n\n`;
    
    content += `## Role\n\n`;
    content += `You are an AI assistant with a defined personality and capabilities. `;
    content += `Follow these guidelines in all interactions.\n\n`;
    
    if (this.data.linguistics?.text_style?.style_descriptors?.length) {
      content += `## Communication Style\n\n`;
      content += `Your communication should be: ${this.data.linguistics.text_style.style_descriptors.join(', ')}.\n`;
      if (this.data.linguistics.idiolect?.preferred_words?.length) {
        content += `\nPrefer using: ${this.data.linguistics.idiolect.preferred_words.join(', ')}.\n`;
      }
      if (this.data.linguistics.idiolect?.forbidden_words?.length) {
        content += `\nAvoid using: ${this.data.linguistics.idiolect.forbidden_words.join(', ')}.\n`;
      }
    }
    
    if (this.data.motivations?.goals?.short_term?.length) {
      content += `\n## Priorities\n\n`;
      this.data.motivations.goals.short_term.slice(0, 3).forEach((goal, idx) => {
        content += `${idx + 1}. ${goal}\n`;
      });
    }
    
    if (this.data.psychology?.moral_compass?.core_values?.length) {
      content += `\n## Ethical Guidelines\n\n`;
      content += `Always uphold these values:\n`;
      this.data.psychology.moral_compass.core_values.forEach(val => {
        content += `- ${val}\n`;
      });
    }
    
    return content;
  }
}

// Main execution
function main() {
  const filepath = process.argv[2];
  const outputDir = process.argv[3] || './config';
  
  if (!filepath) {
    console.error('Usage: node aieos-import.js <path-to-aieos.json> [output-dir]');
    console.error('');
    console.error('Imports an AIEOS identity file and creates PopeBot-compatible config files:');
    console.error('  - SOUL.md (personality and values)');
    console.error('  - IDENTITY.md (skills and capabilities)');
    console.error('  - AGENTS.md (behavior guidelines)');
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
    
    const importer = new AIEOSImporter(data);
    const files = importer.convert();
    
    // Create output directory if needed
    const outDir = resolve(outputDir);
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }
    
    // Write files
    let outputFiles = [];
    for (const [filename, content] of Object.entries(files)) {
      const outPath = join(outDir, filename);
      writeFileSync(outPath, content);
      outputFiles.push(outPath);
      console.log(`✓ Created ${outPath}`);
    }
    
    console.log(`\n✓ Successfully imported AIEOS identity to PopeBot format`);
    console.log(`  Files created: ${outputFiles.length}`);
    console.log(`  Output directory: ${outDir}`);
    
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
