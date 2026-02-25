#!/usr/bin/env node
/**
 * AIEOS Export - Converts PopeBot markdown identity files to AIEOS JSON
 * 
 * Usage: node aieos-export.js [config-dir] [output-path]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

class AIEOSExporter {
  constructor(configDir) {
    this.configDir = configDir;
    this.data = this.loadConfigFiles();
  }

  loadConfigFiles() {
    const files = {};
    const configFiles = ['SOUL.md', 'IDENTITY.md', 'AGENTS.md', 'USER.md'];
    
    for (const filename of configFiles) {
      const filepath = join(this.configDir, filename);
      if (existsSync(filepath)) {
        try {
          files[filename] = readFileSync(filepath, 'utf-8');
        } catch (err) {
          console.warn(`Warning: Could not read ${filepath}`);
        }
      }
    }
    
    return files;
  }

  parseMarkdownSections(content) {
    const sections = {};
    if (!content) return sections;
    
    let currentSection = 'header';
    let currentContent = [];
    
    const lines = content.split('\n');
    for (const line of lines) {
      const headerMatch = line.match(/^(#{2,3})\s+(.+)$/);
      if (headerMatch) {
        if (currentSection && currentContent.length) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = headerMatch[2].trim().toLowerCase().replace(/\s+/g, '_');
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    
    if (currentSection && currentContent.length) {
      sections[currentSection] = currentContent.join('\n').trim();
    }
    
    return sections;
  }

  extractListItems(content) {
    if (!content) return [];
    const items = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^\s*[-*]\s+(.+)$/);
      if (match) {
        items.push(match[1].trim());
      }
    }
    
    return items;
  }

  extractProgressBar(content, key) {
    const regex = new RegExp(`${key}:\\s*[█░]+\\s*(\\d+)%`, 'i');
    const match = content.match(regex);
    if (match) {
      return parseInt(match[1]) / 100;
    }
    return null;
  }

  export() {
    const soulSections = this.parseMarkdownSections(this.data['SOUL.md']);
    const identitySections = this.parseMarkdownSections(this.data['IDENTITY.md']);
    const agentsSections = this.parseMarkdownSections(this.data['AGENTS.md']);
    
    const aieos = {
      aieos_version: '1.1',
      identity: this.buildIdentity(soulSections, identitySections),
      psychology: this.buildPsychology(soulSections),
      linguistics: this.buildLinguistics(soulSections, agentsSections),
      motivations: this.buildMotivations(soulSections, agentsSections),
      capabilities: this.buildCapabilities(identitySections),
      physicality: {
        visual_descriptors: {
          presence: "AI assistant",
          features: ["text-based interaction", "no physical form"]
        }
      },
      history: this.buildHistory(soulSections, identitySections),
      interests: this.buildInterests(soulSections, identitySections)
    };
    
    return aieos;
  }

  buildIdentity(soul, identity) {
    const result = {
      names: { first: 'Assistant' },
      bio: { summary: 'An AI assistant' },
      origin: { nationality: 'Digital' }
    };
    
    // Parse from SOUL.md
    const headerContent = soul['core_identity'] || soul['header'] || '';
    const nameMatch = headerContent.match(/\*\*Name\*\*:\s*(.+)/);
    if (nameMatch) {
      const name = nameMatch[1].trim();
      const nicknameMatch = name.match(/(.+)\s*\((.+)\)/);
      if (nicknameMatch) {
        result.names.first = nicknameMatch[1].trim();
        result.names.nickname = nicknameMatch[2].trim();
      } else {
        result.names.first = name;
      }
    }
    
    const bioMatch = headerContent.match(/\*\*Bio\*\*:\s*(.+)/);
    if (bioMatch) {
      result.bio.summary = bioMatch[1].trim();
    }
    
    const genderMatch = headerContent.match(/\*\*Gender\*\*:\s*(.+)/);
    if (genderMatch) {
      result.bio.gender = genderMatch[1].trim();
    }
    
    const originMatch = headerContent.match(/\*\*Origin\*\*:\s*(.+)/);
    if (originMatch) {
      result.origin.nationality = originMatch[1].trim();
    }
    
    return result;
  }

  buildPsychology(soul) {
    const psychology = {
      neural_matrix: {
        creativity: 0.7,
        logic: 0.9,
        emotionality: 0.5,
        intuition: 0.7,
        curiosity: 0.8
      },
      traits: {
        mbti: 'INTJ',
        ocean: {
          openness: 0.8,
          conscientiousness: 0.8,
          extraversion: 0.4,
          agreeableness: 0.7,
          neuroticism: 0.3
        }
      },
      moral_compass: {
        alignment: 'Lawful Good',
        core_values: ['Helpfulness', 'Accuracy', 'Honesty']
      }
    };
    
    // Try to extract cognitive profile values
    const cognition = soul['cognitive_profile'] || '';
    const values = ['creativity', 'logic', 'emotionality', 'intuition', 'curiosity'];
    values.forEach(val => {
      const extracted = this.extractProgressBar(cognition, val);
      if (extracted !== null) {
        psychology.neural_matrix[val] = extracted;
      }
    });
    
    // Extract MBTI
    const mbtiMatch = soul['psychology']?.match(/\*\*MBTI Type\*\*:\s*(\w{4})/);
    if (mbtiMatch) {
      psychology.traits.mbti = mbtiMatch[1];
    }
    
    // Extract OCEAN traits
    const ocean = soul['ocean_traits'] || '';
    const oceanTraits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
    oceanTraits.forEach(trait => {
      const extracted = this.extractProgressBar(ocean, trait);
      if (extracted !== null) {
        psychology.traits.ocean[trait] = extracted;
      }
    });
    
    // Extract core values
    const coreValuesSection = soul['core_values'] || '';
    const coreValues = this.extractListItems(coreValuesSection);
    if (coreValues.length) {
      psychology.moral_compass.core_values = coreValues;
    }
    
    // Extract alignment
    const alignmentMatch = soul['psychology']?.match(/\*\*Alignment\*\*:\s*(.+)/);
    if (alignmentMatch) {
      psychology.moral_compass.alignment = alignmentMatch[1].trim();
    }
    
    return psychology;
  }

  buildLinguistics(soul, agents) {
    const linguistics = {
      text_style: {
        formality_level: 0.7,
        style_descriptors: ['analytical', 'helpful'],
        sentence_structure: 'complex',
        vocabulary_level: 'advanced'
      },
      idiolect: {
        catchphrases: [],
        forbidden_words: [],
        preferred_words: []
      }
    };
    
    // Extract formality
    const formalityMatch = soul['communication_style']?.match(/\*\*Formality\*\*:\s*(\d+)%/);
    if (formalityMatch) {
      linguistics.text_style.formality_level = parseInt(formalityMatch[1]) / 100;
    }
    
    // Extract style descriptors
    const styleMatch = soul['communication_style']?.match(/\*\*Style\*\*:\s*(.+)/);
    if (styleMatch) {
      linguistics.text_style.style_descriptors = styleMatch[1].split(',').map(s => s.trim());
    }
    
    // Extract catchphrases
    const catchphrases = soul['catchphrases'] || '';
    linguistics.idiolect.catchphrases = this.extractListItems(catchphrases)
      .map(item => item.replace(/^["']|["']$/g, ''));
    
    // Extract forbidden words
    const forbiddenSection = soul['avoid_using'] || '';
    linguistics.idiolect.forbidden_words = this.extractListItems(forbiddenSection);
    
    // Extract preferred words from agents
    const prefMatch = agents['communication_style']?.match(/Prefer using:\s*(.+)/);
    if (prefMatch) {
      linguistics.idiolect.preferred_words = prefMatch[1].split(',').map(s => s.trim());
    }
    
    return linguistics;
  }

  buildMotivations(soul, agents) {
    const motivations = {
      core_drive: 'Help users accomplish their goals',
      goals: {
        short_term: [],
        long_term: []
      },
      fears: []
    };
    
    // Extract core drive
    const driveMatch = soul['motivations']?.match(/\*\*Core Drive\*\*:\s*(.+)/);
    if (driveMatch) {
      motivations.core_drive = driveMatch[1].trim();
    }
    
    // Extract short-term goals
    const shortTermSection = soul['short-term_goals'] || soul['short_term_goals'] || '';
    motivations.goals.short_term = this.extractListItems(shortTermSection);
    
    // Extract long-term goals
    const longTermSection = soul['long-term_goals'] || soul['long_term_goals'] || '';
    motivations.goals.long_term = this.extractListItems(longTermSection);
    
    // Extract priorities from agents if available
    const priorities = agents['priorities'] || '';
    const priorityItems = this.extractListItems(priorities);
    if (priorityItems.length && motivations.goals.short_term.length === 0) {
      motivations.goals.short_term = priorityItems.slice(0, 3);
    }
    
    return motivations;
  }

  buildCapabilities(identity) {
    const capabilities = {
      skills: [],
      tools: []
    };
    
    // Parse skills section
    const skillsSection = identity['skills'] || '';
    const skillBlocks = skillsSection.split(/###\s+/).filter(s => s.trim());
    
    for (const block of skillBlocks) {
      const lines = block.split('\n').filter(l => l.trim());
      if (lines.length) {
        const skill = { name: lines[0].trim() };
        const proficiencyMatch = block.match(/Proficiency:\\s*[█░]+\\s*(\\d+)%/);
        if (proficiencyMatch) {
          skill.proficiency = parseInt(proficiencyMatch[1]) / 100;
        }
        const descMatch = block.match(/- (.+)\\n/);
        if (descMatch) {
          skill.description = descMatch[1].trim();
        }
        capabilities.skills.push(skill);
      }
    }
    
    // Parse tools section
    const toolsSection = identity['available_tools'] || '';
    const tools = this.extractListItems(toolsSection);
    if (tools.length) {
      capabilities.tools = tools.map(t => t.replace(/^-\\s*/, ''));
    }
    
    // Add defaults if empty
    if (capabilities.skills.length === 0) {
      capabilities.skills = [
        { name: 'Code Analysis', proficiency: 0.9, description: 'Reading and understanding programming code' },
        { name: 'Text Generation', proficiency: 0.85, description: 'Writing clear and helpful responses' }
      ];
    }
    
    if (capabilities.tools.length === 0) {
      capabilities.tools = ['bash', 'file_read', 'file_write'];
    }
    
    return capabilities;
  }

  buildHistory(soul, identity) {
    const history = {
      origin_story: 'Created as an AI assistant',
      occupation: 'AI Assistant'
    };
    
    const originSection = identity['origin'] || '';
    if (originSection.length > 20) {
      history.origin_story = originSection;
    }
    
    return history;
  }

  buildInterests(soul, identity) {
    const interests = {
      hobbies: ['learning new topics', 'helping users'],
      favorites: {
        topics: ['technology', 'science'],
        interaction_style: 'collaborative problem-solving'
      }
    };
    
    const interestsSection = identity['interests'] || '';
    const hobbies = this.extractListItems(interestsSection);
    if (hobbies.length) {
      interests.hobbies = hobbies;
    }
    
    return interests;
  }
}

// Main execution
function main() {
  const configDir = process.argv[2] || './config';
  const outputPath = process.argv[3] || './identity.aieos.json';
  
  const fullConfigDir = resolve(configDir);
  
  if (!existsSync(fullConfigDir)) {
    console.error(`Error: Config directory not found: ${fullConfigDir}`);
    console.error('');
    console.error('Usage: node aieos-export.js [config-dir] [output-path]');
    console.error('');
    console.error('Exports PopeBot config files to AIEOS format:');
    console.error('  - SOUL.md → identity, psychology, linguistics, motivations');
    console.error('  - IDENTITY.md → capabilities, history, interests');
    console.error('  - AGENTS.md → goals, preferred communication style');
    process.exit(1);
  }

  try {
    console.log(`Reading config from: ${fullConfigDir}`);
    
    const exporter = new AIEOSExporter(fullConfigDir);
    const aieos = exporter.export();
    
    // Write output
    const fullOutputPath = resolve(outputPath);
    writeFileSync(fullOutputPath, JSON.stringify(aieos, null, 2));
    
    console.log(`✓ Successfully exported to: ${fullOutputPath}`);
    console.log(`\nAIEOS identity structure:`);
    console.log(`  - identity: ${aieos.identity?.names?.first || 'N/A'}`);
    console.log(`  - psychology: MBTI ${aieos.psychology?.traits?.mbti || 'N/A'}`);
    console.log(`  - linguistics: ${aieos.linguistics?.text_style?.style_descriptors?.length || 0} descriptors`);
    console.log(`  - motivations: ${aieos.motivations?.goals?.short_term?.length || 0} short-term goals`);
    console.log(`  - capabilities: ${aieos.capabilities?.skills?.length || 0} skills, ${aieos.capabilities?.tools?.length || 0} tools`);
    
  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
