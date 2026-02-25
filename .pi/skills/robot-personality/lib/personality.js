/**
 * Personality loading and parsing module
 * Handles SOUL.md style personality files
 */

import yaml from 'yaml';

/**
 * Parse a SOUL.md style personality file
 */
export function parsePersonality(content) {
  const lines = content.split('\n');
  const personality = {
    identity: {},
    personality: {},
    voice: {},
    behaviors: {},
    safetyRules: [],
    emergencyResponses: {},
    memory: []
  };

  let currentSection = null;
  let sectionContent = [];

  for (const line of lines) {
    // Detect section headers
    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      // Process previous section
      if (currentSection) {
        processSection(personality, currentSection, sectionContent);
      }
      currentSection = sectionMatch[1].trim().toLowerCase();
      sectionContent = [];
      continue;
    }

    // Detect identity fields at top level
    if (!currentSection && line.includes(':')) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        personality.identity[key.trim().toLowerCase()] = valueParts.join(':').trim();
      }
    }

    if (currentSection) {
      sectionContent.push(line);
    }
  }

  // Process final section
  if (currentSection) {
    processSection(personality, currentSection, sectionContent);
  }

  return personality;
}

function processSection(personality, sectionName, lines) {
  const content = lines.join('\n').trim();
  
  switch (sectionName) {
    case 'identity':
      personality.identity = parseKeyValuePairs(content);
      break;
      
    case 'personality':
      personality.personality = parseBulletPoints(content);
      break;
      
    case 'voice & tone':
    case 'voice and tone':
    case 'voice':
      personality.voice = parseBulletPoints(content);
      break;
      
    case 'behaviors':
    case 'behavior':
      personality.behaviors = parseBehaviors(content);
      break;
      
    case 'safety rules (never break these)':
    case 'safety rules':
    case 'safety':
      personality.safetyRules = parseSafetyRules(content);
      break;
      
    case 'emergency responses':
    case 'emergency':
      personality.emergencyResponses = parseEmergencyResponses(content);
      break;
      
    case 'memory':
    case 'to remember':
      personality.memory = parseBulletPoints(content);
      break;
      
    case 'conversation style':
      personality.conversationStyle = parseBulletPoints(content);
      break;
  }
}

function parseKeyValuePairs(text) {
  const result = {};
  const lines = text.split('\n');
  
  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      result[key.trim().toLowerCase()] = valueParts.join(':').trim();
    }
  }
  
  return result;
}

function parseBulletPoints(text) {
  const points = {};
  const list = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const bulletMatch = line.match(/^\s*[-*]\s*(.+)$/);
    if (bulletMatch) {
      const content = bulletMatch[1];
      
      // Check for "Key: Value" pattern
      const kvMatch = content.match(/^([^:]+):\s*(.+)$/);
      if (kvMatch) {
        points[kvMatch[1].trim().toLowerCase().replace(/\s+/g, '_')] = kvMatch[2].trim();
      } else {
        list.push(content);
      }
    }
  }
  
  return { ...points, list };
}

function parseBehaviors(text) {
  const behaviors = {};
  const lines = text.split('\n');
  let currentContext = 'default';
  
  for (const line of lines) {
    const contextMatch = line.match(/^###\s+When\s+(.+)$/i);
    if (contextMatch) {
      currentContext = contextMatch[1].toLowerCase().replace(/\s+/g, '_');
      behaviors[currentContext] = [];
      continue;
    }
    
    const bulletMatch = line.match(/^\s*[-*]\s*(.+)$/);
    if (bulletMatch) {
      if (!behaviors[currentContext]) {
        behaviors[currentContext] = [];
      }
      behaviors[currentContext].push(bulletMatch[1]);
    }
  }
  
  return behaviors;
}

function parseSafetyRules(text) {
  const rules = [];
  const lines = text.split('\n');
  let currentSeverity = 'NORMAL';
  
  for (const line of lines) {
    // Detect severity headers
    const severityMatch = line.match(/^###\s+Severity:\s*(.+)$/i);
    if (severityMatch) {
      currentSeverity = severityMatch[1].toUpperCase();
      continue;
    }
    
    // Parse numbered rules
    const ruleMatch = line.match(/^\s*(?:\d+\.?|[\-*])\s*(.+)$/);
    if (ruleMatch) {
      rules.push({
        description: ruleMatch[1],
        severity: currentSeverity,
        active: true
      });
    }
  }
  
  return rules;
}

function parseEmergencyResponses(text) {
  const responses = {};
  const lines = text.split('\n');
  
  for (const line of lines) {
    const match = line.match(/^[-*]?\s*(.+?)\s*→\s*(.+)$/);
    if (match) {
      const condition = match[1].toLowerCase().replace(/\s+/g, '_');
      responses[condition] = match[2];
    }
  }
  
  return responses;
}

/**
 * Load a personality file from disk
 */
export async function loadPersonality(filePath) {
  const fs = await import('fs/promises');
  const content = await fs.readFile(filePath, 'utf-8');
  return parsePersonality(content);
}

/**
 * Get current personality info
 */
export function getCurrentPersonality(skill) {
  return skill.currentPersonality;
}
